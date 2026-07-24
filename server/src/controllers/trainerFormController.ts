import { Context } from "hono";
import { verify as JwtVerify } from "hono/jwt";
import sql from "../db";

type FormType = "classroom_invitation" | "attendance" | "general";

type TrainerFormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  helpText: string;
  options: string[];
  mapUserField: string | null;
};

const FORM_TYPES: FormType[] = [
  "classroom_invitation",
  "attendance",
  "general",
];

const FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
]);

const USER_FIELDS = new Set([
  "id",
  "full_name",
  "email",
  "phone",
  "mist_id",
  "batch_name",
  "vjudge_id",
  "cf_id",
  "codechef_id",
  "atcoder_id",
  "tshirt_size",
]);

const USER_FIELD_LABELS: Record<string, string> = {
  id: "MCC User ID",
  full_name: "Full Name",
  email: "Email",
  phone: "Phone",
  mist_id: "Student ID",
  batch_name: "Batch",
  vjudge_id: "VJudge ID",
  cf_id: "Codeforces ID",
  codechef_id: "CodeChef ID",
  atcoder_id: "AtCoder ID",
  tshirt_size: "T-shirt Size",
};

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeFormType(value: unknown): FormType {
  return FORM_TYPES.includes(value as FormType) ? (value as FormType) : "general";
}

function normalizeUserField(value: unknown, fallback = "mist_id") {
  const raw = sanitizeText(value, fallback);
  const normalized = raw === "student_id" ? "mist_id" : raw;
  return USER_FIELDS.has(normalized) ? normalized : fallback;
}

function normalizeField(raw: any, index: number): TrainerFormField {
  const label = sanitizeText(raw?.label, `Field ${index + 1}`) || `Field ${index + 1}`;
  const type = FIELD_TYPES.has(raw?.type) ? raw.type : "text";
  const mapUserField = raw?.mapUserField
    ? normalizeUserField(raw.mapUserField, "")
    : null;

  const options = Array.isArray(raw?.options)
    ? raw.options
        .map((option: unknown) => sanitizeText(option))
        .filter(Boolean)
        .slice(0, 30)
    : typeof raw?.optionsText === "string"
      ? raw.optionsText
          .split("\n")
          .map((option: string) => option.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [];

  return {
    id: sanitizeText(raw?.id, `field_${Date.now()}_${index}`).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    ),
    label,
    type,
    required: Boolean(raw?.required),
    placeholder: sanitizeText(raw?.placeholder),
    helpText: sanitizeText(raw?.helpText),
    options,
    mapUserField: mapUserField || null,
  };
}

function normalizeFields(rawFields: unknown): TrainerFormField[] {
  if (!Array.isArray(rawFields)) return [];
  return rawFields.slice(0, 60).map(normalizeField);
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return base || "trainer-form";
}

async function createShareSlug(title: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomUUID().split("-")[0];
    const shareSlug = `${slugify(title)}-${suffix}`;
    const exists =
      await sql`SELECT id FROM trainer_forms WHERE share_slug = ${shareSlug} LIMIT 1`;
    if (exists.length === 0) return shareSlug;
  }
  return `${slugify(title)}-${Date.now()}`;
}

async function requireTrainer(c: Context) {
  const { id } = c.get("jwtPayload") || {};
  if (!id) return null;
  const rows =
    await sql`SELECT id, full_name, email, admin, trainer FROM users WHERE id = ${id} LIMIT 1`;
  const user = rows[0];
  if (!user || (!user.admin && !user.trainer)) return null;
  return user;
}

async function getOptionalAuthenticatedUser(c: Context) {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const secret = process.env.SECRET || "";
  if (!token || !secret) return null;

  try {
    const payload = await JwtVerify(token, secret, "HS256");
    const id = payload.id;
    const email = payload.email;
    if (!id || !email) return null;

    const rows = await sql`
      SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
      FROM users
      WHERE id = ${String(id)} AND email = ${String(email)}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function findUserByPrimaryKey(field: string, value: string) {
  const needle = value.trim();
  if (!needle) return [];

  switch (field) {
    case "id":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE id::text = ${needle}
        LIMIT 1
      `;
    case "email":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(email) = lower(${needle})
        LIMIT 1
      `;
    case "full_name":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(full_name) = lower(${needle})
        LIMIT 1
      `;
    case "phone":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE phone = ${needle}
        LIMIT 1
      `;
    case "vjudge_id":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(vjudge_id) = lower(${needle})
        LIMIT 1
      `;
    case "cf_id":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(cf_id) = lower(${needle})
        LIMIT 1
      `;
    case "codechef_id":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(codechef_id) = lower(${needle})
        LIMIT 1
      `;
    case "atcoder_id":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(atcoder_id) = lower(${needle})
        LIMIT 1
      `;
    case "batch_name":
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE lower(batch_name) = lower(${needle})
        LIMIT 1
      `;
    case "mist_id":
    default:
      return sql`
        SELECT id, full_name, email, phone, mist_id, batch_name, vjudge_id, cf_id, codechef_id, atcoder_id, tshirt_size
        FROM users
        WHERE mist_id::text = ${needle}
        LIMIT 1
      `;
  }
}

