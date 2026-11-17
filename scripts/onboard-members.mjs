import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApi, listIssues, validatePolicy } from './contributor-policy.mjs';

export const STEPS = ['intro', 'glossary', 'technical', 'setup'];
const TITLES = { epic: 'Contributor onboarding', intro: 'Website introduction', glossary: 'Product glossary', technical: 'Technical terms and workflow', setup: 'Local development setup' };
const LOGIN = /^[a-z\d][a-z\d-]{0,38}$/i;
const START = '<!-- onboarding-links:start -->', END = '<!-- onboarding-links:end -->';
export const marker = (member, step) => `<!-- mcc-onboarding:v1:${member.toLowerCase()}:${step} -->`;

export function validateConfig(config, policy) {
  if (config?.version !== 1 || !Array.isArray(config.baselineMembers) || !config.baselineMembers.every(x => typeof x === 'string' && LOGIN.test(x)) ||
      !policy.members.some(x => x.toLowerCase() === config.defaultMentor?.toLowerCase())) throw new Error('Invalid onboarding configuration');
  return config;
}

export function selectMembers(policy, config, requested = '') {
  if (requested) {
    if (!LOGIN.test(requested)) throw new Error('Invalid requested member');
    const member = policy.members.find(x => x.toLowerCase() === requested.toLowerCase());
    if (!member) throw new Error('Member must be in the approved contributor roster');
    return [member];
  }
  const baseline = new Set(config.baselineMembers.map(x => x.toLowerCase()));
  return policy.members.filter(x => !baseline.has(x.toLowerCase()));
}

export function renderTemplate(template, values) {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
    if (typeof values[key] !== 'string') throw new Error(`Missing template value: ${key}`);
    return values[key];
  });
}

export function existingIssue(issues, policy, member, step) {
  const trusted = new Set([policy.owner.toLowerCase(), 'github-actions[bot]']);
  const matches = issues.filter(x => !x.pull_request && trusted.has(x.user?.login?.toLowerCase()) && x.body?.includes(marker(member, step)));
  if (matches.length > 1) throw new Error(`Duplicate onboarding records for ${member}/${step}; resolve before retrying`);
  return matches[0];
}

export function replaceLinks(body, links) {
  const section = `${START}\n${links}\n${END}`;
  const a = body.indexOf(START), b = body.indexOf(END, a);
  return a >= 0 && b >= a ? body.slice(0, a) + section + body.slice(b + END.length) : body + '\n\n' + section;
}

async function subissues(api, number) {
  const all = [];
  for (let page = 1; ; page++) {
    const items = await api(`/issues/${number}/sub_issues?per_page=100&page=${page}`);
    all.push(...items);
    if (items.length < 100) return all;
  }
}

export async function reconcileOnboarding({ api, policy, config, templates, issues, requested = '', mentor = '', date }) {
  validatePolicy(policy); validateConfig(config, policy);
  const members = selectMembers(policy, config, requested);
  mentor = policy.members.find(x => x.toLowerCase() === (mentor || config.defaultMentor).toLowerCase());
  if (!mentor) throw new Error('Mentor must be in the approved roster');
  // Preflight every target/template before making any writes.
  for (const member of members) for (const step of ['epic', ...STEPS]) {
    existingIssue(issues, policy, member, step);
    renderTemplate(templates[step], { member, mentor, start_date: date, epic_url: 'pending', child_links: 'pending' });
  }
  const results = [];
  for (const member of members) {
    const values = { member, mentor, start_date: date, child_links: 'Sub-issues are being prepared; retry the workflow if this section remains incomplete.' };
    async function ensure(step) {
      let issue = existingIssue(issues, policy, member, step);
      if (!issue) {
        issue = await api('/issues', { method: 'POST', body: {
          title: `[Onboarding] @${member} — ${TITLES[step]}`,
          body: marker(member, step) + '\n\n' + renderTemplate(templates[step], values), labels: ['onboarding'],
        } });
        issues.push(issue);
      }
      // Use this run's reviewed roster; concurrent membership changes reconcile on the next run.
      const current = await api(`/issues/${issue.number}`);
      let assigned = current.assignees?.some(x => x.login.toLowerCase() === member.toLowerCase()) ?? false;
      if (!assigned && current.state !== 'closed') {
        const response = await api(`/issues/${issue.number}/assignees`, { method: 'POST', body: { assignees: [member] } });
        assigned = response.assignees?.some(x => x.login.toLowerCase() === member.toLowerCase()) ?? false;
      }
      return { ...current, assigned };
    }
    const epic = await ensure('epic'); values.epic_url = epic.html_url;
    const children = [];
    for (const step of STEPS) children.push({ step, ...await ensure(step) });
    const attached = new Set((await subissues(api, epic.number)).map(x => x.id));
    for (const child of children) if (!attached.has(child.id)) {
      await api(`/issues/${epic.number}/sub_issues`, { method: 'POST', body: { sub_issue_id: child.id } });
    }
    const links = children.map(x => `- [${TITLES[x.step]}](${x.html_url})`).join('\n');
    const fresh = await api(`/issues/${epic.number}`);
    const body = replaceLinks(fresh.body ?? '', links);
    if (body !== fresh.body) await api(`/issues/${epic.number}`, { method: 'PATCH', body: { body } });
    results.push({ member, epic: epic.html_url, tickets: [epic, ...children].map(x => ({ url: x.html_url, assigned: x.assigned })) });
  }
  return results;
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (!apply && !process.argv.includes('--preview')) throw new Error('Choose --preview or --apply');
  const policy = validatePolicy(JSON.parse(await readFile(new URL('../.github/contribution-policy.json', import.meta.url), 'utf8')));
  const config = validateConfig(JSON.parse(await readFile(new URL('../.github/onboarding/config.json', import.meta.url), 'utf8')), policy);
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== policy.repository) throw new Error('Repository does not match policy');
  const requested = process.env.ONBOARD_MEMBER || '', mentor = process.env.ONBOARD_MENTOR || config.defaultMentor;
  if (!policy.members.some(x => x.toLowerCase() === mentor.toLowerCase())) throw new Error('Mentor must be in the approved roster');
  const targets = selectMembers(policy, config, requested);
  const templates = Object.fromEntries(await Promise.all(['epic', ...STEPS].map(async step => [step, await readFile(new URL(`../.github/onboarding/${step}.md`, import.meta.url), 'utf8')])));
  if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is required');
  const api = createApi({ repository: policy.repository, token: process.env.GH_TOKEN });
  const issues = await listIssues(api);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let result;
  if (apply) result = await reconcileOnboarding({ api, policy, config, templates, issues, requested, mentor, date });
  else result = targets.map(member => ({ member, tickets: ['epic', ...STEPS].map(step => ({ step, existing: existingIssue(issues, policy, member, step)?.html_url ?? null })) }));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', result }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['# Contributor onboarding', '', targets.length ? `${targets.length} member(s) reconciled.` : 'No new approved members; existing baseline members were skipped.', ''];
    for (const entry of result) {
      lines.push(`## @${entry.member}`, entry.epic ?? '', '');
      for (const ticket of entry.tickets) if (ticket.url) lines.push(`- ${ticket.url}: ${ticket.assigned ? 'assigned' : 'assignment pending — member may need to comment on the issue, then rerun'}`);
    }
    await writeFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
