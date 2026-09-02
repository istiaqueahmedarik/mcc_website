import { describe, expect, test } from 'bun:test';
import {
  applyCodeforcesWebUpsolves,
  fetchCodeforcesContestRank,
  normalizeCodeforcesContestSource,
  parseCodeforcesContestSource,
  parseCodeforcesEduStandingsPage,
  parseCodeforcesNumericStandingsPage,
  parseCodeforcesSubmissionPage,
  validateCodeforcesSession,
} from './codeforcesContestService';

function eduPage(rows: string, pagination = '') {
  return `<!doctype html><html><body>
    <div class="contest-name">Binary Search</div>
    <table class="standings">
      <tr><th>#</th><th>Who</th><th>=</th>
        <th><a href="/edu/course/2/lesson/6/1/practice/contest/283911/problem/A" title="A - Binary Search">A</a></th>
        <th><a href="/edu/course/2/lesson/6/1/practice/contest/283911/problem/*" title="* - Wildcard">*</a></th>
      </tr>
      ${rows}
      <tr class="standingsStatisticsRow"><td colspan="5">stats</td></tr>
    </table>${pagination}
  </body></html>`;
}

const eduAliceRow = `<tr><td>1</td><td class="contestant-cell"><a href="/profile/Alice">Alice</a></td><td>2</td>
  <td problemid="1" acceptedsubmissionid="11"><span class="cell-accepted">+1</span></td>
  <td problemid="2" acceptedsubmissionid="12"><span class="cell-accepted">+</span></td></tr>`;

function numericPage(
  kind: 'contest' | 'gym',
  contestId: string,
  aggregateHeader: string,
  aggregateTitle: string,
  problemHeaders: string,
  rows: string,
  pagination = '',
) {
  return `<!doctype html><html><body>
    <div class="contest-name">Classroom Contest</div>
    <table class="standings">
      <tr><th>#</th><th>Who</th><th title="Score">=</th><th title="${aggregateTitle}">${aggregateHeader}</th>
        ${problemHeaders}
      </tr>
      ${rows}
      <tr class="standingsStatisticsRow"><td>stats</td></tr>
    </table>${pagination}
  </body></html>`;
}

const gymHeaders = `<th><a href="/gym/708543/problem/A" title="A - First">A</a></th>
  <th><a href="/gym/708543/problem/B" title="B - Second">B</a></th>`;
const gymAliceRow = `<tr><td>1</td><td><a href="/profile/Alice">Alice</a></td><td>1</td><td>37</td>
  <td problemid="10"><span class="cell-accepted">+2</span></td>
  <td problemid="11"><span class="cell-rejected">-1</span></td></tr>`;

const contestHeaders = `<th><a href="/contest/2258/problem/A">A</a><span>500</span></th>
  <th><a href="/contest/2258/problem/B1">B1</a><span>1000</span></th>`;
const contestAliceRow = `<tr><td>1 (5)</td><td><a href="/profile/Alice">Alice</a></td><td><span title="Score">1200</span></td><td>+2 -1</td>
  <td problemid="20"><span class="cell-passed-system-test">450</span><span class="cell-time">00:15</span></td>
  <td problemid="21"><span class="cell-passed-system-test">750</span><span class="cell-time">00:40</span></td></tr>`;

function submissionRow(
  kind: 'contest' | 'gym',
  contestId: string,
  id: number,
  handle: string,
  problemIndex: string,
  verdict: string,
) {
  return `<tr data-submission-id="${id}">
    <td class="id-cell"><a href="/${kind}/${contestId}/submission/${id}">${id}</a></td>
    <td class="status-small"><span class="format-time">Sep/02/2026 19:04</span></td>
    <td class="status-party-cell"><a href="/profile/${handle}">${handle}</a></td>
    <td><a href="/${kind}/${contestId}/problem/${problemIndex}">${problemIndex}</a></td>
    <td>C++</td>
    <td class="status-verdict-cell"><span class="submissionVerdictWrapper" submissionVerdict="${verdict}">${verdict}</span></td>
  </tr>`;
}

function submissionPage(rows: string, pagination = '') {
  return `<!doctype html><html><body><table class="status-frame-datatable">
    <tr><th>#</th><th>When</th><th>Who</th><th>Problem</th><th>Lang</th><th>Verdict</th></tr>
    ${rows}
  </table>${pagination}</body></html>`;
}

