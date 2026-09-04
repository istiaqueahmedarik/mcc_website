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

function apiStandings(handles = ['Alice']) {
  return {
    contest: {
      id: 2258,
      name: 'Classroom Contest',
      type: 'CF',
      phase: 'FINISHED',
      startTimeSeconds: 1_700_000_000,
      durationSeconds: 7_200,
    },
    problems: [
      { contestId: 2258, index: 'A', name: 'First', points: 500 },
      { contestId: 2258, index: 'B1', name: 'Second', points: 1000 },
    ],
    rows: handles.map((handle, index) => ({
      party: { participantType: 'CONTESTANT', members: [{ handle }] },
      rank: index + 1,
      points: 1200,
      penalty: 0,
      successfulHackCount: 2,
      unsuccessfulHackCount: 1,
      problemResults: [
        { points: 450, rejectedAttemptCount: 0 },
        { points: 750, rejectedAttemptCount: 0 },
      ],
    })),
  };
}

function apiOk(result: any) {
  return new Response(JSON.stringify({ status: 'OK', result }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiFailed(comment = 'Contest with id 708543 not found') {
  return new Response(JSON.stringify({ status: 'FAILED', comment }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiSubmission(
  id: number,
  creationTimeSeconds: number,
  verdict: string,
  handle = 'Alice',
  problemIndex = 'B1',
) {
  return {
    id,
    creationTimeSeconds,
    verdict,
    author: { members: [{ handle }] },
    problem: { contestId: 2258, index: problemIndex },
  };
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
  test('uses the anonymous API first and retains complete official standings', async () => {
    const requests: Array<{ url: string; cookie: string }> = [];
    let credentialProviderCalls = 0;
    const result = await fetchCodeforcesContestRank('2258', [2, 4], {
      fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          url: String(url),
          cookie: String((init?.headers as Record<string, string>)?.Cookie || ''),
        });
        return apiOk(apiStandings(['Alice', 'Bob']));
      }) as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'unused-key', apiSecret: 'unused-secret' };
      },
      targetHandles: ['alice'],
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toBe('/api/contest.standings');
    expect(Array.from(new URL(requests[0].url).searchParams.keys())).toEqual(['contestId']);
    expect(requests[0].cookie).toBe('');
    expect(credentialProviderCalls).toBe(0);
    expect(result.body.providerMeta.sourceType).toBe('contest-api');
    expect(result.body.fullParticipantCount).toBe(2);
    expect(result.body.teams).toHaveLength(2);
    expect(result.body.teams[0].finalScore).toBe(4.8);
    expect(result.body.providerMeta.requestedClassroomHandleCount).toBe(1);
    expect(result.body.providerMeta.classroomHandleMatchCount).toBe(1);
  });

  test('retains unmatched public API rows without loading saved credentials', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const standings = apiStandings(['Bob']);
    standings.rows.push({
      ...standings.rows[0],
      party: { participantType: 'PRACTICE', members: [{ handle: 'Charlie' }] },
      rank: 2,
    });
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        urls.push(String(url));
        return apiOk(standings);
      }) as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'unused-key', apiSecret: 'unused-secret' };
      },
      targetHandles: ['alice'],
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(urls).toHaveLength(1);
    expect(credentialProviderCalls).toBe(0);
    expect(result.body.teams.map((team: any) => team.username)).toEqual(['Bob']);
    expect(result.body.fullParticipantCount).toBe(1);
    expect(result.body.providerMeta.requestedClassroomHandleCount).toBe(1);
    expect(result.body.providerMeta.classroomHandleMatchCount).toBe(0);
  });

  test('falls back to a high-number Gym friends URL when the anonymous API fails', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        urls.push(String(url));
        if (String(url).includes('/api/contest.standings')) return apiFailed();
        return new Response(numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      '/api/contest.standings',
      '/gym/708543/standings/friends/true',
    ]);
    expect(result.body.providerMeta.apiFallbackCode).toBe('CODEFORCES_CREDENTIALS_MISSING');
    expect(result.body.teams[0].penalty).toBe(37);
  });

  test('uses saved credentials for a signed API retry before crawl fallback', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        urls.push(String(url));
        return urls.length === 1 ? apiFailed() : apiOk({
          ...apiStandings(['Alice']),
          contest: { ...apiStandings().contest, id: 708543 },
        });
      }) as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'trainer-key', apiSecret: 'trainer-secret' };
      },
      targetHandles: ['alice'],
      nowSeconds: () => 1_000,
      randomPrefix: () => 'abcdef',
      apiRateLimitMs: 0,
    });

    const anonymousParams = new URL(urls[0]).searchParams;
    const signedParams = new URL(urls[1]).searchParams;
    expect(result.statusCode).toBe(200);
    expect(urls).toHaveLength(2);
    expect(Array.from(anonymousParams.keys())).toEqual(['contestId']);
    expect(signedParams.get('apiKey')).toBe('trainer-key');
    expect(signedParams.get('showUnofficial')).toBe('false');
    expect(signedParams.get('time')).toBe('1000');
    expect(signedParams.get('apiSig')).toBe(
      'abcdeff92797f12c2c6311bc369b762f0cdd6e371145cd66e077a1ca290ed80d2cdbb78deef0725be2fce7610eba3800b17a1efdc029ab489adabba1043ee39e18622f',
    );
    expect(String(urls[1])).not.toContain('trainer-secret');
    expect(credentialProviderCalls).toBe(1);
    expect(result.body.providerMeta.authenticated).toBe(true);
  });

  test('keeps anonymous API upsolves on bounded contest.status paging', async () => {
    const requests: Array<{ url: string; cookie: string }> = [];
    const standings = apiStandings(['Alice']);
    standings.rows[0].points = 450;
    standings.rows[0].problemResults[1] = { points: 0, rejectedAttemptCount: 1 };
    const contestEnd = standings.contest.startTimeSeconds + standings.contest.durationSeconds;

    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          url: String(url),
          cookie: String((init?.headers as Record<string, string>)?.Cookie || ''),
        });
        if (new URL(String(url)).pathname.endsWith('/contest.status')) {
          return apiOk([
            apiSubmission(103, contestEnd + 300, 'OK'),
            apiSubmission(102, contestEnd + 200, 'WRONG_ANSWER'),
            apiSubmission(101, contestEnd - 1, 'WRONG_ANSWER'),
          ]);
        }
        return apiOk(standings);
      }) as any,
      targetHandles: ['alice'],
      includeUpsolves: true,
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      '/api/contest.standings',
      '/api/contest.status',
    ]);
    expect(new URL(requests[1].url).searchParams.get('count')).toBe('2000');
    expect(new URL(requests[1].url).searchParams.has('apiKey')).toBe(false);
    expect(requests.every((request) => request.cookie === '')).toBe(true);
    expect(result.body.teams[0].submissions[1].isUpsolve).toBe(true);
    expect(result.body.teams[0].submissions[1].rejectedAttemptCount).toBe(2);
    expect(result.body.providerMeta.upsolveSource).toBe('contest-status-api');
    expect(result.body.providerMeta.upsolveAuthenticated).toBe(false);
  });

  test('uses the signed contest.status API for private Gym upsolves', async () => {
    const urls: string[] = [];
    const standings = apiStandings(['Alice']);
    standings.contest.id = 708543;
    standings.rows[0].points = 450;
    standings.rows[0].problemResults[1] = { points: 0, rejectedAttemptCount: 0 };
    const contestEnd = standings.contest.startTimeSeconds + standings.contest.durationSeconds;

    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        const value = String(url);
        urls.push(value);
        const parsed = new URL(value);
        if (parsed.pathname.endsWith('/contest.standings') && !parsed.searchParams.has('apiKey')) {
          return apiFailed();
        }
        if (parsed.pathname.endsWith('/contest.status')) {
          return apiOk([
            apiSubmission(202, contestEnd + 200, 'OK'),
            apiSubmission(201, contestEnd + 100, 'WRONG_ANSWER'),
          ]);
        }
        return apiOk(standings);
      }) as any,
      credentialProvider: async () => ({ apiKey: 'trainer-key', apiSecret: 'trainer-secret' }),
      targetHandles: ['alice'],
      includeUpsolves: true,
      nowSeconds: () => 1_000,
      randomPrefix: () => 'abcdef',
      apiRateLimitMs: 0,
    });

    const statusParams = new URL(urls[2]).searchParams;
    expect(result.statusCode).toBe(200);
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      '/api/contest.standings',
      '/api/contest.standings',
      '/api/contest.status',
    ]);
    expect(statusParams.get('apiKey')).toBe('trainer-key');
    expect(statusParams.has('apiSig')).toBe(true);
    expect(statusParams.has('showUnofficial')).toBe(false);
    expect(urls.every((url) => !url.includes('trainer-secret'))).toBe(true);
    expect(result.body.teams[0].submissions[1].isUpsolve).toBe(true);
    expect(result.body.providerMeta.authenticated).toBe(true);
    expect(result.body.providerMeta.upsolveAuthenticated).toBe(true);
  });

  test('fails closed when contest.status exceeds the API upsolve page bound', async () => {
    const standings = apiStandings(['Alice']);
    const contestEnd = standings.contest.startTimeSeconds + standings.contest.durationSeconds;
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => (
        new URL(String(url)).pathname.endsWith('/contest.status')
          ? apiOk([apiSubmission(301, contestEnd + 100, 'WRONG_ANSWER')])
          : apiOk(standings)
      )) as any,
      targetHandles: ['alice'],
      includeUpsolves: true,
      upsolvePageSize: 1,
      upsolveMaxPages: 1,
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.code).toBe('CODEFORCES_UPSOLVE_LIMIT');
  });

  test('crawls bounded per-handle submission history when Codeforces upsolves are enabled', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        const value = String(url);
        urls.push(value);
        if (value.includes('/api/contest.standings')) return apiFailed();
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
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      '/api/contest.standings',
      '/gym/708543/standings/friends/true',
      '/submissions/Alice/contest/708543',
    ]);
    expect(result.body.teams[0].solvedCount).toBe(2);
    expect(result.body.providerMeta.includeUpsolves).toBe(true);
  });

  test('fails closed when a Codeforces upsolve history exceeds the page limit', async () => {
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        if (String(url).includes('/api/contest.standings')) return apiFailed();
        if (String(url).includes('/submissions/')) {
          return new Response(submissionPage('', '<a href="/submissions/Alice/contest/708543/page/11">11</a>'));
        }
        return new Response(numericPage('gym', '708543', 'Penalty', 'Penalty', gymHeaders, gymAliceRow));
      }) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      includeUpsolves: true,
      upsolveMaxPages: 10,
      apiRateLimitMs: 0,
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

  test('requests API credentials when neither signed API nor crawl fallback is available', async () => {
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async () => apiFailed('Public standings unavailable')) as any,
      targetHandles: ['alice'],
      apiRateLimitMs: 0,
    });
    expect(result.statusCode).toBe(428);
    expect(result.body.code).toBe('CODEFORCES_CREDENTIALS_MISSING');
  });

  test('preserves the signed API failure when the web fallback is also blocked', async () => {
    let apiCalls = 0;
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        if (new URL(String(url)).pathname.includes('/api/')) {
          apiCalls += 1;
          return apiFailed(apiCalls === 1
            ? 'contestId: Contest with id 708543 not found'
            : 'apiKey trainer-key is invalid');
        }
        return new Response('', { status: 503 });
      }) as any,
      credentialProvider: async () => ({ apiKey: 'trainer-key', apiSecret: 'trainer-secret' }),
      webSession: 'session-token',
      targetHandles: ['alice'],
      nowSeconds: () => 1_000,
      randomPrefix: () => 'abcdef',
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(502);
    expect(result.body.code).toBe('CODEFORCES_API_UNAVAILABLE');
    expect(result.body.message).toBe('apiKey [redacted] is invalid');
    expect(result.body.fallbackCode).toBe('CODEFORCES_WEB_BLOCKED');
    expect(JSON.stringify(result.body)).not.toContain('trainer-key');
    expect(JSON.stringify(result.body)).not.toContain('trainer-secret');
    expect(JSON.stringify(result.body)).not.toContain('session-token');
  });

  test('retains signed API rows for trainer mapping when no classroom handle matches', async () => {
    const urls: string[] = [];
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => {
        const value = String(url);
        urls.push(value);
        return urls.length === 1 ? apiFailed() : apiOk(apiStandings(['Bob']));
      }) as any,
      credentialProvider: async () => ({ apiKey: 'trainer-key', apiSecret: 'trainer-secret' }),
      webSession: 'session-token',
      targetHandles: ['alice'],
      nowSeconds: () => 1_000,
      randomPrefix: () => 'abcdef',
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(200);
    expect(result.body.teams.map((team: any) => team.username)).toEqual(['Bob']);
    expect(result.body.providerMeta.authenticated).toBe(true);
    expect(result.body.providerMeta.requestedClassroomHandleCount).toBe(1);
    expect(result.body.providerMeta.classroomHandleMatchCount).toBe(0);
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      '/api/contest.standings',
      '/api/contest.standings',
    ]);
  });

  test('keeps the web block when no signed API credentials are configured', async () => {
    const result = await fetchCodeforcesContestRank('708543', undefined, {
      fetchImpl: (async (url: RequestInfo | URL) => (
        new URL(String(url)).pathname.includes('/api/')
          ? apiFailed()
          : new Response('', { status: 503 })
      )) as any,
      webSession: 'session-token',
      targetHandles: ['alice'],
      apiRateLimitMs: 0,
    });

    expect(result.statusCode).toBe(503);
    expect(result.body.code).toBe('CODEFORCES_WEB_BLOCKED');
  });

  test('fails when friends standings contain no classroom handles', async () => {
    const result = await fetchCodeforcesContestRank('2258', undefined, {
      fetchImpl: (async () => new Response(
        numericPage('contest', '2258', '*', 'Hacks', contestHeaders, contestAliceRow),
      )) as any,
      webSession: 'session-token',
      targetHandles: ['bob'],
      apiRateLimitMs: 0,
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
      apiRateLimitMs: 0,
    });
    expect(result.statusCode).toBe(502);
    expect(result.body.code).toBe('CODEFORCES_RESPONSE_TOO_LARGE');
  });
});
