/**
 * Run only against the explicitly provisioned, disposable local forms_test DB.
 * Apply tests/fixtures/global-forms-baseline.sql and both feature migrations first.
 * No hosted connections, real accounts, provider fetches, or email are used.
 */
import assert from 'node:assert/strict';

const target = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/forms_test') {
  throw new Error('Integration checks require the disposable local forms_test database');
}
process.env.SECRET = 'global-forms-local-integration-only';
const { default: sql } = await import('../src/db');
const { sign } = await import('hono/jwt');
const { createGlobalFormsTestApp } = await import('../tests/globalFormsTestApp');
const app = createGlobalFormsTestApp();
let checks = 0;
function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  checks += 1;
}
async function account(label: string, extra: Record<string, unknown> = {}) {
  const [row] = await sql`insert into users ${sql({
    email: `${label}-${crypto.randomUUID()}@forms.invalid`, full_name: 'Synthetic Student',
    mist_id: 202614001, cf_id: 'SyntheticCF', cf_verified: true,
    vjudge_id: 'SyntheticVJ', vjudge_verified: true, granted: true, ...extra,
  })} returning *`;
  return { ...row, token: await sign({ id: row.id, email: row.email, exp: Math.floor(Date.now()/1000)+600 }, process.env.SECRET!) };
}
async function request(path: string, user?: any, body?: unknown, method?: string) {
  const response = await app.request(path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { ...(user ? { Authorization: `Bearer ${user.token}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: text }; }
  return { status: response.status, json };
}

try {
  const admin = await account('admin', { admin: true });
  const student = await account('student', { mist_id: 123, cf_id: null, cf_verified: false });
  const other = await account('other');
  const trainer = await account('trainer', { trainer: true });
  check((await request('/global-forms/manage/templates')).status === 401, 'anonymous cannot manage');
  check((await request('/global-forms/manage/templates', student)).status === 403, 'student cannot manage');
  check((await request('/global-forms/manage/templates', trainer)).status === 403, 'trainer cannot manage');
  const templates = await request('/global-forms/manage/templates', admin);
  check(templates.status === 200 && templates.json.templates.length >= 2, 'admin gets seeded templates');
  const tfc = templates.json.templates.find((item: any) => item.kind === 'tfc' && item.built_in);
  check(Boolean(tfc), 'TFC starter exists');
  check((await request('/global-forms/manage/templates', admin, { title: 'Bad', kind: 'general', fields: [{ id:'role',label:'Role',type:'text',mapUserField:'admin' }] })).status === 400, 'unsafe profile mappings rejected');
  const clone = await request(`/global-forms/manage/templates/${tfc.id}/clone`, admin, {});
  check(clone.status === 201 && clone.json.template.id !== tfc.id, 'template clones into a new identity');
  const slug = `integration-${crypto.randomUUID()}`;
  const created = await request('/global-forms/manage/campaigns', admin, { template_id: tfc.id, title: 'Synthetic TFC registration', slug });
  check(created.status === 201, 'campaign created');
  const campaign = created.json.campaign;
  const publicInfo = await request(`/global-forms/public/${slug}`);
  check(publicInfo.status === 200 && !publicInfo.json.profile && !publicInfo.json.campaign.fields, 'public metadata omits private data and fields');
  check((await request(`/global-forms/public/${slug}/preview`)).status === 401, 'preview requires authentication');
  check((await request(`/global-forms/public/${slug}/preview`, admin)).status === 403, 'admin preview cannot become student registration');
  check((await request(`/global-forms/manage/campaigns/${campaign.id}/start`, admin, {})).status === 200, 'campaign opened');
  let preview = await request(`/global-forms/public/${slug}/preview`, student);
  check(preview.json.required_fields.some((field: any) => field.mapUserField === 'mist_id'), 'invalid historical ID requires correction');
  for (const session_id of ['tab-one', 'tab-two']) await request(`/global-forms/public/${slug}/heartbeat`, student, { session_id, active: true });
  let stats = await request(`/global-forms/manage/dashboard?campaign_id=${campaign.id}`, admin);
  check(stats.json.active === 1, 'active count deduplicates browser tabs');
  await sql`update global_form_presence set last_seen_at=now()-interval '61 seconds' where campaign_id=${campaign.id}`;
  stats = await request(`/global-forms/manage/dashboard?campaign_id=${campaign.id}`, admin);
  check(stats.json.active === 0, 'expired heartbeats do not count');
  const submission = { answers: {}, profile_values: { mist_id:'202614001', cf_id:'NewSyntheticCF' }, profile_version: preview.json.profile_version, agreement:true };
  check((await request(`/global-forms/public/${slug}/submit`, student, { ...submission, agreement:false })).status === 400, 'agreement required');
  check((await request(`/global-forms/public/${slug}/submit`, student, { ...submission, profile_values:{mist_id:'12345678',cf_id:'NewSyntheticCF'} })).status === 400, 'eight-digit ID rejected');
  check((await request('/user/mist-id/set', student, { mist_id:'1e8' })).status === 400, 'self-service ID rejects exponent notation');
  const concurrent = await Promise.all([request(`/global-forms/public/${slug}/submit`, student, submission),request(`/global-forms/public/${slug}/submit`, student, submission)]);
  check(concurrent.every(result => [200,201].includes(result.status)), 'concurrent duplicate submits receive a receipt');
  check(concurrent[0].json.receipt.id === concurrent[1].json.receipt.id, 'duplicates return the same receipt');
  const [saved] = await sql`select * from users where id=${student.id}`;
  check(String(saved.mist_id) === '202614001' && saved.cf_id === 'NewSyntheticCF' && saved.cf_verified === false, 'new profile data persists unverified');
  check(saved.vjudge_id === 'SyntheticVJ' && saved.vjudge_verified === true, 'known verified handle stays verified');
  const [count] = await sql`select count(*)::int as count from global_form_responses where campaign_id=${campaign.id}`;
  check(count.count === 1, 'database contains one response');
  stats = await request(`/global-forms/manage/dashboard?campaign_id=${campaign.id}`, admin);
  check(stats.json.submitted === 1 && stats.json.active === 0 && stats.json.revision === 1, 'dashboard reconciles response and revision');
  const responses = await request(`/global-forms/manage/campaigns/${campaign.id}/responses?q=Synthetic&page=1`, admin);
  check(responses.status === 200 && responses.json.total === 1, 'response search and pagination work');
  check((await request(`/global-forms/manage/campaigns/${campaign.id}`, admin, {title:'Mutated',slug},'PUT')).status >= 400, 'open campaign cannot be edited');
  check((await request(`/global-forms/manage/campaigns/${campaign.id}/end`, admin, {})).status === 200, 'campaign ended');
  const clonedCampaign = await request(`/global-forms/manage/campaigns/${campaign.id}/clone`,admin,{});
  check(clonedCampaign.status===201 && clonedCampaign.json.campaign.status==='draft' && clonedCampaign.json.campaign.revision===0,'ended campaign clones into an empty draft');
  preview = await request(`/global-forms/public/${slug}/preview`, other);
  check((await request(`/global-forms/public/${slug}/submit`, other, { answers:{},profile_values:{},profile_version:preview.json.profile_version,agreement:true })).status === 409, 'closed campaign blocks new submit');
  check((await request(`/global-forms/public/${slug}/submit`, student, submission)).json.receipt.id === concurrent[0].json.receipt.id, 'lost receipt can be recovered after closure');

  const second = await request('/global-forms/manage/campaigns', admin, {template_id:tfc.id,title:'Profile race check',slug:`race-${crypto.randomUUID()}`});
  const secondCampaign = second.json.campaign;
  await request(`/global-forms/manage/campaigns/${secondCampaign.id}/start`,admin,{});
  preview = await request(`/global-forms/public/${secondCampaign.slug}/preview`,other);
  await sql`update users set phone='changed after preview' where id=${other.id}`;
  check((await request(`/global-forms/public/${secondCampaign.slug}/submit`,other,{answers:{},profile_values:{},profile_version:preview.json.profile_version,agreement:true})).status===409,'stale profile preview rejected');

  const missingName = await account('missing-name',{full_name:null});
  preview = await request(`/global-forms/public/${secondCampaign.slug}/preview`,missingName);
  const nameResult = await request(`/global-forms/public/${secondCampaign.slug}/submit`,missingName,{answers:{},profile_values:{full_name:'New Name'},profile_version:preview.json.profile_version,agreement:true});
  check(nameResult.status===201,'missing name can be supplied through form');
  const [namePending] = await sql`select * from users where id=${missingName.id}`;
  check(namePending.granted===false && namePending.account_review_origin==='profile_change','name completion enters profile-specific review');
  check((await request('/auth/user/reject',admin,{userId:missingName.id})).status===200,'profile review can reject');
  const [retained] = await sql`select * from users where id=${missingName.id}`;
  check(retained && retained.granted===true && retained.full_name===null,'profile rejection retains account and restores prior name');
  check((await request('/auth/user/reject',admin,{userId:missingName.id})).status===409,'stale repeated rejection cannot delete an existing account');
  const [retainedResponse] = await sql`select count(*)::int as count from global_form_responses where campaign_id=${secondCampaign.id} and user_id=${missingName.id}`;
  check(retainedResponse.count===1,'profile rejection preserves registration history');

  const streamResponse = await app.request(`/global-forms/manage/stream?campaign_id=${campaign.id}`,{headers:{Authorization:`Bearer ${admin.token}`}});
  check(streamResponse.headers.get('content-type')?.includes('text/event-stream'),'dashboard returns an SSE stream');
  const reader = streamResponse.body!.getReader();
  const firstEvent = new TextDecoder().decode((await reader.read()).value);
  check(firstEvent.includes('event: stats') && !firstEvent.includes(student.email),'SSE sends counts without student data');
  await sql`update users set admin=false where id=${admin.id}`;
  const nextEvent = new TextDecoder().decode((await reader.read()).value);
  check(nextEvent.includes('unauthorized'),'SSE rechecks admin role after permission revocation');
  await reader.cancel();

  const privileges = await sql`select relname,relrowsecurity,has_table_privilege('anon',oid,'SELECT') as anon_select,has_table_privilege('authenticated',oid,'SELECT') as auth_select from pg_class where relnamespace='public'::regnamespace and relname like 'global_form_%' and relkind='r'`;
  check(privileges.every(row=>row.relrowsecurity && !row.anon_select && !row.auth_select),'new form tables have RLS and no public client read grant');
  console.log(`Global forms local integration: ${checks} checks passed (synthetic data only).`);
} finally {
  await sql.end();
}
