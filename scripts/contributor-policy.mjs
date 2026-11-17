import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const TYPES = ['feature', 'bug', 'documentation', 'maintenance', 'support'];
const POINTS = new Set([1, 2, 3, 5, 8, 13]);
const loginPattern = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

export function validatePolicy(policy) {
  if (!policy || !/^[\w.-]+\/[\w.-]+$/.test(policy.repository ?? '') ||
      !loginPattern.test(policy.owner ?? '') || !Array.isArray(policy.members) || !policy.members.length ||
      !policy.members.every(name => typeof name === 'string' && loginPattern.test(name)) ||
      new Set(policy.members.map(x => x.toLowerCase())).size !== policy.members.length ||
      !policy.members.some(x => x.toLowerCase() === policy.owner.toLowerCase()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(policy.membershipVerifiedOn ?? '') ||
      !Number.isSafeInteger(policy.dashboardIssueNumber) || policy.dashboardIssueNumber < 0) {
    throw new Error('Invalid policy; no assignments will be changed');
  }
  return policy;
}

export function disallowedAssignees(assignees, policy) {
  const members = new Set(policy.members.map(x => x.toLowerCase()));
  return assignees.filter(x => !members.has(x.login.toLowerCase())).map(x => x.login);
}

export function scoreIssues(issues, policy) {
  const rows = policy.members.map(login => ({ login, total: 0, count: 0,
    types: Object.fromEntries(TYPES.map(t => [t, { count: 0, points: 0, issues: [] }])) }));
  const byLogin = new Map(rows.map(row => [row.login.toLowerCase(), row]));
  const excluded = [], seen = new Set();
  for (const issue of issues) {
    if (seen.has(issue.number)) continue;
    seen.add(issue.number);
    const labels = (issue.labels ?? []).map(x => typeof x === 'string' ? x : x.name);
    if (issue.pull_request || issue.number === policy.dashboardIssueNumber || labels.includes('onboarding') || labels.includes('template') || !labels.includes('points:accepted')) continue;
    let reason;
    const pointLabels = labels.filter(x => x.startsWith('sp:'));
    const typeLabels = labels.filter(x => x.startsWith('type:'));
    const points = pointLabels.length === 1 ? Number(pointLabels[0].slice(3)) : NaN;
    const type = typeLabels.length === 1 ? typeLabels[0].slice(5) : null;
    const row = issue.assignees?.length === 1 ? byLogin.get(issue.assignees[0].login.toLowerCase()) : null;
    if (issue.state !== 'closed' || issue.state_reason !== 'completed') reason = 'not closed as completed';
    else if (labels.includes('points:shared')) reason = 'shared credit needs an explicit reviewed split';
    else if (pointLabels.length !== 1 || !POINTS.has(points) || pointLabels[0] !== `sp:${points}`) reason = 'missing or ambiguous story points';
    else if (typeLabels.length !== 1 || !TYPES.includes(type)) reason = 'missing or ambiguous ticket type';
    else if (!row) reason = 'needs exactly one approved member assignee';
    if (reason) { excluded.push({ number: issue.number, reason }); continue; }
    row.total += points; row.count++;
    row.types[type].count++; row.types[type].points += points; row.types[type].issues.push(issue.number);
  }
  return { rows, excluded };
}

export function renderScorecard(issues, policy) {
  const { rows, excluded } = scoreIssues(issues, policy);
  const link = n => `[#${n}](https://github.com/${policy.repository}/issues/${n})`;
  const out = ['# Contributor scorecard', '',
    `Board: ${policy.projectUrl}`, '',
    'Each type cell shows **completed tickets / accepted points**. Estimates and in-progress work earn no credit.', '',
    '| Member | Feature | Bug | Documentation | Maintenance | Support | Tickets | Total points |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const row of rows) out.push(`| @${row.login} | ${TYPES.map(t => `${row.types[t].count} / ${row.types[t].points}`).join(' | ')} | ${row.count} | **${row.total}** |`);
  out.push('', '## Accepted ticket detail', '');
  for (const row of rows) {
    out.push(`### @${row.login}`);
    const entries = TYPES.filter(t => row.types[t].count);
    out.push(...(entries.length ? entries.map(t => `- ${t}: ${row.types[t].issues.map(link).join(', ')} — ${row.types[t].points} points`) : ['No accepted completed tickets yet.']), '');
  }
  out.push('## Needs credit review', '', ...(excluded.length ? excluded.map(x => `- ${link(x.number)}: ${x.reason}.`) : ['None.']), '',
    '## Assignment and credit rules', '',
    `Approved assignment roster: ${policy.members.map(x => `@${x}`).join(', ')}. Board membership last verified: ${policy.membershipVerifiedOn}.`, '',
    'The owner must keep this roster synchronized with private project access. GitHub’s picker is not restricted by the roster. After the policy workflow is merged and enabled, it removes non-roster issue assignments and reconciles existing assignments. It does not grant repository access.', '',
    'Credit requires an issue closed as completed, points:accepted, one type label, one sp label, and one approved assignee. Shared/ambiguous records are excluded for review, not counted multiple times. A maintainer must verify acceptance and merged delivery before applying points:accepted.', '',
    'Totals are calculated from current issue metadata, not an immutable historical ledger. Reassignment, acceptance-label removal, reopening, or estimate changes affect totals. No automated permission promotion occurs. Onboarding is a separate task.');
  return out.join('\n') + '\n';
}

export function createApi({ repository, token, fetcher = fetch }) {
  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}${path}`, {
      method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path.split('?')[0]} failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  };
}

export async function listIssues(api) {
  const result = [];
  for (let page = 1; ; page++) {
    const items = await api(`/issues?state=all&per_page=100&page=${page}`);
    result.push(...items);
    if (items.length < 100) return result;
  }
}

export async function reconcileAssignments(api, issues, policy) {
  const removed = [];
  for (const issue of issues) {
    if (issue.pull_request || !issue.assignees?.length) continue;
    // Read current metadata rather than removing users from a stale event payload.
    const fresh = await api(`/issues/${issue.number}`);
    const assignees = disallowedAssignees(fresh.assignees ?? [], policy);
    if (!assignees.length) continue;
    await api(`/issues/${issue.number}/assignees`, { method: 'DELETE', body: { assignees } });
    removed.push({ number: issue.number, assignees });
  }
  return removed;
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (!apply && !process.argv.includes('--preview')) throw new Error('Choose --preview (read-only) or --apply');
  const policy = validatePolicy(JSON.parse(await readFile(new URL('../.github/contribution-policy.json', import.meta.url), 'utf8')));
  if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is required');
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== policy.repository) throw new Error('Repository does not match approved policy');
  if (apply && policy.dashboardIssueNumber < 1) throw new Error('Configure the dashboard issue before applying');
  const api = createApi({ repository: policy.repository, token: process.env.GH_TOKEN });
  let issues = await listIssues(api);
  if (apply) {
    const removed = await reconcileAssignments(api, issues, policy);
    console.log(JSON.stringify({ removed }));
    issues = await listIssues(api);
  }
  const body = renderScorecard(issues, policy);
  if (apply) {
    const current = await api(`/issues/${policy.dashboardIssueNumber}`);
    if (current.body !== body) await api(`/issues/${policy.dashboardIssueNumber}`, { method: 'PATCH', body: { body } });
  }
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, body);
  if (!apply) process.stdout.write(body);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
