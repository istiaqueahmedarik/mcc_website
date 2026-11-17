import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, selectMembers, marker, renderTemplate, existingIssue, replaceLinks, reconcileOnboarding, STEPS } from './onboard-members.mjs';
const policy = { repository:'owner/repo', projectUrl:'https://github.com/users/owner/projects/3',membershipVerifiedOn:'2026-11-17',owner:'Owner',members:['Owner','Existing','NewMember'],dashboardIssueNumber:54 };
const config = {version:1,baselineMembers:['Owner','Existing'],defaultMentor:'Owner'};
const templates = Object.fromEntries(['epic',...STEPS].map(step=>[step,step==='epic'?'Member {{member}} / {{mentor}} / {{start_date}}\n<!-- onboarding-links:start -->\n{{child_links}}\n<!-- onboarding-links:end -->':'{{member}}: {{epic_url}} with {{mentor}}']));
function fixture({failCreateAt=0,failLink=false,ignoreAssignment=false}={}) {
  const issues=[],links=new Map(),calls=[]; let creates=0,linkFailed=false;
  const copy=x=>structuredClone(x);
  const api=async(path,{method='GET',body}={})=>{
    calls.push({path,method,body});
    if(path==='/issues'&&method==='POST') {
      const number=issues.length+1;
      const item={id:number+100,number,title:body.title,body:body.body,labels:body.labels,user:{login:'github-actions[bot]'},state:'open',assignees:[],html_url:`https://github.com/owner/repo/issues/${number}`};issues.push(item);
      if(++creates===failCreateAt)throw Error('Simulated lost response after successful creation');
      return copy(item);
    }
    const n=Number(path.match(/^\/issues\/(\d+)/)?.[1]);const item=issues.find(i=>i.number===n);
    if(path.includes('/sub_issues')) {
      if(method==='GET')return [...(links.get(n)??[])].map(id=>copy(issues.find(i=>i.id===id)));
      if(failLink&&!linkFailed){linkFailed=true;throw Error('Simulated attachment failure');}
      links.set(n,new Set([...(links.get(n)??[]),body.sub_issue_id]));return {};
    }
    if(path.endsWith('/assignees')){if(!ignoreAssignment)item.assignees=body.assignees.map(login=>({login}));return copy(item);}
    if(method==='PATCH'){item.body=body.body;return copy(item);}
    if(method==='GET'&&item)return copy(item);
    throw Error(`Unexpected request: ${method} ${path}`);
  };
  const run=(extra={})=>reconcileOnboarding({api,policy,config,templates,issues:copy(issues),date:'2026-11-17',...extra});
  return {api,issues,links,calls,run};
}
test('targets only new roster members; manual request can include baseline members',()=>{
 assert.deepEqual(selectMembers(policy,config),['NewMember']);assert.deepEqual(selectMembers(policy,config,'existing'),['Existing']);
 assert.throws(()=>selectMembers(policy,config,'outsider'));assert.throws(()=>selectMembers(policy,config,'$(bad)'));
});
test('rejects invalid config and unapproved mentor before any mutation',async()=>{
 assert.throws(()=>validateConfig({...config,version:2},policy));assert.throws(()=>validateConfig({...config,defaultMentor:'outsider'},policy));
 const f=fixture();await assert.rejects(f.run({mentor:'outsider'}));assert.equal(f.calls.length,0);
});
test('renderer rejects missing values and leaves no execution interpretation',()=>{
 assert.throws(()=>renderTemplate('{{missing}}',{}));assert.equal(renderTemplate('{{member}}',{member:'abc'}),'abc');
});
test('creates one epic and four labelled native sub-issues with assignments',async()=>{
 const f=fixture();const result=await f.run();assert.equal(f.issues.length,5);assert.equal(f.links.get(1).size,4);assert.equal(result[0].tickets.length,5);
 assert.ok(f.issues.every(i=>i.labels.includes('onboarding')&&i.assignees[0].login==='NewMember'));
 assert.ok(!f.calls.some(c=>c.path.includes('projects')));assert.ok(f.issues.slice(1).every(i=>i.body.includes('/issues/1')));
});
test('rerun creates no duplicates or duplicate relationships',async()=>{
 const f=fixture();await f.run();const count=f.calls.filter(c=>c.method==='POST').length;await f.run();assert.equal(f.issues.length,5);assert.equal(f.calls.filter(c=>c.method==='POST').length,count);
});
test('recovers a partial creation even when the response was lost',async()=>{
 const f=fixture({failCreateAt:3});await assert.rejects(f.run());assert.equal(f.issues.length,3);await f.run();assert.equal(f.issues.length,5);assert.equal(f.links.get(1).size,4);
});
test('repairs parent links independently of existing tickets',async()=>{
 const f=fixture({failLink:true});await assert.rejects(f.run());assert.equal(f.issues.length,5);await f.run();assert.equal(f.issues.length,5);assert.equal(f.links.get(1).size,4);
});
test('preserves closed children, learner notes and epic content outside managed links',async()=>{
 const f=fixture();await f.run();f.issues[1].state='closed';f.issues[1].body+='\nLearner evidence checked.';f.issues[0].body+='\nMentor sign-off retained.';
 await f.run();assert.equal(f.issues[1].state,'closed');assert.ok(f.issues[1].body.endsWith('Learner evidence checked.'));assert.ok(f.issues[0].body.endsWith('Mentor sign-off retained.'));
});
test('fails duplicate trusted markers before any write',async()=>{
 const f=fixture();await f.run();f.issues.push({...f.issues[0],id:999,number:999});f.calls.length=0;await assert.rejects(f.run(),/Duplicate/);assert.equal(f.calls.length,0);
});
test('ignores marker spoofed by an untrusted issue author and ignores PRs',()=>{
 const body=marker('NewMember','epic');assert.equal(existingIssue([{body,user:{login:'outsider'}}],policy,'NewMember','epic'),undefined);
 assert.equal(existingIssue([{body,user:{login:'Owner'},pull_request:{}}],policy,'NewMember','epic'),undefined);
});
test('reports silently ignored assignments rather than claiming success',async()=>{
 const f=fixture({ignoreAssignment:true});const r=await f.run();assert.ok(r[0].tickets.every(t=>t.assigned===false));assert.equal(f.issues.length,5);
});
test('all-baseline automatic run does nothing',async()=>{
 const f=fixture();await f.run({config:{...config,baselineMembers:policy.members}});assert.equal(f.calls.length,0);
});
test('repairs missing link region without overwriting other epic notes',()=>{
 assert.equal(replaceLinks('Existing notes','new links'),'Existing notes\n\n<!-- onboarding-links:start -->\nnew links\n<!-- onboarding-links:end -->');
});
test('preflights all templates before creating anything',async()=>{
 const f=fixture();await assert.rejects(f.run({templates:{...templates,setup:'{{unknown}}'}}),/Missing template/);assert.equal(f.calls.length,0);
});
