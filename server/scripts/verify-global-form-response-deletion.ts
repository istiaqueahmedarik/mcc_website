/**
 * Response deletion regressions (issue #63) against the disposable local forms_test DB only.
 * Apply docs/sql/global-form-response-deletion-20261121.sql first.
 * Uses real Hono handlers and synthetic @forms.invalid accounts. No hosted DB, providers, or email.
 */
import assert from 'node:assert/strict';
const target = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/forms_test') throw new Error('Disposable local forms_test required');
process.env.SECRET = 'global-forms-local-integration-only';
const { default: sql } = await import('../src/db');
const { sign } = await import('hono/jwt');
const { createGlobalFormsTestApp } = await import('../tests/globalFormsTestApp');
const app = createGlobalFormsTestApp();
let checks = 0;
function check(value: unknown, message: string) { assert.ok(value, message); checks++; }
async function account(extra: Record<string, unknown> = {}) {
  const [row] = await sql`insert into users ${sql({
    email: `${crypto.randomUUID()}@forms.invalid`, full_name: 'Synthetic Student', mist_id: 202614009,
    cf_id: 'SyntheticCF', cf_verified: true, vjudge_id: 'SyntheticVJ', vjudge_verified: true, granted: true, ...extra,
  })} returning *`;
  return { ...row, token: await sign({ id: row.id, email: row.email, exp: Math.floor(Date.now() / 1000) + 600 }, process.env.SECRET!) };
}
async function request(path: string, actor?: any, body?: unknown, method?: string) {
  const r = await app.request(path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { error: text }; }
  return { status: r.status, json };
}
const remove = (campaignId: string, responseId: string, actor?: any) =>
  request(`/global-forms/manage/campaigns/${campaignId}/responses/${responseId}`, actor, undefined, 'DELETE');
const count = async (campaignId: string) =>
  (await sql`select count(*)::int as n from global_form_responses where campaign_id=${campaignId}`)[0].n;
const revision = async (campaignId: string) =>
  Number((await sql`select revision from global_form_campaigns where id=${campaignId}`)[0].revision);
async function openCampaign(admin: any, templateId: string, title: string) {
  const campaign = (await request('/global-forms/manage/campaigns', admin, { title, template_id: templateId })).json.campaign;
  await request(`/global-forms/manage/campaigns/${campaign.id}/start`, admin, {});
  return campaign;
}
async function register(campaign: any, student: any, profile_values: Record<string, unknown> = {}) {
  const preview = await request(`/global-forms/public/${campaign.slug}/preview`, student);
  return request(`/global-forms/public/${campaign.slug}/submit`, student, { answers: {}, profile_values, profile_version: preview.json.profile_version, agreement: true });
}

