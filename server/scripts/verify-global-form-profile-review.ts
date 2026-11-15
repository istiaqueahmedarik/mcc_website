/** Review/delete regressions against disposable local PostgreSQL only. No email/provider access. */
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
    values(${`${crypto.randomUUID()}@forms.invalid`},${admin ? 'Synthetic Admin' : null},202614009,'SyntheticCF',true,'SyntheticVJ',true,${admin},true) returning *`;
  return { ...row, token: await sign({ id: row.id, email: row.email, exp: Math.floor(Date.now() / 1000) + 600 }, process.env.SECRET!) };
}
async function request(path: string, actor?: any, body?: unknown, method?: string) {
  const r = await app.request(path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { error: text }; }
  return { status: r.status, json };
}
try {
  const admin = await account(true), student = await account(), other = await account();
  const [starter] = await sql`select id from global_form_templates where built_in and kind='tfc'`;
  const cloned = await request(`/global-forms/manage/templates/${starter.id}/clone`, admin, {});
  const template = cloned.json.template;
  const campaign = (await request('/global-forms/manage/campaigns', admin, { title: 'Profile review QA', template_id: template.id })).json.campaign;
  await request(`/global-forms/manage/campaigns/${campaign.id}/start`, admin, {});
  async function register(actor: any) {
    const preview = await request(`/global-forms/public/${campaign.slug}/preview`, actor);
    const result = await request(`/global-forms/public/${campaign.slug}/submit`, actor, { answers: {}, profile_values: { full_name: 'Original Proposal' }, profile_version: preview.json.profile_version, agreement: true });
    check(result.status === 201, 'missing name creates pending registration review');
  }
  await register(student);
  check((await request('/user/basic/set', student, { full_name: 'Latest Proposal', phone: '1234' })).status === 200, 'ordinary profile edit succeeds during pending review');
  const [review] = await sql`select * from global_form_profile_reviews where user_id=${student.id} and status='pending'`;
  check(review.proposed_values.full_name === 'Latest Proposal' && review.prior_values.full_name === null, 'review follows current name and preserves null rejection baseline');
  check((await request('/auth/user/accept', admin, { userId: student.id })).status === 200, 'administrator can approve latest name without stale conflict');
  const [accepted] = await sql`select * from users where id=${student.id}`;
  check(accepted.granted && accepted.full_name === 'Latest Proposal', 'approval retains latest name');
  const [response] = await sql`select * from global_form_responses where user_id=${student.id}`;
  check(response.profile_values.full_name === 'Original Proposal', 'profile edits do not rewrite immutable submitted response');
  await register(other);
  await request('/user/basic/set', other, { full_name: 'Second Proposal' });
  await request('/user/basic/set', other, { phone: '5678' });
  await request('/user/basic/set', other, { full_name: 'Second Proposal' });
  const reviews = await sql`select * from global_form_profile_reviews where user_id=${other.id} and status='pending'`;
  check(reviews.length === 1 && reviews[0].proposed_values.full_name === 'Second Proposal' && reviews[0].prior_values.full_name === null, 'phone-only and no-op name edits keep one review and original baseline');
  check((await request('/auth/user/reject', admin, { userId: other.id })).status === 200, 'administrator can reject updated name');
  const [retained] = await sql`select * from users where id=${other.id}`;
  check(retained && retained.granted && retained.full_name === null, 'rejection restores prior absence and retains account');
  check((await request('/auth/user/reject', admin, { userId: other.id })).status === 409, 'repeated rejection cannot delete reviewed account');
  const stale = await account();
  await register(stale);
  await sql`update users set full_name='Previously Edited Name' where id=${stale.id}`;
  const migrationConnection = await sql.reserve();
  try { await migrationConnection.unsafe(await Bun.file(new URL('../../docs/sql/global-forms-review-followup-20261115.sql', import.meta.url)).text()); }
  finally { migrationConnection.release(); }
  const [repaired] = await sql`select * from global_form_profile_reviews where user_id=${stale.id} and status='pending'`;
  check(repaired.proposed_values.full_name === 'Previously Edited Name' && repaired.prior_values.full_name === null, 'migration repairs pre-existing mismatched proposal without changing rejection baseline');
  check((await request('/auth/user/accept', admin, { userId: stale.id })).status === 200, 'repaired historical proposal can be approved');
  check((await request(`/global-forms/manage/templates/${template.id}`, undefined, undefined, 'DELETE')).status === 401, 'anonymous cannot delete templates');
  check((await request(`/global-forms/manage/templates/${template.id}`, student, undefined, 'DELETE')).status === 403, 'student cannot delete templates');
  check((await request(`/global-forms/manage/templates/${starter.id}`, admin, undefined, 'DELETE')).status === 404, 'built-in starters cannot be deleted');
  check((await request(`/global-forms/manage/templates/${template.id}`, admin, undefined, 'DELETE')).status === 200, 'administrator deletes editable template');
  const [keptCampaign] = await sql`select * from global_form_campaigns where id=${campaign.id}`;
  check(keptCampaign.template_id === null && JSON.stringify(keptCampaign.fields) === JSON.stringify(campaign.fields), 'template deletion preserves frozen campaign definition');
  const [receiptCount] = await sql`select count(*)::int as count from global_form_responses where campaign_id=${campaign.id}`;
  check(receiptCount.count === 3, 'template deletion retains submitted responses');
  check((await request(`/global-forms/manage/templates/${template.id}`, admin, undefined, 'DELETE')).status === 404, 'deleted template no longer exists');
  console.log(`Profile review and template deletion: ${checks} checks passed (local synthetic data).`);
} finally { await sql.end(); }
