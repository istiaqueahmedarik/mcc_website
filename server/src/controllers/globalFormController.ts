import { streamSSE } from "hono/streaming";
import sql from "../db";
import { normalizeFullNameUpdate } from "../utils/basicProfile";
import { markPreEnrollmentClaimsForUser } from "../utils/classroomPreEnrollment";
import {
  GlobalFormField,
  normalizeMistId,
  normalizeSlug,
  profileVersion,
  validateFormDefinition,
  validateSubmission,
} from "../services/globalFormService";

type Ctx = any;
const PAGE_SIZE = 50;

function payload(c: Ctx) {
  return c.get("jwtPayload") || {};
}

async function currentUser(c: Ctx, executor: any = sql, lock = false) {
  const { id, email } = payload(c);
  if (!id || !email) return null;
  const rows = lock
    ? await executor`
        select id, email, full_name, mist_id, cf_id, cf_verified, vjudge_id, vjudge_verified,
          phone, batch_name, tshirt_size, codechef_id, atcoder_id, admin, trainer, granted,
          is_pre_enrolled, account_review_origin
        from users where id = ${id} and email = ${email} limit 1 for update
      `
    : await executor`
        select id, email, full_name, mist_id, cf_id, cf_verified, vjudge_id, vjudge_verified,
          phone, batch_name, tshirt_size, codechef_id, atcoder_id, admin, trainer, granted,
          is_pre_enrolled, account_review_origin
        from users where id = ${id} and email = ${email} limit 1
      `;
  return rows[0] || null;
}

async function requireAdmin(c: Ctx, executor: any = sql) {
  const user = await currentUser(c, executor);
  return user?.admin === true ? user : null;
}

async function requireStudent(c: Ctx, executor: any = sql, lock = false) {
  const user = await currentUser(c, executor, lock);
  if (!user || user.admin || user.trainer || user.is_pre_enrolled) return null;
  if (!user.granted && user.account_review_origin !== "profile_change") return null;
  return user;
}

function campaignShape(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    status: row.status,
    kind: row.kind,
    fields: row.fields || [],
    agreement_text: row.agreement_text || "",
    template_id: row.template_id,
    revision: Number(row.revision || 0),
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
  };
}

