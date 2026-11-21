/** Radio-question UI checks (issue #50) against the local synthetic forms fixture API and Next client. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.FORMS_QA_CLIENT || 'http://127.0.0.1:55443';
const apiBase = process.env.FORMS_QA_API || 'http://127.0.0.1:55441';
const output = process.env.FORMS_QA_OUTPUT || '/tmp/mcc-forms-radio-qa';
for (const target of [base, apiBase]) assert.ok(['127.0.0.1', 'localhost'].includes(new URL(target).hostname), 'Loopback services required');
await fs.mkdir(output, { recursive: true });
const manifest = await (await fetch(apiBase + '/qa/manifest')).json();
assert.ok([manifest.admin, manifest.complete].every(email => email?.endsWith('@forms.invalid')), 'Synthetic fixture accounts required');
async function login(email) {
  return (await (await fetch(apiBase + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'forms-qa-password' }) })).json()).token;
}
const adminToken = await login(manifest.admin);
async function api(path, body, method) {
  const r = await fetch(apiBase + '/global-forms/' + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await r.json();
  assert.ok(r.ok, JSON.stringify(result));
  return result;
}
const browser = await chromium.launch({ executablePath: process.env.FORMS_QA_CHROME || undefined, headless: true });
const checks = [], errors = [];
async function account(email, viewport = { width: 1366, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  await context.addCookies([{ name: 'token', value: await login(email), url: base, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
const activeRadio = page => page.evaluate(() => document.activeElement?.matches('input[type=radio]') ? document.activeElement.value : null);

try {
  // AC1/AC2: the admin editor offers radio questions, rejects one option, and saves two.
  const admin = await account(manifest.admin);
  await admin.goto(base + '/admin/forms?tab=templates');
  await admin.getByRole('button', { name: 'New template', exact: true }).click();
  const dialog = admin.getByRole('dialog');
  await dialog.waitFor(); await admin.waitForTimeout(250);
  const title = 'Radio editor QA ' + Date.now();
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog.getByLabel('Label', { exact: true }).fill('Preferred slot');
  await dialog.getByLabel('Type', { exact: true }).selectOption('radio');
  assert.ok(await dialog.getByLabel('Profile mapping', { exact: true }).isDisabled());
  await dialog.getByText('Radio questions always collect a custom answer.').waitFor();
  checks.push('radio type is offered and profile mapping is locked with an explanation');
  const options = dialog.getByLabel('Options (one per line, at least 2)', { exact: true });
  await options.fill('Morning');
  await dialog.getByRole('checkbox', { name: 'Required' }).check();
  await dialog.getByRole('button', { name: 'Save template', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: '"Preferred slot" needs at least 2 options, one per line.' }).waitFor();
  await admin.screenshot({ path: output + '/editor-rejects-one-option.png', fullPage: true });
  await options.fill('Morning\n morning ');
  await dialog.getByRole('button', { name: 'Save template', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: '"Preferred slot" has options that look the same: "Morning" and "morning".' }).waitFor();
  checks.push('editor rejects fewer than two and look-alike options with question-specific errors visible inside the dialog');
  await options.fill('Morning\n\nEvening\n');
  await admin.screenshot({ path: output + '/editor-radio-question.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Save template', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const saved = (await api('manage/templates')).templates.find(t => t.title === title);
  assert.deepEqual(saved.fields.map(({ label, type, required, mapUserField, options }) => ({ label, type, required, mapUserField, options })),
    [{ label: 'Preferred slot', type: 'radio', required: true, mapUserField: null, options: ['Morning', 'Evening'] }]);
  checks.push('saved radio question keeps label, order, requiredness and ignores blank editor lines');

  const campaign = (await api('manage/campaigns', { title: title + ' campaign', template_id: saved.id })).campaign;
  await api(`manage/campaigns/${campaign.id}/start`, {});

  // AC3/AC4: accessible group, required error focus, keyboard and pointer single selection.
  const student = await account(manifest.complete);
  await student.goto(`${base}/register/${campaign.slug}`);
  await student.getByRole('heading', { name: 'Review your details', exact: true }).waitFor();
  const group = student.getByRole('radiogroup', { name: 'Preferred slot' });
  await group.waitFor();
  const morning = group.getByRole('radio', { name: 'Morning', exact: true });
  const evening = group.getByRole('radio', { name: 'Evening', exact: true });
  assert.equal(await group.getAttribute('aria-required'), 'true');
  checks.push('radio group and options have accessible names and required state');
  await student.getByRole('checkbox').last().check();
  await student.getByRole('button', { name: 'Confirm registration', exact: true }).click();
  await group.getByText('This field is required.').waitFor();
  assert.equal(await group.getAttribute('aria-invalid'), 'true');
  assert.equal(await activeRadio(student), 'Morning');
  await student.screenshot({ path: output + '/student-required-error.png', fullPage: true });
  checks.push('required radio blocks submit, shows a question-level error and receives focus');
  await student.keyboard.press('Space');
  assert.ok(await morning.isChecked());
  await student.keyboard.press('ArrowDown');
  assert.ok(await evening.isChecked() && !(await morning.isChecked()));
  assert.equal(await activeRadio(student), 'Evening');
  await student.keyboard.press('ArrowUp');
  assert.ok(await morning.isChecked() && !(await evening.isChecked()));
  checks.push('keyboard Space/arrow keys select exactly one option');
  await student.getByText('Evening', { exact: true }).click();
  assert.ok(await evening.isChecked() && !(await morning.isChecked()));
  assert.equal(await student.locator('input[type=radio]:checked').count(), 1);
  checks.push('pointer selection replaces the previous choice');
  await student.screenshot({ path: output + '/student-radio-selected.png', fullPage: true });
  await student.setViewportSize({ width: 390, height: 844 });
  await student.waitForTimeout(250);
  assert.ok(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok((await group.locator('label').first().boundingBox()).height >= 44);
  await student.screenshot({ path: output + '/student-radio-mobile.png', fullPage: true });
  checks.push('mobile layout has no horizontal scroll and 44px option targets');
  await student.getByRole('button', { name: 'Confirm registration', exact: true }).click();
  await student.getByRole('heading', { name: 'Registration complete' }).waitFor();
  checks.push('student submits the selected radio answer');

  // AC6: response details and CSV export show the submitted choice.
  const responses = await api(`manage/campaigns/${campaign.id}/responses?page=1`);
  assert.equal(responses.responses[0].answers.slot ?? Object.values(responses.responses[0].answers)[0], 'Evening');
  await admin.goto(`${base}/admin/forms?tab=campaigns&campaign=${campaign.id}`);
  await admin.getByRole('button', { name: 'View', exact: true }).first().click();
  await dialog.waitFor(); await admin.waitForTimeout(250);
  await dialog.getByText('Evening', { exact: true }).waitFor();
  await admin.screenshot({ path: output + '/admin-response-detail.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const [download] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: 'Export page', exact: true }).click()]);
  const csv = await fs.readFile(await download.path(), 'utf8');
  await fs.writeFile(output + '/responses-export.csv', csv);
  const [header, row] = csv.split('\r\n');
  assert.ok(header.endsWith('"Preferred slot"'), header);
  assert.ok(row.endsWith('"Evening"'), row);
  checks.push('response detail and CSV export show the chosen option');

  assert.deepEqual(errors, []);
  await fs.writeFile(output + '/results.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
