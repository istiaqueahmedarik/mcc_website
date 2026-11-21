import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePullRequest, checkPullRequest, reconcileOpenPullRequests } from './pr-convention.mjs';
const valid = {
  title: '#47: Preserve campaign assignments',
  body: '## Problem\nApproved board members lose their assignments.\n## Changes\nSynchronize the approved roster with board access.\n## Validation\nRan node tests and all policy tests passed.\n## Review notes\nRead the roster before the validator and tests; no migration needed.',
};

test('accepts #<num>, <KEY>-<num>, NO-ISSUE, rollout flags, and Revert titles', () => {
  for (const title of [
    '#1: Preserve campaign assignments',
    '#47: Preserve campaign assignments',
    '#47:Preserve campaign assignments',
    '#47: Preserve campaign assignments [+sql]',
    'MCC-12: Preserve campaign assignments',
    'AB-9: Preserve campaign assignments',
    'ABCDEFGHIJ-99: Preserve campaign assignments',
    'NO-ISSUE: Add DESIGN.md and CLAUDE.md',
    'Revert "#47: Preserve campaign assignments"',
  ]) {
    assert.deepEqual(validatePullRequest({ ...valid, title }), [], title);
  }
});
test('rejects malformed, unprefixed, zero-id, short, multiline, long, and punctuated titles', () => {
  for (const title of [
    'Update forms',
    'fix(forms): preserve campaign assignments',
    '#0: Preserve campaign assignments',
    'MCC-0: Preserve campaign assignments',
    'mcc-12: Preserve campaign assignments',
    'A-12: Preserve campaign assignments',
    'TOOLONGPREFIX-12: Preserve campaign assignments',
    '#47: short',
    '#47: short     ',
    '#47: Preserve campaign assignments.',
    '#47: Preserve\ncampaign assignments',
    '#47: Preserve\rcampaign assignments',
    `#47: ${'a'.repeat(100)}`,
    'Revert ""',
  ]) {
    assert.ok(validatePullRequest({ ...valid, title }).length, title);
  }
});
test('requires each section exactly once and useful content', () => {
  assert.equal(validatePullRequest({title:valid.title}).length, 4);
  assert.ok(validatePullRequest({...valid,body:valid.body+'\n## Changes\nAnother explanation with sufficient detail.'}).some(e=>e.includes('duplicate')));
  for (const placeholder of ['', 'TODO', 'TBD', 'N/A', '<!-- complete this section with a useful explanation -->', '- [ ] TODO']) {
    assert.ok(validatePullRequest({...valid,body:valid.body.replace('Ran node tests and all policy tests passed.',placeholder)}).some(e=>e.includes('Validation')));
  }
});
test('untouched template fails and explained non-applicability passes', () => {
  assert.equal(validatePullRequest({...valid,body:readFileSync(new URL('../.github/pull_request_template.md',import.meta.url),'utf8')}).length,4);
  assert.deepEqual(validatePullRequest({...valid,body:valid.body.replace('Ran node tests and all policy tests passed.','N/A: documentation only, manually checked all links and examples.')}),[]);
});
test('fenced headings and HTML comments cannot satisfy sections', () => {
  for (const fence of ['```','~~~~']) assert.equal(validatePullRequest({...valid,body:`${fence}md\n${valid.body}\n${fence}`}).length,4);
  assert.equal(validatePullRequest({...valid,body:`<!--\n${valid.body}\n-->`}).length,4);
});
test('supports CRLF, optional extra sections and executable text as plain data', () => {
  assert.deepEqual(validatePullRequest({...valid,body:valid.body.replaceAll('\n','\r\n')+'\r\n## Related issues\r\nFixes #123'}),[]);
  assert.deepEqual(validatePullRequest({...valid,title:'#47: Handle $(touch /tmp/should-not-exist) safely'}),[]);
});
function fakeApi(sequence, statuses, fail = false) {
  let i=0;
  return {paginate:async()=>[],rest:{pulls:{get:async()=>({data:sequence[Math.min(i++,sequence.length-1)]})},repos:{createCommitStatus:async s=>{if(fail)throw Error('API denied'); statuses.push(s);}}}};
}
const open = {...valid,state:'open',head:{sha:'head-sha'}};
test('publishes pending then success on current PR head', async()=>{
  const statuses=[];
  assert.deepEqual(await checkPullRequest(fakeApi([open],statuses),{owner:'owner',repo:'repo'},1,'https://example.com/run'),[]);
  assert.deepEqual(statuses.map(s=>[s.sha,s.state,s.context]),[['head-sha','pending','PR convention'],['head-sha','success','PR convention']]);
});
test('invalid metadata produces failure with actionable messages',async()=>{
  const statuses=[];
  assert.ok((await checkPullRequest(fakeApi([{...open,body:''}],statuses),{},1,'url')).length);
  assert.equal(statuses.at(-1).state,'failure');
});
test('metadata/head change during validation leaves pending instead of stale success',async()=>{
  for(const changed of [{...open,title:'wrong'},{...open,body:''},{...open,head:{sha:'new-sha'}}]){
    const statuses=[];
    assert.ok((await checkPullRequest(fakeApi([open,open,changed],statuses),{},1,'url')).length);
    assert.equal(statuses.at(-1).state,'pending');
    assert.equal(statuses.at(-1).sha,changed.head.sha);
  }
});
test('closed PRs are skipped and API failures propagate',async()=>{
  const statuses=[];
  assert.deepEqual(await checkPullRequest(fakeApi([{...open,state:'closed'}],statuses),{},1,'url'),[]);
  assert.equal(statuses.length,0);
  await assert.rejects(checkPullRequest(fakeApi([open],[],true),{},1,'url'),/API denied/);
});