describe('Codeforces web standings sources', () => {
  test('validates that a JSESSIONID reaches an authenticated Codeforces page', async () => {
    const authenticated = await validateCodeforcesSession('session-token', {
      fetchImpl: (async () => new Response('<a href="/profile/Trainer">Trainer</a>')) as any,
    });
    expect(authenticated).toBe(true);
  });

  test('normalizes EDU URLs and accepts numeric contest sources', () => {
    expect(normalizeCodeforcesContestSource(
      'https://codeforces.com/edu/course/2/lesson/6/standings?friends=true',
    )).toBe('edu:2:6:friends');
    expect(parseCodeforcesContestSource('2258')).toEqual({ kind: 'contest', contestId: '2258' });
  });

  test('parses EDU results literally and filters before returning rows', () => {
    const bobRow = eduAliceRow.replaceAll('Alice', 'Bob');
    const parsed = parseCodeforcesEduStandingsPage(eduPage(`${eduAliceRow}${bobRow}`), ['alice']);

    expect(parsed.problems.map((problem) => problem.index)).toEqual(['A', '*']);
    expect(parsed.problems[1].name).toBe('Wildcard');
    expect(parsed.teams).toHaveLength(1);
    expect(parsed.teams[0].username).toBe('Alice');
  });

  test('parses Gym solved and native penalty columns', () => {
    const bobRow = gymAliceRow.replaceAll('Alice', 'Bob').replace('<td>37</td>', '<td>51</td>');
    const parsed = parseCodeforcesNumericStandingsPage(
      numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, `${gymAliceRow}${bobRow}`),
      '708543',
      ['alice'],
    );

    expect(parsed.problems.map((problem) => problem.index)).toEqual(['A', 'B']);
    expect(parsed.teams).toHaveLength(1);
    expect(parsed.teams[0].nativeRank).toBe(1);
    expect(parsed.teams[0].solvedCount).toBe(1);
    expect(parsed.teams[0].penalty).toBe(37);
    expect(parsed.teams[0].providerMeta.sourceType).toBe('gym-web');
  });

  test('parses public points contests using Score and Hacks columns', () => {
    const parsed = parseCodeforcesNumericStandingsPage(
      numericPage('contest', '2258', '*', 'Hacks', contestHeaders, contestAliceRow),
      '2258',
      ['alice'],
    );

    expect(parsed.problems.map((problem) => [problem.index, problem.points])).toEqual([['A', 500], ['B1', 1000]]);
    expect(parsed.teams[0].nativeRank).toBe(1);
    expect(parsed.teams[0].nativePoints).toBe(1200);
    expect(parsed.teams[0].solvedCount).toBe(2);
    expect(parsed.teams[0].penalty).toBe(0);
    expect(parsed.teams[0].successfulHackCount).toBe(2);
    expect(parsed.teams[0].unsuccessfulHackCount).toBe(1);
    expect(parsed.teams[0].submissions.map((submission: any) => submission.points)).toEqual([450, 750]);
  });

  test('parses only the requested handle from contest submission history', () => {
    const parsed = parseCodeforcesSubmissionPage(submissionPage([
      submissionRow('gym', '708543', 101, 'Alice', 'B', 'WRONG_ANSWER'),
      submissionRow('gym', '708543', 102, 'Alice', 'B', 'OK'),
      submissionRow('gym', '708543', 103, 'Bob', 'B', 'OK'),
    ].join('')), '708543', 'alice', 'gym');

    expect(parsed.submissions.map((submission) => [submission.id, submission.verdict])).toEqual([
      [101, 'WRONG_ANSWER'],
      [102, 'OK'],
    ]);
  });

  test('applies an accepted web upsolve without double-counting official failures', () => {
    const parsed = parseCodeforcesNumericStandingsPage(
      numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow),
      '708543',
      ['alice'],
    );
    const standings: any = {
      problems: parsed.problems,
      teams: parsed.teams,
      problemWeights: [1, 1],
      providerMeta: {},
    };
    applyCodeforcesWebUpsolves(standings, [
      { id: 100, handle: 'Alice', problem: { index: 'B' }, verdict: 'WRONG_ANSWER' },
      { id: 101, handle: 'Alice', problem: { index: 'B' }, verdict: 'WRONG_ANSWER' },
      { id: 102, handle: 'Alice', problem: { index: 'B' }, verdict: 'OK' },
    ]);

    expect(standings.teams[0].solvedCount).toBe(2);
    expect(standings.teams[0].penalty).toBe(57);
    expect(standings.teams[0].submissions[1].isUpsolve).toBe(true);
    expect(standings.teams[0].submissions[1].rejectedAttemptCount).toBe(2);
  });
});

