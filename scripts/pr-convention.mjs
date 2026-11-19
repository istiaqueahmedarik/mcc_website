import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const requiredSections = ['Problem', 'Changes', 'Validation', 'Review notes'];
const titlePattern = /^(#[1-9][0-9]*|[A-Z]{2,10}-[1-9][0-9]*|NO-ISSUE):\s?(\S.*)$/;
const revertTitlePattern = /^Revert ".+"$/;

// Comments and fenced examples are not evidence that the template was completed.
function visibleLines(body) {
  let fence = null;
  return (body ?? '').replace(/<!--[\s\S]*?(?:-->|$)/g, '').split(/\r?\n/).filter(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && /^\s{0,3}(?:`+|~+)\s*$/.test(line)) fence = null;
      return false;
    }
    return !fence;
  });
}

export function validatePullRequest({ title = '', body = '' }) {
  const errors = [];
  const isSingleLine = !/[\r\n]/.test(title);
  const isRevert = isSingleLine && title.length <= 100 && revertTitlePattern.test(title);
  const match = title.match(titlePattern);
  const summary = match ? match[2].trim() : '';
  if (!isRevert && (!match || !isSingleLine || title.length > 100 || summary.length < 10 || /[.。]$/.test(title))) {
    errors.push('Title: use <ISSUE>: <Title> with #<number>, <KEY>-<number> (2-10 uppercase letters), NO-ISSUE, or GitHub Revert "...". Summary must be at least 10 characters; title at most 100, single line, no final period. Example: #47: Preserve campaign assignments');
  }
  const sections = new Map();
  let current = null;
  for (const line of visibleLines(body)) {
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) {
      current = heading[1];
      if (sections.has(current) && requiredSections.includes(current)) errors.push(`Description: duplicate section "${current}".`);
      else if (!sections.has(current)) sections.set(current, []);
    } else if (current && !/^\s*#/.test(line)) sections.get(current).push(line);
  }
  for (const name of requiredSections) {
    if (!sections.has(name)) {
      errors.push(`Description: missing "## ${name}".`);
      continue;
    }
    const content = sections.get(name).join(' ').replace(/\b(?:TODO|TBD|TBA|N\/A)\b/gi, '').replace(/\b(?:describe here|fill this in|replace this|add details here)\b/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (content.length < 20 || content.split(/\s+/).length < 3) {
      errors.push(`Description: complete "## ${name}" with at least 20 characters and 3 words of useful detail. If not applicable, explain why.`);
    }
  }
  return errors;
}

// Fetch current metadata rather than trusting an old queued event payload.
export async function checkPullRequest(github, repo, number, targetUrl) {
  const status = (sha, state, description) => github.rest.repos.createCommitStatus({
    ...repo, sha, state, context: 'PR convention', description, target_url: targetUrl,
  });
  let { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: number });
  if (pr.state !== 'open') return [];
  await status(pr.head.sha, 'pending', 'Checking title and description convention');
  ({ data: pr } = await github.rest.pulls.get({ ...repo, pull_number: number }));
  const errors = validatePullRequest(pr);
  // Commit statuses are SHA-scoped. A valid sibling PR must not green-light an
  // invalid PR that happens to share its commit (for example from another fork).
  const open = await github.paginate(github.rest.pulls.list, { ...repo, state: 'open', base: 'master', per_page: 100 });
  const peers = [];
  for (const sibling of open.filter(p => p.number !== number && p.head.sha === pr.head.sha)) {
    const { data: peer } = await github.rest.pulls.get({ ...repo, pull_number: sibling.number });
    if (peer.state !== 'open' || peer.head.sha !== pr.head.sha) continue;
    peers.push(peer);
    errors.push(...validatePullRequest(peer).map(error => `PR #${peer.number}: ${error}`));
  }
  for (const peer of peers) {
    const { data: fresh } = await github.rest.pulls.get({ ...repo, pull_number: peer.number });
    if (fresh.state !== peer.state || fresh.head.sha !== peer.head.sha || fresh.title !== peer.title || fresh.body !== peer.body) {
      return ['A PR sharing this commit changed during validation; waiting for its latest event.'];
    }
  }
  const { data: latest } = await github.rest.pulls.get({ ...repo, pull_number: number });
  if (latest.state !== 'open') return [];
  if (latest.head.sha !== pr.head.sha || latest.title !== pr.title || latest.body !== pr.body) {
    await status(latest.head.sha, 'pending', 'PR changed during validation; waiting for its latest event');
    return ['PR changed during validation. The latest event will recheck its metadata.'];
  }
  await status(pr.head.sha, errors.length ? 'failure' : 'success', errors.length ? 'Fix PR title/description; see workflow summary' : 'Title and description follow the convention');
  return errors;
}

export async function reconcileOpenPullRequests(github, repo, targetUrl, triggeringNumber) {
  // Recheck every open PR to clear stale shared-head failures after a peer moves or closes.
  const open = await github.paginate(github.rest.pulls.list, {
    ...repo, state: 'open', base: 'master', per_page: 100,
  });
  const reports = [];
  for (const { number } of open) {
    const errors = await checkPullRequest(github, repo, number, targetUrl);
    reports.push({ number, errors });
  }
  const failed = reports.some(({ number, errors }) =>
    errors.length > 0 && (triggeringNumber === undefined || number === triggeringNumber),
  );
  return { reports, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const errors = validatePullRequest(event.pull_request || event);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('PR title and description follow the convention.');
}