test('an invalid open PR sharing the SHA prevents a passing status',async()=>{
  const statuses=[];
  const peer={...open,number:2,body:''};
  const api=fakeApi([open],statuses);
  api.paginate=async()=>[peer];
  api.rest.pulls.get=async({pull_number})=>({data:pull_number===2?peer:open});
  const errors=await checkPullRequest(api,{},1,'url');
  assert.ok(errors.some(e=>e.startsWith('PR #2:')));
  assert.equal(statuses.at(-1).state,'failure');
});

test('GitHub null descriptions produce actionable section errors',()=>{
  assert.equal(validatePullRequest({...valid,body:null}).length,4);
});
test('a fence with trailing text does not close an example',()=>{
  assert.equal(validatePullRequest({...valid,body:'```md\n```not-a-close\n'+valid.body+'\n```'}).length,4);
});

test('remaining PR passes after invalid peer moves to another commit',async()=>{
  const statuses=[];
  const moved={...open,number:2,body:'',head:{sha:'different-sha'}};
  const api=fakeApi([open],statuses);
  api.paginate=async()=>[moved];
  assert.deepEqual(await checkPullRequest(api,{},1,'url'),[]);
  assert.equal(statuses.at(-1).state,'success');
});

function fakeRepository(pullRequests, statuses) {
  const api = fakeApi(pullRequests, statuses);
  api.paginate = async () => pullRequests;
  api.rest.pulls.get = async ({ pull_number }) => ({
    data: pullRequests.find(({ number }) => number === pull_number),
  });
  return api;
}

test('a valid triggering PR keeps a passing job while unrelated errors are reported', async () => {
  const statuses = [];
  const api = fakeRepository([
    { ...open, number: 1 },
    { ...open, number: 2, body: '', head: { sha: 'unrelated-sha' } },
  ], statuses);

  const { failed, reports } = await reconcileOpenPullRequests(api, {}, 'url', 1);

  assert.equal(failed, false);
  assert.deepEqual(reports.map(({ number, errors }) => [number, errors.length]), [[1, 0], [2, 4]]);
  assert.deepEqual(statuses.filter(({ state }) => state !== 'pending').map(({ sha, state }) => [sha, state]), [
    ['head-sha', 'success'],
    ['unrelated-sha', 'failure'],
  ]);
});

test('an invalid triggering PR and a repository-wide run both fail', async () => {
  const statuses = [];
  const api = fakeRepository([{ ...open, number: 2, body: '' }], statuses);

  assert.equal((await reconcileOpenPullRequests(api, {}, 'url', 2)).failed, true);
  assert.equal((await reconcileOpenPullRequests(api, {}, 'url')).failed, true);
  assert.equal((await reconcileOpenPullRequests(api, {}, 'url', 3)).failed, false);
});

test('a valid triggering PR still fails when an invalid peer shares its head', async () => {
  const statuses = [];
  const api = fakeRepository([
    { ...open, number: 1 },
    { ...open, number: 2, body: '' },
  ], statuses);

  const { failed, reports } = await reconcileOpenPullRequests(api, {}, 'url', 1);

  assert.equal(failed, true);
  assert.ok(reports[0].errors.some(error => error.startsWith('PR #2:')));
  assert.equal(statuses.at(-1).state, 'failure');
});

test('an API error on an unrelated PR still fails reconciliation', async () => {
  const api = fakeRepository([
    { ...open, number: 1 },
    { ...open, number: 2, head: { sha: 'unrelated-sha' } },
  ], []);
  const getPull = api.rest.pulls.get;
  api.rest.pulls.get = async (params) => {
    if (params.pull_number === 2) throw new Error('API denied');
    return getPull(params);
  };

  await assert.rejects(reconcileOpenPullRequests(api, {}, 'url', 1), /API denied/);
});