function getUserValue(user: any, field: string | null) {
  if (!user || !field) return null;
  const value = user[field];
  return value === undefined || value === null ? null : String(value);
}

function formFields(form: any): TrainerFormField[] {
  return normalizeFields(form?.fields || []);
}

function mappedValuesForUser(form: any, user: any) {
  const fields = formFields(form);
  return fields.reduce((acc: Record<string, unknown>, field) => {
    if (field.mapUserField) {
      acc[field.id] = getUserValue(user, field.mapUserField);
    }
    return acc;
  }, {});
}

function publicFormPayload(form: any, currentUser: any = null) {
  const fields = formFields(form);
  const primaryKeyValue = currentUser
    ? getUserValue(currentUser, form.primary_key_field)
    : null;
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    type: form.type,
    share_slug: form.share_slug,
    primary_key_field: form.primary_key_field,
    primary_key_label: form.primary_key_label,
    classroom_id: form.classroom_id,
    class_id: form.class_id,
    classroom_name: form.classroom_name || null,
    class_name: form.class_name || null,
    fields,
    user_field_labels: USER_FIELD_LABELS,
    authenticated_user: currentUser
      ? {
          id: currentUser.id,
          primary_key_value: primaryKeyValue,
          mapped_values: mappedValuesForUser(form, currentUser),
        }
      : null,
  };
}

function buildResponseJson(
  form: any,
  user: any,
  primaryKeyValue: string,
  rawAnswers: Record<string, unknown>,
) {
  const fields = formFields(form);
  const mapped: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {};
  const flat: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.mapUserField) {
      const value = getUserValue(user, field.mapUserField);
      mapped[field.label] = value;
      flat[field.label] = value;
      continue;
    }

    const value =
      rawAnswers[field.id] !== undefined
        ? rawAnswers[field.id]
        : rawAnswers[field.label] !== undefined
          ? rawAnswers[field.label]
          : "";
    custom[field.label] = value;
    flat[field.label] = value;
  }

  return {
    form: {
      id: form.id,
      title: form.title,
      type: form.type,
    },
    primary_key: {
      field: form.primary_key_field,
      label: form.primary_key_label,
      value: primaryKeyValue,
    },
    matched_user_id: user?.id || null,
    user_snapshot: user
      ? {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mist_id: user.mist_id,
          batch_name: user.batch_name,
        }
      : null,
    mapped,
    custom,
    flat,
    submitted_at: new Date().toISOString(),
  };
}

function validateResponse(form: any, user: any, rawAnswers: Record<string, unknown>) {
  const missing: string[] = [];
  for (const field of formFields(form)) {
    if (!field.required) continue;
    if (field.mapUserField) {
      if (!getUserValue(user, field.mapUserField)) missing.push(field.label);
      continue;
    }
    const value = rawAnswers[field.id] ?? rawAnswers[field.label];
    if (field.type === "checkbox" && value !== true) {
      missing.push(field.label);
      continue;
    }
    if (value === undefined || value === null || value === "") {
      missing.push(field.label);
    }
  }
  return missing;
}

export const listUserFormFields = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  return c.json({
    result: Object.entries(USER_FIELD_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  });
};

