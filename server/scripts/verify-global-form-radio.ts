/**
 * Radio-question regressions (issue #50) against the disposable local forms_test DB only.
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
async function account(admin = false) {
  const [row] = await sql`insert into users(email,full_name,mist_id,cf_id,cf_verified,vjudge_id,vjudge_verified,admin,granted)
    values(${`${crypto.randomUUID()}@forms.invalid`},${admin ? 'Synthetic Admin' : 'Synthetic Student'},202614009,'SyntheticCF',true,'SyntheticVJ',true,${admin},true) returning *`;
  return { ...row, token: await sign({ id: row.id, email: row.email, exp: Math.floor(Date.now() / 1000) + 600 }, process.env.SECRET!) };
}
async function request(path: string, actor?: any, body?: unknown, method?: string) {
  const r = await app.request(path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { error: text }; }
  return { status: r.status, json };
}
const slotField = { id: 'slot', label: 'Preferred slot', type: 'radio', required: true, mapUserField: null, options: ['Morning', 'Evening'], helpText: 'Pick one' };
const mealField = { id: 'meal', label: 'Meal', type: 'radio', required: false, mapUserField: null, options: ['Veg', 'Non-veg'], helpText: '' };
const radioConfig = (field: any) => ({ label: field.label, type: field.type, required: field.required, options: field.options });
const definition = (fields: unknown[]) => ({ title: 'Radio QA', kind: 'general', description: '', agreement_text: 'Agree', fields });

try {
  const admin = await account(true), student = await account();

  // AC2: unusable option configurations are rejected with a question-specific error.
  for (const [options, problem] of [[['Morning'], 'one option'], [['Morning', ' '], 'blank option'], [['Morning', 'MORNING '], 'look-alike options']] as const) {
    const bad = await request('/global-forms/manage/templates', admin, definition([{ ...slotField, options }]));
    check(bad.status === 400 && bad.json.error.includes('slot'), `${problem} rejected with an error naming the question`);
  }
  const mapped = await request('/global-forms/manage/templates', admin, definition([{ ...slotField, mapUserField: 'tshirt_size' }]));
  check(mapped.status === 400, 'radio question cannot use a profile mapping');

  // AC1/AC7: create, reopen, edit, and clone preserve label, options, order, and requiredness.
  const created = await request('/global-forms/manage/templates', admin, definition([slotField, mealField]));
  check(created.status === 201, 'radio template created');
  const template = created.json.template;
  const reopened = (await request('/global-forms/manage/templates', admin)).json.templates.find((item: any) => item.id === template.id);
  check(JSON.stringify(reopened.fields.map(radioConfig)) === JSON.stringify([slotField, mealField].map(radioConfig)), 'reopened template preserves radio configuration');
  const edited = await request(`/global-forms/manage/templates/${template.id}`, admin, { ...definition([slotField, mealField]), title: 'Radio QA edited' }, 'PUT');
  check(edited.status === 200 && JSON.stringify(edited.json.template.fields.map(radioConfig)) === JSON.stringify([slotField, mealField].map(radioConfig)), 'edited template preserves radio configuration');
  const cloned = await request(`/global-forms/manage/templates/${template.id}/clone`, admin, {});
  check(cloned.status === 201 && JSON.stringify(cloned.json.template.fields.map(radioConfig)) === JSON.stringify([slotField, mealField].map(radioConfig)), 'cloned template preserves radio configuration');

  // AC7: a campaign freezes the options; later template edits do not change its meaning.
  const campaign = (await request('/global-forms/manage/campaigns', admin, { title: 'Radio QA campaign', template_id: template.id })).json.campaign;
  check((await request(`/global-forms/manage/campaigns/${campaign.id}/start`, admin, {})).status === 200, 'radio campaign opened');
  const changed = await request(`/global-forms/manage/templates/${template.id}`, admin, definition([{ ...slotField, options: ['Morning', 'Night'] }, mealField]), 'PUT');
  check(changed.status === 200, 'template options edited after campaign creation');
  const frozen = (await request(`/global-forms/manage/campaigns/${campaign.id}`, admin)).json.campaign;
  check(JSON.stringify(frozen.fields[0].options) === JSON.stringify(['Morning', 'Evening']), 'campaign keeps its original options');

  const preview = await request(`/global-forms/public/${campaign.slug}/preview`, student);
  check(preview.status === 200, 'student preview loads');
  const submit = (answers: unknown) => request(`/global-forms/public/${campaign.slug}/submit`, student, { answers, profile_values: {}, profile_version: preview.json.profile_version, agreement: true });
  const storedCount = async () => (await sql`select count(*)::int as count from global_form_responses where campaign_id=${campaign.id}`)[0].count;

  // AC4/AC5: missing required answers and tampered answers are rejected and store nothing.
  const missing = await submit({ meal: 'Veg' });
  check(missing.status === 400 && missing.json.error === 'Preferred slot is required', 'required radio rejects a missing answer');
  for (const [answer, label] of [['Night', 'option from the later template edit'], ['Afternoon', 'unlisted option'], [['Morning', 'Evening'], 'array of options'], [{ value: 'Morning' }, 'object']] as const) {
    check((await submit({ slot: answer })).status === 400, `server rejects ${label}`);
  }
  check(await storedCount() === 0, 'no invalid response is stored');

  // AC4/AC6: a valid choice with an unanswered optional question persists and is reported.
  const accepted = await submit({ slot: 'Morning' });
  check(accepted.status === 201, 'valid radio answer accepted with optional question unanswered');
  const [row] = await sql`select answers from global_form_responses where campaign_id=${campaign.id} and user_id=${student.id}`;
  check(JSON.stringify(row.answers) === JSON.stringify({ slot: 'Morning' }), 'stored answer is the single chosen option');
  const responses = await request(`/global-forms/manage/campaigns/${campaign.id}/responses?page=1`, admin);
  check(responses.status === 200 && responses.json.responses[0]?.answers?.slot === 'Morning', 'response details expose the chosen option');

  console.log(`Global forms radio integration: ${checks} checks passed (synthetic data only).`);
  console.log(`Browser QA campaign: /register/${campaign.slug}`);
} finally {
  await sql.end();
}
