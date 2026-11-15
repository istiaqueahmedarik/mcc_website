/** Actual route/cache/trigger checks against disposable local Postgres only. */
import assert from 'node:assert/strict';
const target = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
if (!['127.0.0.1','localhost'].includes(target.hostname) || target.pathname !== '/forms_test') throw new Error('Disposable local forms_test database required');
process.env.SECRET='global-forms-local-integration-only';
const {default:sql}=await import('../src/db');
const {sign}=await import('hono/jwt');
const {createGlobalFormsTestApp}=await import('../tests/globalFormsTestApp');
const {buildScoredContestReport}=await import('../src/services/contestScoringService');
const {loadGlobalFormReportEligibility}=await import('../src/services/globalFormEligibilityService');
const {saveGlobalContestReportSnapshot, markGlobalContestReportsStale}=await import('../src/services/globalContestReportSnapshotService');
const app=createGlobalFormsTestApp();
let checks=0;
function check(condition:unknown,message:string){assert.ok(condition,message);checks++;}
async function user(admin=false){
  const [row]=await sql`insert into users(email,full_name,mist_id,cf_id,cf_verified,vjudge_id,vjudge_verified,admin,granted)
    values(${`report-${crypto.randomUUID()}@forms.invalid`},'Synthetic Report Student',202614009,'SyntheticCF',true,${crypto.randomUUID()},true,${admin},true) returning *`;
  return {...row,token:await sign({id:row.id,email:row.email,exp:Math.floor(Date.now()/1000)+600},process.env.SECRET!)};
}
async function request(path:string,actor:any,body?:unknown,method?:string){
  const response=await app.request(path,{method:method||(body===undefined?'GET':'POST'),headers:{Authorization:`Bearer ${actor.token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let json:any;try{json=JSON.parse(text);}catch{json={error:text};}
  return {status:response.status,json};
}
try{
  const admin=await user(true),one=await user(),two=await user();
  const [template]=await sql`select id from global_form_templates where kind='general' and built_in`;
  const created=await request('/global-forms/manage/campaigns',admin,{template_id:template.id,title:'Report cohort fixture'});
  check(created.status===201 && created.json.campaign.slug,'admin can create a campaign without manually supplying a slug');
  const campaign=created.json.campaign;
  await request(`/global-forms/manage/campaigns/${campaign.id}/start`,admin,{});
  async function register(actor:any){const preview=await request(`/global-forms/public/${campaign.slug}/preview`,actor);return request(`/global-forms/public/${campaign.slug}/submit`,actor,{answers:{},profile_values:{},agreement:true,profile_version:preview.json.profile_version});}
  check((await register(one)).status===201,'first cohort respondent registered');
  const [room]=await sql`insert into "Contest_report_room"("Room Name") values('Synthetic cohort report') returning *`;
  const [item]=await sql`insert into "Contest_room_contests"(room_id,contest_id,provider,contest_name,formula_key) values(${room.id},'424242','vjudge','Synthetic saved source','c424242') returning *`;
  const team=(actor:any,solved:number)=>({identityKey:`student:${actor.id}`,studentId:actor.id,username:actor.vjudge_id,realName:actor.full_name,solvedCount:solved,finalScore:solved,penalty:solved*60,submissions:[],classroomMapping:{targetType:'student',studentId:actor.id,student:{id:actor.id,name:actor.full_name,mistId:String(actor.mist_id),vjudgeId:actor.vjudge_id}}});
  const rankData={contestInfo:{id:'vjudge:424242',title:'Synthetic saved source'},teams:[team(one,2),team(two,4),{username:'unmapped',realName:'Unmapped',solvedCount:5,finalScore:5,penalty:1,submissions:[]}]};
  const report=buildScoredContestReport({roomId:room.id,roomName:room['Room Name'],scope:'global',sources:[{itemId:item.id,contestKey:'vjudge:424242',formulaKey:'c424242',title:'Synthetic saved source',provider:'vjudge',externalContestId:'424242',weight:1,sortOrder:0,rankData,demerits:[]}]});
  await saveGlobalContestReportSnapshot({roomId:room.id,contestItemId:null,report,sourceSnapshots:{[item.id]:{rankData,savedAt:new Date().toISOString()}},missingContests:[],scoringConfigVersion:0,generatedBy:admin.id,eligibilityCampaignId:null,eligibilityMembershipRevision:null,eligibilitySelectionVersion:0});
  check((await request(`/contest-room/${room.id}/report-eligibility`,one)).status===401,'student cannot manage report eligibility');
  const all=await request(`/contest-room/${room.id}/report`,admin,{});
  check(all.status===200 && all.json.merged.users.length===3,'no-filter report preserves all participant rows');
  check((await request(`/contest-room/${room.id}/report-eligibility`,admin,{campaignId:campaign.id},'PUT')).status===200,'campaign cohort selection saved');
  check((await request(`/contest-room/${room.id}/publish`,admin,{})).status===409,'stale full report cannot publish after cohort changes');
  // Any accidental provider request now fails the test instead of hitting the internet.
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(()=>{throw new Error('Provider/network fetch is forbidden for cohort-only regeneration');}) as typeof fetch;
  let filtered:any;
  try{filtered=await request(`/contest-room/${room.id}/report`,admin,{});}finally{globalThis.fetch=originalFetch;}
  check(filtered.status===200 && filtered.json.merged.users.length===1,'cohort regenerated from cached source data');
  check(filtered.json.merged.users[0].identityKey===`student:${one.id}` && filtered.json.merged.users[0].rank===1,'canonical respondent receives cohort rank one');
  check(filtered.json.eligibility.unmappedCount===1 && filtered.json.eligibility.excludedCount===1,'unmapped and nonrespondent counts remain explicit');
  const published=await request(`/contest-room/${room.id}/publish`,admin,{});
  check(published.status===200 && published.json.merged.users.length===1,'publication uses same cohort snapshot');
  check((await register(two)).status===201,'new respondent joins open campaign');
  const [stale]=await sql`select is_stale from "Public_contest_report" where "Shared_contest_id"=${room.id}`;
  check(stale.is_stale===true,'response revision trigger marks public report stale');
  check((await request(`/contest-room/${room.id}/publish`,admin,{})).status===409,'publication rejects outdated membership revision');
  const regenerated=await request(`/contest-room/${room.id}/report`,admin,{});
  check(regenerated.status===200 && regenerated.json.merged.users.length===2,'new response membership regenerates without provider access');
  const sources=await sql`select source_snapshots from global_contest_report_snapshots where room_id=${room.id}`;
  check(sources[0].source_snapshots[item.id].rankData.teams.length===3,'raw source snapshot remains unfiltered');
  const empty=await request('/global-forms/manage/campaigns',admin,{template_id:template.id,title:'Empty cohort'});
  await request(`/contest-room/${room.id}/report-eligibility`,admin,{campaignId:empty.json.campaign.id},'PUT');
  const emptyReport=await request(`/contest-room/${room.id}/report`,admin,{});
  check(emptyReport.status===200 && emptyReport.json.merged.users.length===0,'empty campaign produces empty report without fallback');
  await request(`/contest-room/${room.id}/report-eligibility`,admin,{campaignId:null},'PUT');
  const restored=await request(`/contest-room/${room.id}/report`,admin,{});
  check(restored.status===200 && restored.json.merged.users.length===3,'removing cohort restores full provider input');
  // A filter-only regeneration must retain provider failure provenance.
  const failure={id:item.id,provider:'vjudge',contestId:'424242',title:'Synthetic saved source',statusCode:503,code:'SYNTHETIC_PROVIDER_FAILURE',usedSavedData:true,savedAt:new Date().toISOString()};
  await sql`update global_contest_report_snapshots set missing_contests=${sql.json([failure])} where room_id=${room.id}`;
  await request(`/contest-room/${room.id}/report-eligibility`,admin,{campaignId:campaign.id},'PUT');
  const failedSelection=await request(`/contest-room/${room.id}/report`,admin,{});
  check(failedSelection.status===200 && failedSelection.json.missingContests?.[0]?.code===failure.code && failedSelection.json.missingContests[0].usedSavedData===true,'filter change retains saved provider failure metadata');
  check((await request(`/contest-room/${room.id}/publish`,admin,{})).status===409,'provider failure still blocks publication after changing form filter');
  const third=await user();await register(third);
  const failedMembership=await request(`/contest-room/${room.id}/report`,admin,{});
  check(failedMembership.status===200 && failedMembership.json.missingContests?.[0]?.code===failure.code,'new response retains saved provider failure metadata');
  check((await request(`/contest-room/${room.id}/publish`,admin,{})).status===409,'provider failure still blocks publication after membership changes');

  // Use the real mapping replacement handler to invalidate a previously mapped source.
  let mappedMistId=300000000+(Date.now()%600000000);
  while ((await sql`select id from users where mist_id in (${mappedMistId},${mappedMistId+1})`).length) mappedMistId+=2;
  await sql`update users set mist_id=${mappedMistId} where id=${one.id}`;
  await sql`update users set mist_id=${mappedMistId+1} where id=${two.id}`;
  await sql`update "Contest_room_contests" set provider='codeforces',contest_id='group:QA:424242',codeforces_source_type='group',codeforces_group_identity_mode='csv' where id=${item.id}`;
  const currentEligibility=await loadGlobalFormReportEligibility(room.id);
  await saveGlobalContestReportSnapshot({roomId:room.id,contestItemId:null,report,sourceSnapshots:{[item.id]:{rankData:{...rankData,teams:[{...team(one,2),username:'GroupStudent'}]},savedAt:new Date().toISOString()}},missingContests:[],scoringConfigVersion:0,generatedBy:admin.id,eligibilityCampaignId:currentEligibility.campaignId,eligibilityMembershipRevision:currentEligibility.membershipRevision,eligibilitySelectionVersion:currentEligibility.selectionVersion});
  const mapped=await request('/contest-room-contests/codeforces-identity-mapping/replace',admin,{contest_room_contest_id:item.id,codeforces_group_identity_mode:'csv',mapping_csv:`username,student_id\nGroupStudent,${mappedMistId+1}`});
  check(mapped.status===200,'administrator corrects group CSV identity mapping through actual route');
  await request(`/contest-room/${room.id}/report-eligibility`,admin,{campaignId:empty.json.campaign.id},'PUT');
  const invalidated=await request(`/contest-room/${room.id}/report`,admin,{});
  check(invalidated.status===409 && invalidated.json.code==='REPORT_INPUTS_STALE','mapping invalidation cannot be cleared by changing form filter');
  check((await request(`/contest-room/${room.id}/publish`,admin,{})).status===409,'old canonical identities remain blocked from publication');
  const [inputVersion]=await sql`select report_input_revision from "Contest_report_room" where id=${room.id}`;
  await sql.begin(tx=>markGlobalContestReportsStale(tx,[room.id]));
  const latestEligibility=await loadGlobalFormReportEligibility(room.id);
  let raced=false;
  try {await saveGlobalContestReportSnapshot({roomId:room.id,contestItemId:null,report,missingContests:[],scoringConfigVersion:0,generatedBy:admin.id,inputRevision:Number(inputVersion.report_input_revision),eligibilityCampaignId:latestEligibility.campaignId,eligibilityMembershipRevision:latestEligibility.membershipRevision,eligibilitySelectionVersion:latestEligibility.selectionVersion});}catch(error:any){raced=error.code==='REPORT_INPUTS_CHANGED';}
  check(raced,'concurrent report input invalidation rejects an older generation at commit');
  console.log(`Global form report integration: ${checks} checks passed (synthetic source snapshots, no provider access).`);
}finally{await sql.end();}
