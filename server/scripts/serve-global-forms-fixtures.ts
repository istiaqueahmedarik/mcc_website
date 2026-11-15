/** Local browser QA with real handlers and synthetic data. Never use a hosted DB. */
const target = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/forms_test') {
  throw new Error('Browser fixtures require the disposable local forms_test database');
}
process.env.SECRET = 'global-forms-local-integration-only';
const { default: sql } = await import('../src/db');
const { createGlobalFormsTestApp } = await import('../tests/globalFormsTestApp');
const app = createGlobalFormsTestApp();
const password = await Bun.password.hash('forms-qa-password');
for (const [id,email,extra] of [
  ['11111111-1111-4111-8111-111111111111','qa-admin@forms.invalid',{admin:true,full_name:'QA Administrator'}],
  ['22222222-2222-4222-8222-222222222222','qa-student@forms.invalid',{admin:false,full_name:'QA Student',mist_id:123,cf_id:null,cf_verified:false}],
  ['33333333-3333-4333-8333-333333333333','qa-complete@forms.invalid',{admin:false,full_name:'QA Complete Student'}],
] as const) {
  await sql`insert into users ${sql({
    id,email,password,full_name:'Synthetic QA',admin:false,trainer:false,granted:true,
    mist_id:202614009,cf_id:'SyntheticCF',cf_verified:true,vjudge_id:'SyntheticVJ',vjudge_verified:true,...extra,
  })} on conflict (id) do nothing`;
}
const [template] = await sql`select * from global_form_templates where kind='tfc' and built_in limit 1`;
const slug = `qa-tfc-${Date.now()}`;
const [campaign] = await sql`
  insert into global_form_campaigns(template_id,title,description,slug,kind,fields,agreement_text,status,started_at,created_by)
  values(${template.id},'TFC · Autumn registration','Review your MCC profile and join the next TFC campaign.',${slug},'tfc',${sql.json(template.fields)},${template.agreement_text},'open',now(),'11111111-1111-4111-8111-111111111111') returning id,slug
`;
app.get('/qa/manifest',c=>c.json({campaign,admin:'qa-admin@forms.invalid',student:'qa-student@forms.invalid',complete:'qa-complete@forms.invalid'}));
const server = Bun.serve({hostname:'127.0.0.1',port:55441,fetch:app.fetch});
console.log(`Synthetic forms API listening at ${server.url}`);
process.on('SIGINT',async()=>{server.stop(true);await sql.end();process.exit(0);});