export const listTrainerForms = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  try {
    const forms = trainer.admin
      ? await sql`
          SELECT tf.*, u.full_name AS trainer_name, c.name AS classroom_name, cl.name AS class_name,
            COUNT(tfr.id)::int AS response_count
          FROM trainer_forms tf
          JOIN users u ON tf.created_by = u.id
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          LEFT JOIN trainer_form_responses tfr ON tfr.form_id = tf.id
          GROUP BY tf.id, u.full_name, c.name, cl.name
          ORDER BY tf.created_at DESC
        `
      : await sql`
          SELECT tf.*, u.full_name AS trainer_name, c.name AS classroom_name, cl.name AS class_name,
            COUNT(tfr.id)::int AS response_count
          FROM trainer_forms tf
          JOIN users u ON tf.created_by = u.id
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          LEFT JOIN trainer_form_responses tfr ON tfr.form_id = tf.id
          WHERE tf.created_by = ${trainer.id}
          GROUP BY tf.id, u.full_name, c.name, cl.name
          ORDER BY tf.created_at DESC
        `;

    return c.json({ result: forms });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const createTrainerForm = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  try {
    const body = await c.req.json();
    const title = sanitizeText(body.title);
    if (!title) return c.json({ error: "Title is required" }, 400);

    const fields = normalizeFields(body.fields);
    const type = normalizeFormType(body.type);
    const primaryKeyField = normalizeUserField(body.primary_key_field);
    const primaryKeyLabel =
      sanitizeText(body.primary_key_label) ||
      USER_FIELD_LABELS[primaryKeyField] ||
      "Student ID";
    const shareSlug = await createShareSlug(title);

    const result = await sql`
      INSERT INTO trainer_forms (
        created_by,
        title,
        description,
        type,
        share_slug,
        status,
        primary_key_field,
        primary_key_label,
        classroom_id,
        class_id,
        fields,
        settings
      )
      VALUES (
        ${trainer.id},
        ${title},
        ${sanitizeText(body.description) || null},
        ${type},
        ${shareSlug},
        ${body.status === "draft" ? "draft" : "published"},
        ${primaryKeyField},
        ${primaryKeyLabel},
        ${body.classroom_id || null},
        ${body.class_id || null},
        ${JSON.stringify(fields)}::jsonb,
        ${JSON.stringify(body.settings || {})}::jsonb
      )
      RETURNING *
    `;

    return c.json({ success: true, form: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getTrainerForm = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  const formId = c.req.param("id");
  try {
    const forms = trainer.admin
      ? await sql`
          SELECT tf.*, u.full_name AS trainer_name, c.name AS classroom_name, cl.name AS class_name
          FROM trainer_forms tf
          JOIN users u ON tf.created_by = u.id
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          WHERE tf.id = ${formId}
          LIMIT 1
        `
      : await sql`
          SELECT tf.*, u.full_name AS trainer_name, c.name AS classroom_name, cl.name AS class_name
          FROM trainer_forms tf
          JOIN users u ON tf.created_by = u.id
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          WHERE tf.id = ${formId} AND tf.created_by = ${trainer.id}
          LIMIT 1
        `;

    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);
    return c.json({ form: forms[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateTrainerForm = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  const formId = c.req.param("id");
  try {
    const owned = trainer.admin
      ? await sql`SELECT id FROM trainer_forms WHERE id = ${formId} LIMIT 1`
      : await sql`SELECT id FROM trainer_forms WHERE id = ${formId} AND created_by = ${trainer.id} LIMIT 1`;
    if (owned.length === 0) return c.json({ error: "Form not found" }, 404);

    const body = await c.req.json();
    const title = sanitizeText(body.title);
    if (!title) return c.json({ error: "Title is required" }, 400);

    const fields = normalizeFields(body.fields);
    const type = normalizeFormType(body.type);
    const primaryKeyField = normalizeUserField(body.primary_key_field);
    const primaryKeyLabel =
      sanitizeText(body.primary_key_label) ||
      USER_FIELD_LABELS[primaryKeyField] ||
      "Student ID";

    const result = await sql`
      UPDATE trainer_forms
      SET
        title = ${title},
        description = ${sanitizeText(body.description) || null},
        type = ${type},
        status = ${body.status === "draft" ? "draft" : "published"},
        primary_key_field = ${primaryKeyField},
        primary_key_label = ${primaryKeyLabel},
        classroom_id = ${body.classroom_id || null},
        class_id = ${body.class_id || null},
        fields = ${JSON.stringify(fields)}::jsonb,
        settings = ${JSON.stringify(body.settings || {})}::jsonb,
        updated_at = now()
      WHERE id = ${formId}
      RETURNING *
    `;

    return c.json({ success: true, form: result[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getTrainerFormResponses = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  const formId = c.req.param("id");
  try {
    const forms = trainer.admin
      ? await sql`SELECT id FROM trainer_forms WHERE id = ${formId} LIMIT 1`
      : await sql`SELECT id FROM trainer_forms WHERE id = ${formId} AND created_by = ${trainer.id} LIMIT 1`;
    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);

    const responses = await sql`
      SELECT
        tfr.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.mist_id AS user_mist_id,
        u.batch_name AS user_batch_name
      FROM trainer_form_responses tfr
      LEFT JOIN users u ON tfr.matched_user_id = u.id
      WHERE tfr.form_id = ${formId}
      ORDER BY tfr.submitted_at DESC
    `;
    return c.json({ responses });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getTrainerFormAnalytics = async (c: Context) => {
  const trainer = await requireTrainer(c);
  if (!trainer) return c.json({ error: "Unauthorized: Trainers only" }, 403);

  const formId = c.req.param("id");
  try {
    const forms = trainer.admin
      ? await sql`
          SELECT tf.*, c.name AS classroom_name, cl.name AS class_name
          FROM trainer_forms tf
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          WHERE tf.id = ${formId}
          LIMIT 1
        `
      : await sql`
          SELECT tf.*, c.name AS classroom_name, cl.name AS class_name
          FROM trainer_forms tf
          LEFT JOIN classrooms c ON tf.classroom_id = c.id
          LEFT JOIN classes cl ON tf.class_id = cl.id
          WHERE tf.id = ${formId} AND tf.created_by = ${trainer.id}
          LIMIT 1
        `;

    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);
    const form = forms[0];

    const responses = await sql`
      SELECT
        tfr.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.mist_id AS user_mist_id,
        u.batch_name AS user_batch_name
      FROM trainer_form_responses tfr
      LEFT JOIN users u ON tfr.matched_user_id = u.id
      WHERE tfr.form_id = ${formId}
      ORDER BY tfr.submitted_at DESC
    `;

    const total = responses.length;
    const matched = responses.filter((response: any) => response.matched_user_id).length;
    const byDay = responses.reduce((acc: Record<string, number>, response: any) => {
      const key = new Date(response.submitted_at).toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const fieldSummary: Record<string, Record<string, number>> = {};
    for (const response of responses) {
      const flat = response.response_json?.flat || {};
      for (const [label, value] of Object.entries(flat)) {
        const normalized = value === null || value === undefined || value === "" ? "(blank)" : String(value);
        fieldSummary[label] ||= {};
        fieldSummary[label][normalized] = (fieldSummary[label][normalized] || 0) + 1;
      }
    }

    let dynamic: any = {};
    if (form.type === "classroom_invitation" && form.classroom_id) {
      const roster = await sql`
        SELECT COUNT(*)::int AS total
        FROM classroom_students
        WHERE classroom_id = ${form.classroom_id}
      `;
      const joined = await sql`
        SELECT COUNT(DISTINCT cs.student_id)::int AS total
        FROM classroom_students cs
        JOIN trainer_form_responses tfr ON tfr.matched_user_id = cs.student_id
        WHERE cs.classroom_id = ${form.classroom_id} AND tfr.form_id = ${formId}
      `;
      dynamic = {
        classroom_name: form.classroom_name,
        classroom_roster_count: roster[0]?.total || 0,
        joined_from_form: joined[0]?.total || 0,
      };
    }

    if (form.type === "attendance" && form.classroom_id) {
      const roster = await sql`
        SELECT u.id, u.full_name, u.email, u.mist_id, u.batch_name
        FROM classroom_students cs
        JOIN users u ON cs.student_id = u.id
        WHERE cs.classroom_id = ${form.classroom_id}
        ORDER BY u.full_name ASC
      `;
      const presentIds = new Set(
        responses
          .map((response: any) => response.matched_user_id)
          .filter(Boolean),
      );
      const absent = roster.filter((student: any) => !presentIds.has(student.id));
      dynamic = {
        classroom_name: form.classroom_name,
        class_name: form.class_name,
        roster_count: roster.length,
        present_count: presentIds.size,
        absent_count: absent.length,
        present_rate: roster.length ? Math.round((presentIds.size / roster.length) * 100) : 0,
        absent,
      };
    }

    return c.json({
      form,
      analytics: {
        total_responses: total,
        matched_responses: matched,
        unmatched_responses: total - matched,
        by_day: Object.entries(byDay).map(([date, count]) => ({ date, count })),
        field_summary: fieldSummary,
        dynamic,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const getPublicTrainerForm = async (c: Context) => {
  const shareSlug = c.req.param("slug");
  try {
    const forms = await sql`
      SELECT tf.*, c.name AS classroom_name, cl.name AS class_name
      FROM trainer_forms tf
      LEFT JOIN classrooms c ON tf.classroom_id = c.id
      LEFT JOIN classes cl ON tf.class_id = cl.id
      WHERE tf.share_slug = ${shareSlug} AND tf.status = 'published'
      LIMIT 1
    `;

    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);
    const currentUser = await getOptionalAuthenticatedUser(c);
    return c.json({ form: publicFormPayload(forms[0], currentUser) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const resolvePublicTrainerFormUser = async (c: Context) => {
  const shareSlug = c.req.param("slug");
  try {
    const body = await c.req.json();
    const currentUser = await getOptionalAuthenticatedUser(c);

    const forms = await sql`
      SELECT *
      FROM trainer_forms
      WHERE share_slug = ${shareSlug} AND status = 'published'
      LIMIT 1
    `;
    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);

    const form = forms[0];
    let user = currentUser;
    let value = currentUser ? getUserValue(currentUser, form.primary_key_field) : null;

    if (!user) {
      value = sanitizeText(body.primary_key_value);
      if (!value) return c.json({ error: "Student identifier is required" }, 400);
      const users = await findUserByPrimaryKey(form.primary_key_field, value);
      user = users[0] || null;
    }

    if (!user) return c.json({ matched: false, mapped_values: {} });
    if (!value) {
      return c.json({
        error: `Your profile does not have ${form.primary_key_label || "the required identifier"}`,
      }, 400);
    }

    const mappedValues = mappedValuesForUser(form, user);

    return c.json({
      matched: true,
      primary_key_value: value,
      mapped_values: mappedValues,
      locked: Boolean(currentUser),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

export const submitPublicTrainerForm = async (c: Context) => {
  const shareSlug = c.req.param("slug");
  try {
    const { primary_key_value, answers } = await c.req.json();
    const currentUser = await getOptionalAuthenticatedUser(c);
    let primaryKeyValue = sanitizeText(primary_key_value);
    const rawAnswers =
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? answers
        : {};

    const forms = await sql`
      SELECT *
      FROM trainer_forms
      WHERE share_slug = ${shareSlug} AND status = 'published'
      LIMIT 1
    `;
    if (forms.length === 0) return c.json({ error: "Form not found" }, 404);
    const form = forms[0];

    let user = currentUser;
    if (currentUser) {
      const profilePrimaryKeyValue = getUserValue(currentUser, form.primary_key_field);
      if (!profilePrimaryKeyValue) {
        return c.json({
          error: `Your profile does not have ${form.primary_key_label || "the required identifier"}`,
        }, 400);
      }
      primaryKeyValue = profilePrimaryKeyValue;
    } else {
      if (!primaryKeyValue) {
        return c.json({ error: "Student identifier is required" }, 400);
      }

      const users = await findUserByPrimaryKey(form.primary_key_field, primaryKeyValue);
      user = users[0] || null;
    }

    if (!user) {
      return c.json({ error: "No MCC user found for this identifier" }, 404);
    }

    const missing = validateResponse(form, user, rawAnswers);
    if (missing.length > 0) {
      return c.json({ error: `Missing required fields: ${missing.join(", ")}` }, 400);
    }

    const responseJson = buildResponseJson(form, user, primaryKeyValue, rawAnswers);
    const userSnapshot = responseJson.user_snapshot || {};

    const rows = await sql`
      INSERT INTO trainer_form_responses (
        form_id,
        matched_user_id,
        primary_key_value,
        response_json,
        raw_answers,
        user_snapshot,
        submission_meta
      )
      VALUES (
        ${form.id},
        ${user.id},
        ${primaryKeyValue},
        ${JSON.stringify(responseJson)}::jsonb,
        ${JSON.stringify(rawAnswers)}::jsonb,
        ${JSON.stringify(userSnapshot)}::jsonb,
        ${JSON.stringify({
          user_agent: c.req.header("User-Agent") || null,
          ip: c.req.header("x-forwarded-for") || null,
          authenticated_user_id: currentUser?.id || null,
        })}::jsonb
      )
      ON CONFLICT (form_id, primary_key_value)
      DO UPDATE SET
        matched_user_id = excluded.matched_user_id,
        response_json = excluded.response_json,
        raw_answers = excluded.raw_answers,
        user_snapshot = excluded.user_snapshot,
        submission_meta = excluded.submission_meta,
        submitted_at = now()
      RETURNING *
    `;

    if (form.type === "classroom_invitation" && form.classroom_id) {
      await sql`
        INSERT INTO classroom_students (classroom_id, student_id)
        VALUES (${form.classroom_id}, ${user.id})
        ON CONFLICT DO NOTHING
      `;
    }

    return c.json({ success: true, response: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
