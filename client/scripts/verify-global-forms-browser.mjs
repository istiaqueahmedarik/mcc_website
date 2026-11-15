const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// Start the disposable forms_test fixture API and client before running this check.
const base = process.env.FORMS_QA_CLIENT || 'http://127.0.0.1:55443';
const apiBase = process.env.FORMS_QA_API || 'http://127.0.0.1:55441';
const shots = process.env.FORMS_QA_OUTPUT || '/tmp/mcc-forms-revision-qa';
for (const target of [base, apiBase]) {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(target).hostname), 'QA requires loopback services');
}
await fs.mkdir(shots, { recursive: true });
const manifest=await (await fetch(apiBase+'/qa/manifest')).json();
assert.ok([manifest.admin, manifest.student, manifest.complete].every(email => email?.endsWith('@forms.invalid')), 'Synthetic fixture accounts required');
async function login(email){const r=await fetch(apiBase+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'forms-qa-password'})});return (await r.json()).token;}
const token=await login(manifest.admin);
async function api(path,body){const r=await fetch(apiBase+'/global-forms/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
const starter=(await api('manage/templates')).templates.find(t=>t.kind==='tfc'&&t.built_in);
async function campaign(){const c=(await api('manage/campaigns',{template_id:starter.id,title:'Registration interaction QA'})).campaign;await api(`manage/campaigns/${c.id}/start`,{});return c;}
const browser=await chromium.launch({executablePath:process.env.FORMS_QA_CHROME || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const errors=[],checks=[];
async function context(email,options={}){const c=await browser.newContext({viewport:{width:1366,height:900},...options});await c.addCookies([{name:'token',value:await login(email),url:base,httpOnly:true,sameSite:'Lax'}]);return c;}
const student=await context(manifest.student), page=await student.newPage();page.on('pageerror',e=>errors.push(e.message));
const c1=await campaign();await page.goto(`${base}/register/${c1.slug}`);await page.getByRole('heading',{name:'Review your details'}).waitFor();
const hold=page.locator('[aria-describedby="registration-submit-help"]');let submissions=0;
await page.route('**/api/global-forms/public/*/submit',async route=>{submissions++;await new Promise(r=>setTimeout(r,700));await route.continue();});
await hold.click();await page.locator('[aria-invalid=true]').first().waitFor();
assert.equal(submissions,0);assert.ok(await page.locator('[aria-invalid=true]').count());checks.push('incomplete hold validates without submitting');
await page.getByLabel(/MIST Student ID/).fill('202614009');await page.getByLabel(/Codeforces handle/).fill('RevisionCF');await page.getByRole('checkbox').last().check();
await page.locator('form[data-registration-form]').evaluate(el=>el.requestSubmit());assert.equal(submissions,0);checks.push('implicit form submit cannot bypass hold');
async function down(){await hold.scrollIntoViewIfNeeded();const box=await hold.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();return box;}
await down();await page.waitForTimeout(200);await page.mouse.up();await page.waitForTimeout(1100);assert.equal(submissions,0);checks.push('short pointer press cancels');
const bounds=await down();await page.waitForTimeout(200);await page.mouse.move(bounds.x-20,bounds.y);await page.waitForTimeout(1100);await page.mouse.up();assert.equal(submissions,0);checks.push('pointer leaving cancels');
await down();await page.waitForTimeout(200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(1100);await page.mouse.up();assert.equal(submissions,0);checks.push('window blur cancels');
await hold.focus();await page.keyboard.down('Space');await page.waitForTimeout(200);await page.keyboard.up('Space');await page.waitForTimeout(1100);assert.equal(submissions,0);checks.push('short keyboard press cancels');
await page.screenshot({path:shots+'/student-preview-desktop.png',fullPage:true});
await hold.focus();await page.keyboard.down('Enter');await page.waitForTimeout(1150);await page.keyboard.up('Enter');await page.getByRole('button',{name:'Registering…'}).waitFor();assert.ok(await page.getByRole('button',{name:'Registering…'}).isDisabled());await page.getByRole('heading',{name:'Registration complete'}).waitFor();assert.equal(submissions,1);checks.push('full keyboard hold submits exactly once with disabled pending state');
const admin=await context(manifest.admin), dashboard=await admin.newPage();dashboard.on('pageerror',e=>errors.push(e.message));await dashboard.goto(`${base}/admin/forms?campaign=${c1.id}`);await dashboard.getByRole('heading',{name:'Responses',exact:true}).waitFor();await dashboard.getByText(manifest.student,{exact:true}).waitFor();await dashboard.screenshot({path:shots+'/admin-responses-desktop.png',fullPage:true});
await dashboard.getByRole('button',{name:'Templates',exact:true}).click();await dashboard.getByRole('heading',{name:'Template library'}).waitFor();await dashboard.screenshot({path:shots+'/templates-desktop.png',fullPage:true});await dashboard.setViewportSize({width:390,height:844});await dashboard.screenshot({path:shots+'/templates-mobile.png',fullPage:true});assert.ok(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('admin desktop/mobile layout');
const complete=await context(manifest.complete,{viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}), mobile=await complete.newPage();mobile.on('pageerror',e=>errors.push(e.message));const c2=await campaign();await mobile.goto(`${base}/register/${c2.slug}`);await mobile.getByRole('heading',{name:'Review your details'}).waitFor();assert.equal(await mobile.getByLabel(/MIST Student ID/).count(),0);await mobile.getByRole('checkbox').last().check();await mobile.screenshot({path:shots+'/student-preview-mobile.png',fullPage:true});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await mobile.getByRole('button',{name:'Use a standard submit button instead'}).click();assert.equal(await mobile.getByRole('heading',{name:'Registration complete'}).count(),0);await mobile.getByRole('button',{name:'Confirm registration',exact:true}).click();await mobile.getByRole('heading',{name:'Registration complete'}).waitFor();checks.push('complete profile and reduced-motion mobile standard-button alternative');
const c3=await campaign();await mobile.goto(`${base}/register/${c3.slug}`);await mobile.getByRole('heading',{name:'Review your details'}).waitFor();await mobile.getByRole('checkbox').last().check();const touchButton=mobile.getByRole('button',{name:'Hold to register',exact:true});await touchButton.scrollIntoViewIfNeeded();const b=await touchButton.boundingBox();const cdp=await complete.newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await mobile.waitForTimeout(1150);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.getByRole('heading',{name:'Registration complete'}).waitFor();checks.push('emulated touch hold completes with reduced motion');
assert.deepEqual(errors,[]);await fs.writeFile(shots+'/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();
