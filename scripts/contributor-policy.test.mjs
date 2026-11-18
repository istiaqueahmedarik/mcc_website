import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePolicy, disallowedAssignees, scoreIssues, renderScorecard, listIssues, reconcileAssignments, createApi, applyPolicy } from './contributor-policy.mjs';
const policy = { repository: 'owner/repo', projectUrl: 'https://github.com/users/owner/projects/3', membershipVerifiedOn: '2026-11-16', owner: 'Owner', members: ['Owner', 'Member'], dashboardIssueNumber: 99 };
const issue = (overrides = {}) => ({ number: 1, state: 'closed', state_reason: 'completed', labels: ['points:accepted','sp:5','type:feature'], assignees: [{login:'Member'}], ...overrides });
test('invalid or empty rosters fail instead of removing everyone', () => {
  for (const p of [{...policy,members:[]},{...policy,members:['Member']},{...policy,members:['Owner','owner']},{...policy,members:['Owner','[unsafe]']}]) assert.throws(() => validatePolicy(p));
  assert.equal(validatePolicy(policy),policy);
});
test('only approved member assignees qualify, case insensitive', () => {
  assert.deepEqual(disallowedAssignees([{login:'OWNER'},{login:'member'},{login:'Outsider'}],policy),['Outsider']);
});
test('credits types and totals once per completed accepted issue', () => {
  const result=scoreIssues([issue(),issue(),issue({number:2,labels:['points:accepted','sp:3','type:bug']})],policy);
  const row=result.rows[1]; assert.equal(row.total,8);assert.equal(row.count,2);assert.equal(row.types.feature.points,5);assert.equal(row.types.bug.points,3);
  assert.equal(result.rows[0].total,0);
});
test('unaccepted work, PRs and dashboard never earn credit', () => {
  const r=scoreIssues([issue({labels:['sp:5','type:feature']}),issue({number:2,pull_request:{}}),issue({number:99})],policy);
  assert.equal(r.rows[1].total,0);assert.equal(r.excluded.length,0);
});
test('reopened and not-planned issues do not earn credit', () => {
  const r=scoreIssues([issue({state:'open',state_reason:null}),issue({number:2,state_reason:'not_planned'})],policy);
  assert.equal(r.rows[1].total,0);assert.equal(r.excluded.length,2);
});
test('shared and ambiguous attribution is excluded, not double-counted', () => {
  const bad=[issue({labels:['points:accepted','sp:5','type:feature','points:shared']}),issue({number:2,assignees:[{login:'Owner'},{login:'Member'}]}),issue({number:3,assignees:[{login:'Outsider'}]}),issue({number:4,assignees:[]})];
  const r=scoreIssues(bad,policy);assert.equal(r.excluded.length,4);assert.ok(r.rows.every(x=>x.total===0));
});
test('missing, duplicate, noncanonical and unknown points or types require review', () => {
  for (const labels of [['points:accepted','type:feature'],['points:accepted','sp:5','sp:8','type:feature'],['points:accepted','sp:05','type:feature'],['points:accepted','sp:99','type:feature'],['points:accepted','sp:5'],['points:accepted','sp:5','type:feature','type:bug'],['points:accepted','sp:5','type:unknown']]) {
    const r=scoreIssues([issue({labels})],policy);assert.equal(r.rows[1].total,0);assert.equal(r.excluded.length,1);
  }
});
test('reconciles fresh API assignments and only removes nonmembers', async () => {
  const calls=[];
  const api=async(path,options)=>{calls.push({path,options});return {assignees:[{login:'Member'},{login:'NewOutsider'}]};};
  await reconcileAssignments(api,[issue({assignees:[{login:'OldOutsider'}]})],policy);
  assert.deepEqual(calls[1],{path:'/issues/1/assignees',options:{method:'DELETE',body:{assignees:['NewOutsider']}}});
});
test('PR assignments are outside this issue policy', async () => {
  await reconcileAssignments(()=>assert.fail('must not call API'),[issue({pull_request:{}})],policy);
});
test('pagination includes issues beyond first page',async()=>{
  const calls=[];const items=await listIssues(async path=>{calls.push(path);return calls.length===1?Array.from({length:100},(_,i)=>({number:i+1})):[{number:101}];});
  assert.equal(items.length,101);assert.equal(calls.length,2);
});
test('API errors omit response body and credentials',async()=>{
  const api=createApi({repository:'owner/repo',token:'do-not-print',fetcher:async()=>({ok:false,status:403})});
  await assert.rejects(api('/issues'),e=>!e.message.includes('do-not-print')&&e.message.includes('403'));
});
test('scorecard includes zero-point members and issue links',()=>{
  const text=renderScorecard([issue()],policy);
  assert.ok(text.includes('| @Owner | 0 / 0'));assert.ok(text.includes('[#1](https://github.com/owner/repo/issues/1)'));assert.ok(text.includes('not an immutable historical ledger'));
});

test('onboarding and reusable templates never earn contribution credit',()=>{
 const r=scoreIssues([issue({labels:['onboarding','points:accepted','sp:5','type:documentation']}),issue({number:2,labels:['template','points:accepted','sp:5','type:documentation']})],policy);
 assert.equal(r.rows[1].total,0);assert.equal(r.excluded.length,0);
});

test('disabled publishing still enforces assignments without accessing or creating a dashboard',async()=>{
 const calls=[];let assigned=[{login:'Member'},{login:'Outsider'}];
 const api=async(path,options={})=>{
  calls.push({path,...options});
  if(path.startsWith('/issues?'))return [issue({state:'open',assignees:assigned})];
  if(path==='/issues/1'&&!options.method)return issue({state:'open',assignees:assigned});
  if(path==='/issues/1/assignees'&&options.method==='DELETE'){assigned=assigned.filter(x=>!options.body.assignees.includes(x.login));return {};}
  assert.fail('Unexpected dashboard mutation: '+path);
 };
 const r=await applyPolicy(api,{...policy,dashboardIssueNumber:0});
 assert.deepEqual(r.removed,[{number:1,assignees:['Outsider']}]);
 assert.deepEqual(assigned,[{login:'Member'}]);
 assert.ok(!calls.some(c=>c.path==='/issues/0'||c.method==='POST'||c.method==='PATCH'));
});
test('active publishing updates the configured dashboard',async()=>{
 const calls=[];const api=async(path,options={})=>{
  calls.push({path,...options});
  if(path.startsWith('/issues?'))return [];
  if(path==='/issues/99'&&!options.method)return {body:'old'};
  if(path==='/issues/99'&&options.method==='PATCH')return {};
  assert.fail(path);
 };
 await applyPolicy(api,policy);
 assert.equal(calls.filter(c=>c.method==='PATCH').length,1);
});
test('genuine assignment API errors still fail visibly',async()=>{
 const api=async(path)=>{if(path.startsWith('/issues?'))return [issue()];throw Error('API denied');};
 await assert.rejects(applyPolicy(api,{...policy,dashboardIssueNumber:0}),/API denied/);
});
test('invalid policy fails before any API calls',async()=>{
 await assert.rejects(applyPolicy(()=>assert.fail('API must not be called'),{...policy,members:[]}),/Invalid policy/);
});