function templateShape(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    fields: row.fields || [],
    agreement_text: row.agreement_text || "",
    built_in: Boolean(row.built_in),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function receiptShape(row: any) {
  return {
    id: row.receipt_id,
    campaign_id: row.campaign_id,
    submitted_at: row.submitted_at,
    pending_verification: Boolean(row.pending_verification),
  };
}

function hasPendingVerification(fields: GlobalFormField[], user: any, pendingProfileReview = false) {
  return pendingProfileReview || fields.some((field) =>
    field.required && (
      (field.mapUserField === "cf_id" && !user.cf_verified) ||
      (field.mapUserField === "vjudge_id" && !user.vjudge_verified)
    ),
  );
}

export async function listTemplates(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const rows = await sql`select * from global_form_templates order by built_in desc, updated_at desc`;
  return c.json({ templates: rows.map(templateShape) });
}

export async function createTemplate(c: Ctx) {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required" }, 403);
  const validation = validateFormDefinition(await c.req.json());
  if (!validation.ok) return c.json({ error: validation.error }, 400);
  const definition = validation.value;
  const rows = await sql`
    insert into global_form_templates (title, description, kind, fields, agreement_text, created_by)
    values (${definition.title}, ${definition.description}, ${definition.kind}, ${sql.json(definition.fields as any)}, ${definition.agreement_text}, ${admin.id})
    returning *
  `;
  return c.json({ template: templateShape(rows[0]) }, 201);
}

export async function updateTemplate(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const validation = validateFormDefinition(await c.req.json());
  if (!validation.ok) return c.json({ error: validation.error }, 400);
  const definition = validation.value;
  const rows = await sql`
    update global_form_templates set title = ${definition.title}, description = ${definition.description},
      kind = ${definition.kind}, fields = ${sql.json(definition.fields as any)}, agreement_text = ${definition.agreement_text}, updated_at = now()
    where id = ${c.req.param("id")} and built_in = false returning *
  `;
  if (!rows[0]) return c.json({ error: "Template not found" }, 404);
  return c.json({ template: templateShape(rows[0]) });
}

export async function deleteTemplate(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  // Campaigns retain frozen questions and responses; their template FK becomes null.
  const rows = await sql`
    delete from global_form_templates where id = ${c.req.param("id")} and built_in = false returning id
  `;
  if (!rows[0]) return c.json({ error: "Editable template not found. Built-in starters cannot be deleted." }, 404);
  return c.json({ success: true });
}

export async function cloneTemplate(c: Ctx) {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required" }, 403);
  const rows = await sql`
    insert into global_form_templates (title, description, kind, fields, agreement_text, created_by)
    select left(title || ' Copy', 160), description, kind, fields, agreement_text, ${admin.id}
    from global_form_templates where id = ${c.req.param("id")} returning *
  `;
  if (!rows[0]) return c.json({ error: "Template not found" }, 404);
  return c.json({ template: templateShape(rows[0]) }, 201);
}

export async function listCampaigns(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const rows = await sql`select * from global_form_campaigns order by created_at desc`;
  return c.json({ campaigns: rows.map(campaignShape) });
}

export async function createCampaign(c: Ctx) {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required" }, 403);
  const body = await c.req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
  const generatedSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'campaign'}-${crypto.randomUUID().slice(0, 8)}`;
  const slug = normalizeSlug(body.slug === undefined ? generatedSlug : body.slug);
  if (!title || !slug || typeof body.template_id !== "string") return c.json({ error: "Title, template, and a valid slug are required" }, 400);
  try {
    const rows = await sql`
      insert into global_form_campaigns (template_id, title, description, slug, kind, fields, agreement_text, created_by)
      select id, ${title}, ${description}, ${slug}, kind, fields, agreement_text, ${admin.id}
      from global_form_templates where id = ${body.template_id} returning *
    `;
    if (!rows[0]) return c.json({ error: "Template not found" }, 404);
    return c.json({ campaign: campaignShape(rows[0]) }, 201);
  } catch (error: any) {
    if (error?.code === "23505") return c.json({ error: "Campaign slug already exists" }, 409);
    throw error;
  }
}

export async function getCampaign(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const rows = await sql`select * from global_form_campaigns where id = ${c.req.param("id")} limit 1`;
  if (!rows[0]) return c.json({ error: "Campaign not found" }, 404);
  return c.json({ campaign: campaignShape(rows[0]) });
}

export async function cloneCampaign(c: Ctx) {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: 'Admin access required' }, 403);
  const slug = `campaign-${crypto.randomUUID()}`;
  const rows = await sql`
    insert into global_form_campaigns(template_id,title,description,slug,kind,fields,agreement_text,created_by)
    select template_id,left(title || ' Copy',160),description,${slug},kind,fields,agreement_text,${admin.id}
    from global_form_campaigns where id = ${c.req.param('id')} returning *
  `;
  return rows[0] ? c.json({ campaign: campaignShape(rows[0]) }, 201) : c.json({ error: 'Campaign not found' }, 404);
}

export async function updateCampaign(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const body = await c.req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
  const slug = normalizeSlug(body.slug);
  if (!title || !slug) return c.json({ error: "Title and a valid slug are required" }, 400);
  try {
    const rows = await sql`
      update global_form_campaigns set title = ${title}, description = ${description}, slug = ${slug}, updated_at = now()
      where id = ${c.req.param("id")} and status = 'draft' returning *
    `;
    if (!rows[0]) return c.json({ error: "Draft campaign not found" }, 404);
    return c.json({ campaign: campaignShape(rows[0]) });
  } catch (error: any) {
    if (error?.code === "23505") return c.json({ error: "Campaign slug already exists" }, 409);
    throw error;
  }
}

async function transitionCampaign(c: Ctx, from: "draft" | "open", to: "open" | "ended") {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const rows = await sql`
    update global_form_campaigns set status = ${to},
      started_at = case when ${to} = 'open' then now() else started_at end,
      ended_at = case when ${to} = 'ended' then now() else ended_at end, updated_at = now()
    where id = ${c.req.param("id")} and status = ${from} returning *
  `;
  if (!rows[0]) return c.json({ error: `Campaign must be ${from}` }, 409);
  return c.json({ campaign: campaignShape(rows[0]) });
}

export const startCampaign = (c: Ctx) => transitionCampaign(c, "draft", "open");
export const endCampaign = (c: Ctx) => transitionCampaign(c, "open", "ended");

export async function getPublicCampaign(c: Ctx) {
  const rows = await sql`select id, title, description, slug, status from global_form_campaigns where slug = ${c.req.param("slug")} limit 1`;
  if (!rows[0]) return c.json({ error: "Campaign not found" }, 404);
  return c.json({ campaign: rows[0] });
}

function profileShape(user: any) {
  return {
    full_name: user.full_name || null,
    mist_id: user.mist_id == null ? null : String(user.mist_id),
    cf_id: user.cf_id || null,
    cf_verified: Boolean(user.cf_verified),
    vjudge_id: user.vjudge_id || null,
    vjudge_verified: Boolean(user.vjudge_verified),
    phone: user.phone || null,
    batch_name: user.batch_name || null,
    tshirt_size: user.tshirt_size || null,
    codechef_id: user.codechef_id || null,
    atcoder_id: user.atcoder_id || null,
    email: user.email,
  };
}

function requiredFields(fields: GlobalFormField[], profile: Record<string, unknown>) {
  return fields.filter((field) => {
    if (!field.required || !field.mapUserField) return false;
    const value = profile[field.mapUserField];
    if (field.mapUserField === "mist_id") return !normalizeMistId(value);
    return value == null || String(value).trim() === "";
  });
}

export async function previewCampaign(c: Ctx) {
  const user = await requireStudent(c);
  if (!user) return c.json({ error: "Eligible student account required" }, 403);
  const rows = await sql`select * from global_form_campaigns where slug = ${c.req.param("slug")} limit 1`;
  if (!rows[0]) return c.json({ error: "Campaign not found" }, 404);
  const profile = profileShape(user);
  const receipts = await sql`
    select r.*, exists(
      select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending'
    ) as pending_profile_review
    from global_form_responses r where campaign_id = ${rows[0].id} and user_id = ${user.id} limit 1
  `;
  return c.json({
    campaign: campaignShape(rows[0]),
    profile,
    profile_version: profileVersion(profile),
    required_fields: requiredFields(rows[0].fields || [], profile),
    receipt: receipts[0] ? receiptShape({
      ...receipts[0],
      pending_verification: hasPendingVerification(rows[0].fields || [], user, receipts[0].pending_profile_review),
    }) : null,
  });
}

async function persistProfileChanges(tx: any, user: any, values: Record<string, string>, responseId: string) {
  const nameUpdate = values.full_name === undefined ? { shouldUpdate: false, name: null, error: null } : normalizeFullNameUpdate(values.full_name);
  if (nameUpdate.error) throw Object.assign(new Error(nameUpdate.error), { status: 400 });
  const mistId = values.mist_id === undefined ? null : normalizeMistId(values.mist_id);
  if (values.mist_id !== undefined && !mistId) throw Object.assign(new Error("MIST Student ID must be exactly nine digits"), { status: 400 });
  const changedName = nameUpdate.shouldUpdate && user.full_name !== nameUpdate.name;
  const priorValues = changedName ? { full_name: user.full_name } : {};
  const proposedValues = changedName ? { full_name: nameUpdate.name } : {};
  await tx`
    update users set
      full_name = case when ${nameUpdate.shouldUpdate} then ${nameUpdate.name} else full_name end,
      mist_id = case when ${mistId !== null} then ${mistId === null ? null : Number(mistId)} else mist_id end,
      cf_id = case when ${values.cf_id !== undefined} then ${values.cf_id || null} else cf_id end,
      cf_verified = case when ${values.cf_id !== undefined} then false else cf_verified end,
      vjudge_id = case when ${values.vjudge_id !== undefined} then ${values.vjudge_id || null} else vjudge_id end,
      vjudge_verified = case when ${values.vjudge_id !== undefined} then false else vjudge_verified end,
      phone = case when ${values.phone !== undefined} then ${values.phone || null} else phone end,
      batch_name = case when ${values.batch_name !== undefined} then ${values.batch_name || null} else batch_name end,
      tshirt_size = case when ${values.tshirt_size !== undefined} then ${values.tshirt_size || null} else tshirt_size end,
      codechef_id = case when ${values.codechef_id !== undefined} then ${values.codechef_id || null} else codechef_id end,
      atcoder_id = case when ${values.atcoder_id !== undefined} then ${values.atcoder_id || null} else atcoder_id end,
      granted = case when ${changedName} then false else granted end,
      account_review_origin = case when ${changedName} then 'profile_change' else account_review_origin end
    where id = ${user.id}
  `;
  if (changedName) {
    await tx`
      insert into global_form_profile_reviews (response_id, user_id, prior_values, proposed_values)
      values (${responseId}, ${user.id}, ${sql.json(priorValues as any)}, ${sql.json(proposedValues as any)})
    `;
  }
  if (mistId !== null) await markPreEnrollmentClaimsForUser(user.id, tx);
  return changedName || values.cf_id !== undefined || values.vjudge_id !== undefined;
}

export async function submitCampaign(c: Ctx) {
  const body = await c.req.json();
  if (body?.agreement !== true) return c.json({ error: "Agreement is required" }, 400);
  try {
    const result = await sql.begin(async (tx) => {
      const user = await requireStudent(c, tx, true);
      if (!user) throw Object.assign(new Error("Eligible student account required"), { status: 403 });
      const campaigns = await tx`select * from global_form_campaigns where slug = ${c.req.param("slug")} for update`;
      const campaign = campaigns[0];
      if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
      const prior = await tx`
        select r.*, exists(select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending') as pending_profile_review
        from global_form_responses r where r.campaign_id = ${campaign.id} and r.user_id = ${user.id} limit 1
      `;
      if (prior[0]) return {
        receipt: receiptShape({
          ...prior[0],
          pending_verification: hasPendingVerification(campaign.fields || [], user, prior[0].pending_profile_review),
        }),
        duplicate: true,
      };
      if (campaign.status !== "open") throw Object.assign(new Error("Campaign is closed"), { status: 409, code: "CAMPAIGN_CLOSED" });
      const profile = profileShape(user);
      if (body.profile_version !== profileVersion(profile)) throw Object.assign(new Error("Profile changed; review the refreshed values"), { status: 409, code: "PREVIEW_STALE" });
      const validation = validateSubmission(campaign.fields || [], body.answers, body.profile_values, profile);
      if (!validation.ok) throw Object.assign(new Error(validation.error), { status: 400 });
      const snapshot = campaignShape(campaign);
      const inserted = await tx`
        insert into global_form_responses (campaign_id, user_id, campaign_revision, campaign_snapshot, answers, profile_values, agreement)
        values (${campaign.id}, ${user.id}, ${campaign.revision}, ${sql.json(snapshot as any)}, ${sql.json(validation.answers as any)}, ${sql.json({ ...profile, ...validation.profileValues } as any)}, true)
        returning *
      `;
      const pendingProfileReview = await persistProfileChanges(tx, user, validation.profileValues, inserted[0].id);
      await tx`update global_form_presence set active = false, last_seen_at = now() where campaign_id = ${campaign.id} and user_id = ${user.id}`;
      return {
        receipt: receiptShape({
          ...inserted[0],
          pending_verification: hasPendingVerification(campaign.fields || [], {
            ...user,
            cf_verified: validation.profileValues.cf_id === undefined ? user.cf_verified : false,
            vjudge_verified: validation.profileValues.vjudge_id === undefined ? user.vjudge_verified : false,
          }, pendingProfileReview),
        }),
        duplicate: false,
      };
    });
    return c.json({ receipt: result.receipt }, result.duplicate ? 200 : 201);
  } catch (error: any) {
    if (error?.code === "23505") {
      const user = await requireStudent(c);
      const rows = user ? await sql`
        select r.*, (
          exists(select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending')
          or (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "cf_id")') and u.cf_verified is false)
          or (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "vjudge_id")') and u.vjudge_verified is false)
        ) as pending_verification
        from global_form_responses r join global_form_campaigns c on c.id = r.campaign_id join users u on u.id = r.user_id
        where c.slug = ${c.req.param("slug")} and r.user_id = ${user.id} limit 1
      ` : [];
      if (rows[0]) return c.json({ receipt: receiptShape(rows[0]) });
    }
    const status = [400, 403, 404, 409].includes(error?.status) ? error.status : 500;
    return c.json({ error: status === 500 ? "Submission failed" : error.message, ...(error?.code ? { code: error.code } : {}) }, status);
  }
}

export async function heartbeatCampaign(c: Ctx) {
  const user = await requireStudent(c);
  if (!user) return c.json({ error: "Eligible student account required" }, 403);
  const body = await c.req.json();
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim().slice(0, 120) : "";
  if (!sessionId) return c.json({ error: "Session ID is required" }, 400);
  const rows = await sql.begin(async (tx) => {
    await tx`select id from users where id = ${user.id} for update`;
    await tx`
      delete from global_form_presence
      where user_id = ${user.id} and last_seen_at < now() - interval '10 minutes'
    `;
    return tx`
      insert into global_form_presence (campaign_id, user_id, session_id, active, last_seen_at)
      select c.id, ${user.id}, ${sessionId}, ${body.active === true}, now()
      from global_form_campaigns c
      where c.slug = ${c.req.param("slug")} and c.status = 'open'
        and not exists (select 1 from global_form_responses r where r.campaign_id = c.id and r.user_id = ${user.id})
        and (
          exists(select 1 from global_form_presence p where p.campaign_id = c.id and p.user_id = ${user.id} and p.session_id = ${sessionId})
          or (select count(*) from global_form_presence p where p.campaign_id = c.id and p.user_id = ${user.id}) < 8
        )
      on conflict (campaign_id, user_id, session_id) do update set active = excluded.active, last_seen_at = now()
      returning campaign_id
    `;
  });
  return c.json({ accepted: rows.length > 0 });
}

export async function listResponses(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const page = Math.max(1, Math.min(100000, Math.floor(Number(c.req.query("page"))) || 1));
  const q = String(c.req.query("q") || "").trim().slice(0, 160);
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const campaignId = c.req.param("id");
  const counts = await sql`
    select count(*)::int as total from global_form_responses r join users u on u.id = r.user_id
    where r.campaign_id = ${campaignId} and (${q} = '' or u.full_name ilike ${pattern} escape '\\' or u.email ilike ${pattern} escape '\\' or u.mist_id::text ilike ${pattern} escape '\\' or r.profile_values->>'full_name' ilike ${pattern} escape '\\' or r.profile_values->>'mist_id' ilike ${pattern} escape '\\')
  `;
  const rows = await sql`
    select r.id, r.receipt_id, r.campaign_id, r.user_id, r.answers, r.profile_values, r.submitted_at,
      u.full_name, u.email, u.mist_id, u.cf_verified, u.vjudge_verified,
      exists(select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending') as pending_profile_review,
      (
        exists(select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending')
        or (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "cf_id")') and u.cf_verified is false)
        or (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "vjudge_id")') and u.vjudge_verified is false)
      ) as pending_verification
    from global_form_responses r
    join users u on u.id = r.user_id
    join global_form_campaigns c on c.id = r.campaign_id
    where r.campaign_id = ${campaignId} and (${q} = '' or u.full_name ilike ${pattern} escape '\\' or u.email ilike ${pattern} escape '\\' or u.mist_id::text ilike ${pattern} escape '\\' or r.profile_values->>'full_name' ilike ${pattern} escape '\\' or r.profile_values->>'mist_id' ilike ${pattern} escape '\\')
    order by r.submitted_at desc limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}
  `;
  return c.json({ responses: rows, total: Number(counts[0]?.total || 0), page, page_size: PAGE_SIZE });
}

export async function deleteResponse(c: Ctx) {
  const campaignId = c.req.param("id");
  const responseId = c.req.param("responseId");
  const result = await sql.begin(async (tx) => {
    if (!(await requireAdmin(c, tx))) return { status: 403 as const };
    // The immutability trigger accepts a delete only for the row named in this
    // transaction-local setting (docs/sql/global-form-response-deletion-20261121.sql).
    await tx`select set_config('mcc.global_form_response_delete', ${responseId}, true)`;
    // Matching both IDs means a response from another campaign is never deleted.
    // The delete trigger bumps the campaign revision, which marks dependent reports stale.
    const deleted = await tx`
      delete from global_form_responses
      where id = ${responseId} and campaign_id = ${campaignId}
      returning id
    `;
    if (!deleted[0]) return { status: 404 as const };
    const campaigns = await tx`select revision from global_form_campaigns where id = ${campaignId}`;
    return { status: 200 as const, id: deleted[0].id, revision: Number(campaigns[0]?.revision || 0) };
  });
  if (result.status === 403) return c.json({ error: "Admin access required" }, 403);
  if (result.status === 404) {
    return c.json({ error: "This response was not found in this campaign. It may already have been deleted.", code: "RESPONSE_NOT_FOUND" }, 404);
  }
  return c.json({ deleted: result.id, revision: result.revision });
}

async function dashboardStats(campaignId: string) {
  const rows = await sql`
    select c.revision,
      (select count(*)::int from global_form_responses r where r.campaign_id = c.id) as submitted,
      (select count(distinct p.user_id)::int from global_form_presence p
        where p.campaign_id = c.id and c.status = 'open' and p.active and p.last_seen_at > now() - interval '60 seconds'
          and not exists (select 1 from global_form_responses r where r.campaign_id = c.id and r.user_id = p.user_id)) as active,
      (select count(distinct r.user_id)::int from global_form_responses r join users u on u.id = r.user_id
        where r.campaign_id = c.id and (
          (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "cf_id")') and u.cf_verified is false)
          or (jsonb_path_exists(c.fields, '$[*] ? (@.required == true && @.mapUserField == "vjudge_id")') and u.vjudge_verified is false)
          or exists(select 1 from global_form_profile_reviews pr where pr.response_id = r.id and pr.status = 'pending'))) as pending_verification
    from global_form_campaigns c where c.id = ${campaignId}
  `;
  return rows[0] ? {
    submitted: Number(rows[0].submitted), active: Number(rows[0].active),
    pending_verification: Number(rows[0].pending_verification), revision: Number(rows[0].revision),
  } : null;
}

export async function getDashboard(c: Ctx) {
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  const campaignId = c.req.query("campaign_id");
  if (!campaignId) return c.json({ error: "Campaign ID is required" }, 400);
  const stats = await dashboardStats(campaignId);
  return stats ? c.json(stats) : c.json({ error: "Campaign not found" }, 404);
}

export async function streamDashboard(c: Ctx) {
  const campaignId = c.req.query("campaign_id");
  if (!campaignId) return c.json({ error: "Campaign ID is required" }, 400);
  if (!(await requireAdmin(c))) return c.json({ error: "Admin access required" }, 403);
  return streamSSE(c, async (stream) => {
    let running = true;
    stream.onAbort(() => { running = false; });
    while (running && !stream.aborted) {
      if (!(await requireAdmin(c))) {
        await stream.writeSSE({ event: "unauthorized", data: JSON.stringify({ error: "Admin access required" }) });
        break;
      }
      const stats = await dashboardStats(campaignId);
      if (!stats) {
        await stream.writeSSE({ event: "error", data: JSON.stringify({ error: "Campaign not found" }) });
        break;
      }
      await stream.writeSSE({ event: "stats", data: JSON.stringify(stats) });
      await stream.sleep(5000);
    }
  }, async () => undefined);
}