describe('fetchCodeforcesContestRank', () => {
  test('crawls a public contest friends URL with only the web session', async () => {
    const requests: Array<{ url: string; cookie: string }> = [];
    const result = await fetchCodeforcesContestRank('2258', [2, 4], {
      fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          url: String(url),
          cookie: String((init?.headers as Record<string, string>)?.Cookie || ''),
        });
        return new Response(numericPage('contest', '2258', '*', 'Hacks', contestHeaders, contestAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
    });

    expect(result.statusCode).toBe(200);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toBe('/contest/2258/standings/friends/true');
    expect(requests[0].cookie).toBe('JSESSIONID=session-token');
    expect(result.body.providerMeta.sourceType).toBe('contest-web');
    expect(result.body.teams[0].finalScore).toBe(4.8);
  });

  test('crawls a high-number Gym friends URL without API credentials', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        urls.push(String(url));
        return new Response(numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
    });

    expect(result.statusCode).toBe(200);
    expect(new URL(urls[0]).pathname).toBe('/gym/708543/standings/friends/true');
    expect(result.body.teams[0].penalty).toBe(37);
  });

  test('crawls bounded per-handle submission history when Codeforces upsolves are enabled', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        const value = String(url);
        urls.push(value);
        if (value.includes('/submissions/')) {
          return new Response(submissionPage([
            submissionRow('gym', '708543', 100, 'Alice', 'B', 'WRONG_ANSWER'),
            submissionRow('gym', '708543', 101, 'Alice', 'B', 'OK'),
          ].join('')));
        }
        return new Response(numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      includeUpsolves: true,
    });

    expect(result.statusCode).toBe(200);
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      '/gym/708543/standings/friends/true',
      '/submissions/Alice/contest/708543',
    ]);
    expect(result.body.teams[0].solvedCount).toBe(2);
    expect(result.body.providerMeta.includeUpsolves).toBe(true);
  });

  test('fails closed when a Codeforces upsolve history exceeds the page limit', async () => {
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        if (String(url).includes('/submissions/')) {
          return new Response(submissionPage('', '<a href="/submissions/Alice/contest/708543/page/11">11</a>'));
        }
        return new Response(numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      includeUpsolves: true,
      upsolveMaxPages: 10,
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.code).toBe('CODEFORCES_UPSOLVE_LIMIT');
  });

  test('crawls paginated EDU standings and stops after finding target handles', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('edu:2:6', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        urls.push(String(url));
        const page = new URL(String(url)).searchParams.get('page');
        return new Response(page === '1'
          ? eduPage('', '<a href="/edu/course/2/lesson/6/standings?page=2">next</a>')
          : eduPage(eduAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
    });

    expect(result.statusCode).toBe(200);
    expect(urls).toHaveLength(2);
    expect(result.body.teams[0].username).toBe('Alice');
  });

  test('requires a JSESSIONID for all Codeforces standings sources', async () => {
    const result = await fetchCodeforcesContestRank('2258', undefined, { targetHandles: ['alice'] });
    expect(result.statusCode).toBe(428);
    expect(result.body.code).toBe('CODEFORCES_WEB_SESSION_MISSING');
  });

  test('fails when friends standings contain no classroom handles', async () => {
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async () => new Response(
        numericPage('contest', '2258', '*', 'Hacks', contestHeaders, contestAliceRow),
      )) as any,
      webSession: 'session-token',
      targetHandles: ['bob'],
    });
    expect(result.statusCode).toBe(422);
    expect(result.body.code).toBe('CODEFORCES_WEB_NO_CLASSROOM_FRIENDS');
  });

  test('guards oversized web responses', async () => {
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async () => new Response('<html>too large</html>')) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      maxResponseBytes: 8,
    });
    expect(result.statusCode).toBe(502);
    expect(result.body.code).toBe('CODEFORCES_RESPONSE_TOO_LARGE');
  });
});
