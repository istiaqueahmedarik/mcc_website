/** Resume UI through the Next proxy against synthetic loopback fixtures only. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.FORMS_QA_CLIENT || 'http://127.0.0.1:55443';
const apiBase = process.env.FORMS_QA_API || 'http://127.0.0.1:55441';
for (const target of [base, apiBase]) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(target).hostname));
const manifest = await (await fetch(apiBase + '/qa/manifest')).json();
assert.ok(manifest.admin?.endsWith('@forms.invalid'));
const { token } = await (await fetch(apiBase + '/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: manifest.admin, password: 'forms-qa-password' }),
})).json();
async function api(path, body) {
  const response = await fetch(apiBase + '/global-forms/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.ok(response.ok, `fixture request failed: ${response.status}`);
  return response.json();
}
const browser = await chromium.launch({ executablePath: process.env.FORMS_QA_CHROME || '/usr/bin/google-chrome', headless: true });
const checks = [];
try {
  const template = (await api('manage/templates')).templates[0];
  const campaign = (await api('manage/campaigns', { title: 'Resume browser QA', template_id: template.id })).campaign;
  const path = `manage/campaigns/${campaign.id}`;
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addCookies([{ name: 'token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await page.goto(`${base}/admin/forms?campaign=${campaign.id}`);
  await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
  assert.equal(await resume.count(), 0, 'draft hides resume');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'End', exact: true }).waitFor();
  assert.equal(await resume.count(), 0, 'open hides resume');
  await api(path + '/end', {});
  await page.reload();
  await resume.waitFor();
  const before = (await api(path)).campaign;
  const routePattern = '**/api/global-forms/manage/campaigns/*/resume';
  await page.route(routePattern, route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic resume failure. Retry.' }) }));
  await resume.click();
  await page.getByRole('alert').filter({ hasText: 'Synthetic resume failure. Retry.' }).waitFor();
  assert.ok(await resume.isEnabled(), 'failed resume remains retryable');
  assert.equal((await api(path)).campaign.status, 'ended');
  await page.unroute(routePattern);
  checks.push('draft/open visibility and recoverable failure');
  let posts = 0;
  await page.route(routePattern, async route => {
    posts++;
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await resume.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.ok(await resume.evaluate(el => el.matches(':focus-visible')), 'keyboard focus is visible');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Resume' && el.disabled));
  await page.keyboard.press('Enter');
  await page.getByText('Campaign resumed. The same link accepts registrations again.').waitFor();
  await page.getByRole('button', { name: 'End', exact: true }).waitFor();
  assert.equal(posts, 1, 'pending action blocks duplicate keyboard requests');
  assert.equal(await resume.count(), 0);
  const after = (await api(path)).campaign;
  assert.equal(after.status, 'open');
  assert.equal(after.started_at, before.started_at);
  assert.equal(after.slug, before.slug);
  assert.equal(after.ended_at, null);
  checks.push('keyboard resume through Next proxy, pending protection and refreshed state');
  await api(path + '/end', {});
  for (const mode of [
    { width: 375, height: 844, colorScheme: 'light', reducedMotion: 'no-preference', forcedColors: 'none' },
    { width: 1440, height: 900, colorScheme: 'dark', reducedMotion: 'reduce', forcedColors: 'none' },
    { width: 2560, height: 1440, colorScheme: 'light', reducedMotion: 'reduce', forcedColors: 'active' },
  ]) {
    await page.setViewportSize({ width: mode.width, height: mode.height });
    await page.emulateMedia({ colorScheme: mode.colorScheme, reducedMotion: mode.reducedMotion, forcedColors: mode.forcedColors });
    await page.reload();
    await resume.waitFor();
    assert.ok((await resume.boundingBox()).height >= 44);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow');
  }
  checks.push('44px target and no overflow at mobile, laptop dark/reduced-motion, ultra-wide forced-colors');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, pageErrors: errors }, null, 2));
} finally {
  await browser.close();
}
