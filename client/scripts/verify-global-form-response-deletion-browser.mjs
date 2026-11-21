/** Response deletion UI checks (issue #63) against the local synthetic forms fixture API and Next client. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.FORMS_QA_CLIENT || 'http://127.0.0.1:55443';
const apiBase = process.env.FORMS_QA_API || 'http://127.0.0.1:55441';
const output = process.env.FORMS_QA_OUTPUT || '/tmp/mcc-forms-response-deletion-qa';
for (const target of [base, apiBase]) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(target).hostname), 'Loopback services required');
await fs.mkdir(output, { recursive: true });
const manifest = await (await fetch(apiBase + '/qa/manifest')).json();
assert.ok([manifest.admin, manifest.student, manifest.complete].every(email => email?.endsWith('@forms.invalid')), 'Synthetic fixture accounts required');
async function login(email) {
  return (await (await fetch(apiBase + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'forms-qa-password' }) })).json()).token;
}
const adminToken = await login(manifest.admin);
async function call(path, token, body, method) {
  const r = await fetch(apiBase + '/global-forms/' + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: r.status, json: await r.json() };
}
async function api(path, body, method) {
  const result = await call(path, adminToken, body, method);
  assert.ok(result.status < 400, JSON.stringify(result.json));
  return result.json;
}
async function register(campaign, email) {
  const token = await login(email);
  const preview = await call(`public/${campaign.slug}/preview`, token);
  const submitted = await call(`public/${campaign.slug}/submit`, token, { answers: {}, profile_values: {}, profile_version: preview.json.profile_version, agreement: true });
  assert.ok([200, 201].includes(submitted.status), JSON.stringify(submitted.json));
}
const total = async campaign => (await api(`manage/campaigns/${campaign.id}/responses?page=1`)).total;
const browser = await chromium.launch({ executablePath: process.env.FORMS_QA_CHROME || undefined, headless: true });
const checks = [], errors = [];
const deleteRoute = '**/api/global-forms/manage/campaigns/*/responses/*';

try {
  const template = (await api('manage/templates', {
    title: 'Deletion UI QA ' + Date.now(), kind: 'general', description: '', agreement_text: 'Agree',
    fields: [{ id: 'note', label: 'Note', type: 'text', required: false, mapUserField: null, options: [], helpText: '' }],
  })).template;
  const campaign = (await api('manage/campaigns', { title: 'Deletion UI QA campaign', template_id: template.id })).campaign;
  await api(`manage/campaigns/${campaign.id}/start`, {});
  await register(campaign, manifest.complete);
  await register(campaign, manifest.student);
  assert.equal(await total(campaign), 2);

  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addCookies([{ name: 'token', value: adminToken, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const admin = await context.newPage();
  admin.on('pageerror', error => errors.push(error.message));
  const dialog = admin.getByRole('dialog');
  await admin.goto(`${base}/admin/forms?tab=campaigns&campaign=${campaign.id}`);
  await admin.getByText('2 submitted registrations').waitFor();
  const firstName = (await admin.locator('tbody tr').first().locator('td').first().locator('p').first().innerText()).trim();

  // AC1/AC2: delete is reached from details; confirmation identifies the response and explains the effect.
  await admin.getByRole('button', { name: 'View', exact: true }).first().click();
  await dialog.getByRole('heading', { name: 'Registration details' }).waitFor();
  await admin.waitForTimeout(250);
  await admin.screenshot({ path: output + '/details-with-delete.png' });
  await dialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await dialog.getByRole('heading', { name: 'Delete this response?' }).waitFor();
  await dialog.getByText(firstName, { exact: true }).waitFor();
  await dialog.getByText('The student\'s account, profile details, and verification status are kept.').waitFor();
  await dialog.getByText('While the campaign is open, the student can register again.').waitFor();
  assert.equal(await admin.getByRole('dialog').count(), 1, 'only one dialog is open at a time');
  await admin.waitForTimeout(250);
  await admin.screenshot({ path: output + '/confirm-delete.png' });
  checks.push('delete is reached from response details and the confirmation identifies the response and its effect');

  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.getByRole('heading', { name: 'Registration details' }).waitFor();
  assert.equal(await total(campaign), 2);
  await admin.getByText('2 submitted registrations').waitFor();
  checks.push('cancel returns to details and changes nothing');

  // AC7: a failed request keeps the response and shows an actionable error inside the dialog.
  await admin.route(deleteRoute, route => route.request().method() === 'DELETE'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'The forms service could not complete this request' }) })
    : route.continue());
  await dialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await dialog.getByRole('heading', { name: 'Delete this response?' }).waitFor();
  await dialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  const alert = dialog.getByRole('alert');
  await alert.filter({ hasText: 'The forms service could not complete this request' }).waitFor();
  assert.ok(await dialog.getByRole('button', { name: 'Delete response', exact: true }).isEnabled(), 'retry is available');
  assert.equal(await total(campaign), 2);
  await admin.screenshot({ path: output + '/delete-failed-error.png' });
  await admin.unroute(deleteRoute);
  checks.push('failed delete keeps the response, shows an in-dialog error, and allows retry');

  // Dark mode is applied before load, as next-themes does for a real user (not toggled mid-dialog).
  const darkContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: 'dark' });
  await darkContext.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await darkContext.addCookies([{ name: 'token', value: adminToken, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const dark = await darkContext.newPage();
  dark.on('pageerror', error => errors.push(error.message));
  await dark.route(deleteRoute, route => route.request().method() === 'DELETE'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'The forms service could not complete this request' }) })
    : route.continue());
  await dark.goto(`${base}/admin/forms?tab=campaigns&campaign=${campaign.id}`);
  assert.ok(await dark.evaluate(() => document.documentElement.classList.contains('dark')));
  await dark.getByRole('button', { name: 'View', exact: true }).first().click();
  const darkDialog = dark.getByRole('dialog');
  await darkDialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await darkDialog.getByRole('heading', { name: 'Delete this response?' }).waitFor();
  await darkDialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await darkDialog.getByRole('alert').waitFor();
  await dark.waitForTimeout(400);
  const darkColors = await darkDialog.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, alert: getComputedStyle(el.querySelector('[role=alert]')).color }));
  assert.equal(darkColors.background, 'rgb(14, 16, 22)', JSON.stringify(darkColors));
  assert.equal(darkColors.alert, 'rgb(252, 165, 165)', 'dark-mode error uses readable red-300 text');
  await dark.screenshot({ path: output + '/delete-failed-error-dark.png' });
  await darkContext.close();
  assert.equal(await total(campaign), 2);
  checks.push('dark mode keeps the confirmation and error readable');

  // AC7/AC3: duplicate activation sends one request; success updates list, counts and persists.
  let requests = 0;
  await admin.route(deleteRoute, async route => {
    if (route.request().method() !== 'DELETE') return route.continue();
    requests++; await new Promise(r => setTimeout(r, 700)); await route.continue();
  });
  const confirm = dialog.getByRole('button', { name: 'Delete response', exact: true });
  await confirm.evaluate(button => { button.click(); button.click(); });
  await dialog.getByRole('button', { name: 'Deleting…', exact: true }).waitFor();
  assert.ok(await dialog.getByRole('button', { name: 'Deleting…', exact: true }).isDisabled());
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(requests, 1, 'double activation sends one delete request');
  await admin.unroute(deleteRoute);
  checks.push('double activation sends one request with a disabled pending state');
  await admin.getByText('Response deleted. The student can register again while the campaign is open.').waitFor();
  await admin.getByText('1 submitted registrations').waitFor();
  assert.ok(await admin.locator('[data-responses-search]').evaluate(el => el === document.activeElement), 'focus moves to response search');
  assert.equal(await admin.getByText(firstName, { exact: true }).count(), 0);
  await admin.screenshot({ path: output + '/after-delete.png', fullPage: true });
  await admin.reload();
  await admin.getByText('1 submitted registrations').waitFor();
  assert.equal(await total(campaign), 1);
  assert.equal((await api(`manage/dashboard?campaign_id=${campaign.id}`)).submitted, 1);
  checks.push('successful delete updates list, total, Submitted count and focus, and persists after reload');

  // AC7: deleting a response another admin already removed fails safely and refreshes.
  await admin.getByRole('button', { name: 'View', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await dialog.getByRole('heading', { name: 'Delete this response?' }).waitFor();
  const remaining = (await api(`manage/campaigns/${campaign.id}/responses?page=1`)).responses[0];
  await api(`manage/campaigns/${campaign.id}/responses/${remaining.id}`, undefined, 'DELETE');
  await dialog.getByRole('button', { name: 'Delete response', exact: true }).click();
  await admin.getByText('That response had already been removed. The list has been refreshed.').waitFor();
  await admin.getByText('0 submitted registrations').waitFor();
  checks.push('a response already removed elsewhere is reported and the list refreshes');

  assert.deepEqual(errors, []);
  await fs.writeFile(output + '/results.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