try {
  const admin = await account({ admin: true, full_name: 'Synthetic Admin' });
  const trainer = await account({ trainer: true });
  const studentA = await account(), studentB = await account();
  const template = (await request('/global-forms/manage/templates', admin, {
    title: 'Deletion QA', kind: 'general', description: '', agreement_text: 'Agree',
    fields: [{ id: 'note', label: 'Note', type: 'text', required: false, mapUserField: null, options: [], helpText: '' }],
  })).json.template;
  const campaign = await openCampaign(admin, template.id, 'Deletion QA campaign');
  const otherCampaign = await openCampaign(admin, template.id, 'Deletion QA other campaign');
  const responseA = (await register(campaign, studentA)).json.receipt;
  await register(campaign, studentB);
  const otherResponse = (await register(otherCampaign, studentA)).json.receipt;
  const [rowA] = await sql`select id from global_form_responses where campaign_id=${campaign.id} and user_id=${studentA.id}`;
  const [rowOther] = await sql`select id from global_form_responses where campaign_id=${otherCampaign.id} and user_id=${studentA.id}`;
  check(responseA && otherResponse && rowA && rowOther, 'fixture responses submitted');

  // AC4: unauthorized callers are denied and nothing is deleted.
  check((await remove(campaign.id, rowA.id)).status === 401, 'anonymous delete denied');
  check((await remove(campaign.id, rowA.id, studentA)).status === 403, 'student delete denied');
  check((await remove(campaign.id, rowA.id, trainer)).status === 403, 'trainer delete denied');
  check(await count(campaign.id) === 2, 'denied requests delete nothing');

  // AC4: a response from another campaign is rejected and both campaigns keep their data.
  const mismatch = await remove(campaign.id, rowOther.id, admin);
  check(mismatch.status === 404 && mismatch.json.code === 'RESPONSE_NOT_FOUND', 'mismatched campaign rejected');
  check(await count(campaign.id) === 2 && await count(otherCampaign.id) === 1, 'mismatch leaves both campaigns intact');
  check((await remove(campaign.id, 'not-a-uuid', admin)).status === 400, 'malformed response ID rejected');

  // AC6: a contest room filtered by the campaign, with a published report.
  const [room] = await sql`insert into "Contest_report_room" ("Room Name") values ('Deletion QA room') returning id`;
  await sql`insert into global_contest_report_eligibility (room_id, campaign_id, selection_version, membership_revision)
    values (${room.id}, ${campaign.id}, 1, ${await revision(campaign.id)})`;
  const publishedJson = JSON.stringify({ synthetic: true, rows: ['published before deletion'] });
  await sql`insert into "Public_contest_report" ("Shared_contest_id", "JSON_string", is_stale) values (${room.id}, ${publishedJson}, false)`;

  // AC3/AC5: an admin delete removes exactly one response and leaves the account untouched.
  const [userBefore] = await sql`select * from users where id=${studentA.id}`;
  const revisionBefore = await revision(campaign.id);
  const otherRevisionBefore = await revision(otherCampaign.id);
  const deleted = await remove(campaign.id, rowA.id, admin);
  check(deleted.status === 200 && deleted.json.deleted === rowA.id, 'admin deletes the response');
  check(deleted.json.revision === revisionBefore + 1 && await revision(campaign.id) === revisionBefore + 1, 'campaign revision increases once');
  check(await revision(otherCampaign.id) === otherRevisionBefore, 'unrelated campaign revision unchanged');
  check(await count(campaign.id) === 1 && await count(otherCampaign.id) === 1, 'exactly one response removed');
  const listed = await request(`/global-forms/manage/campaigns/${campaign.id}/responses?page=1`, admin);
  check(listed.json.total === 1 && !listed.json.responses.some((r: any) => r.id === rowA.id), 'response list and total updated');
  check((await request(`/global-forms/manage/dashboard?campaign_id=${campaign.id}`, admin)).json.submitted === 1, 'dashboard submitted count updated');
  const [userAfter] = await sql`select * from users where id=${studentA.id}`;
  check(JSON.stringify(userAfter) === JSON.stringify(userBefore), 'student account and profile unchanged');
  check((await remove(campaign.id, rowA.id, admin)).status === 404, 'repeated delete fails safely');

  // AC6: membership revision recorded; published report marked stale with unchanged content.
  const [eligibility] = await sql`select membership_revision from global_contest_report_eligibility where room_id=${room.id}`;
  check(Number(eligibility.membership_revision) === revisionBefore + 1, 'report eligibility records the new membership revision');
  const [published] = await sql`select is_stale, "JSON_string" from "Public_contest_report" where "Shared_contest_id"=${room.id}`;
  check(published.is_stale === true && published.JSON_string === publishedJson, 'published report marked stale without rewriting it');

  // AC8: the student may register again while open, but not after the campaign ends.
  const preview = await request(`/global-forms/public/${campaign.slug}/preview`, studentA);
  check(preview.json.receipt === null, 'student no longer sees a receipt');
  const again = await register(campaign, studentA);
  check(again.status === 201 && again.json.receipt.id && again.json.receipt.id !== responseA.id, 'student can resubmit while open with a new receipt');
  await request(`/global-forms/manage/campaigns/${campaign.id}/end`, admin, {});
  const [rowAgain] = await sql`select id from global_form_responses where campaign_id=${campaign.id} and user_id=${studentA.id}`;
  check((await remove(campaign.id, rowAgain.id, admin)).status === 200, 'ended campaign response can be deleted');
  check((await register(campaign, studentA)).status === 409, 'ended campaign blocks resubmission');

  // AC5: a pending profile review survives and still reaches the admin queue.
  const [starter] = await sql`select id from global_form_templates where built_in and kind='tfc'`;
  const tfc = await openCampaign(admin, starter.id, 'Deletion QA TFC');
  const reviewed = await account({ full_name: null });
  check((await register(tfc, reviewed, { full_name: 'Proposed Name' })).status === 201, 'name completion submitted');
  const [reviewedRow] = await sql`select id from global_form_responses where campaign_id=${tfc.id} and user_id=${reviewed.id}`;
  check((await request(`/global-forms/manage/dashboard?campaign_id=${tfc.id}`, admin)).json.pending_verification === 1, 'pending verification counted before delete');
  const [reviewedUserBefore] = await sql`select * from users where id=${reviewed.id}`;
  check((await remove(tfc.id, reviewedRow.id, admin)).status === 200, 'response with pending review deleted');
  const [review] = await sql`select status, response_id from global_form_profile_reviews where user_id=${reviewed.id}`;
  check(review.status === 'pending' && review.response_id === null, 'pending review kept without its response');
  const [reviewedUserAfter] = await sql`select * from users where id=${reviewed.id}`;
  check(JSON.stringify(reviewedUserAfter) === JSON.stringify(reviewedUserBefore), 'reviewed account unchanged');
  const pendings = await request('/auth/user/pendings', admin);
  check(pendings.json.result.some((u: any) => u.id === reviewed.id && u.review_type === 'profile_change'), 'review still in admin pending queue');
  check((await request(`/global-forms/manage/dashboard?campaign_id=${tfc.id}`, admin)).json.pending_verification === 0, 'campaign verification count updated');

  console.log(`Global form response deletion integration: ${checks} checks passed (synthetic data only).`);
} finally {
  await sql.end();
}
