import { describe, expect, test } from 'bun:test';
import {
  applyCodeforcesUpsolves,
  buildCodeforcesApiSignature,
  fetchCodeforcesContestRank,
  normalizeCodeforcesContestSource,
  normalizeCodeforcesStandings,
  parseCodeforcesContestSource,
  parseCodeforcesEduStandingsPage,
  validateCodeforcesEduSession,
} from './codeforcesContestService';

function okResponse(result: any) {
  return new Response(JSON.stringify({ status: 'OK', result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function failedResponse(comment: string, status = 200) {
  return new Response(JSON.stringify({ status: 'FAILED', comment }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const baseContest = {
  contest: {
    id: 2,
    name: 'Codeforces Beta Round #2',
    type: 'ICPC',
    phase: 'FINISHED',
    frozen: false,
    durationSeconds: 7200,
    startTimeSeconds: 1267200000,
  },
  problems: [
    { contestId: 2, index: 'A', name: 'Winner' },
    { contestId: 2, index: 'B', name: 'The least round way' },
  ],
  rows: [
    {
      party: { participantType: 'CONTESTANT', members: [{ handle: 'alice' }] },
      rank: 1,
      points: 2,
      penalty: 42,
      problemResults: [{ points: 1 }, { points: 1 }],
    },
    {
      party: { participantType: 'PRACTICE', members: [{ handle: 'tourist' }] },
      rank: 2,
      points: 2,
      penalty: 10,
      problemResults: [{ points: 1 }, { points: 1 }],
    },
  ],
};

function eduPage(rows: string, pagination = '') {
  return `<!doctype html><html><head><title>Standings - Codeforces</title></head><body>
    <div class="contest-name">Binary Search</div>
    <table class="standings">
      <tr><th>#</th><th>Who</th><th>=</th>
        <th><a href="/edu/course/2/lesson/6/1/practice/contest/283911/problem/A" title="A - Binary Search">A</a></th>
        <th><a href="/edu/course/2/lesson/6/1/practice/contest/283911/problem/B" title="B - Closest Left">B</a></th>
      </tr>
      ${rows}
      <tr class="standingsStatisticsRow"><td colspan="5">stats</td></tr>
    </table>${pagination}
  </body></html>`;
}

const eduAliceRow = `<tr><td>1</td><td class="contestant-cell"><a href="/profile/Alice">Alice</a></td><td>2</td>
  <td problemid="1" acceptedsubmissionid="11"><span class="cell-accepted">+1</span></td>
  <td problemid="2" acceptedsubmissionid="12"><span class="cell-accepted">+</span></td></tr>`;

describe('Codeforces contest sources', () => {
  test('validates that a JSESSIONID reaches an authenticated Codeforces page', async () => {
    const authenticated = await validateCodeforcesEduSession('session-token', {
      fetchImpl: (async () => new Response('<a href="/profile/Trainer">Trainer</a>')) as any,
    });
    const signedOut = await validateCodeforcesEduSession('expired-token', {
      fetchImpl: (async () => new Response('<a href="/enter?back=%2Fedu%2Fcourses">Enter</a>')) as any,
    });
    expect(authenticated).toBe(true);
    expect(signedOut).toBe(false);
  });

  test('normalizes EDU standings URLs without mistaking course or lesson ids for contest ids', () => {
    expect(normalizeCodeforcesContestSource('https://codeforces.com/edu/course/2/lesson/6/standings')).toBe('edu:2:6:friends');
    expect(normalizeCodeforcesContestSource('https://codeforces.com/edu/course/2/lesson/6/standings?friends=true')).toBe('edu:2:6:friends');
    expect(normalizeCodeforcesContestSource('https://codeforces.com/edu/course/2/lesson/6/standings?list=abc123')).toBe('edu:2:6:list:abc123');
    expect(parseCodeforcesContestSource('edu:2:6')).toMatchObject({ kind: 'edu', filter: 'friends' });
  });

  test('parses EDU solved and rejected-attempt values and filters handles', () => {
    const bobRow = `<tr><td>2</td><td class="contestant-cell"><a href="/profile/Bob">Bob</a></td><td>0</td>
      <td><span class="cell-rejected">-2</span></td><td></td></tr>`;
    const parsed = parseCodeforcesEduStandingsPage(eduPage(`${eduAliceRow}${bobRow}`), ['alice']);

    expect(parsed.title).toBe('Binary Search');
    expect(parsed.problems).toHaveLength(2);
    expect(parsed.teams).toHaveLength(1);
    expect(parsed.teams[0].username).toBe('Alice');
    expect(parsed.teams[0].solvedCount).toBe(2);
    expect(parsed.teams[0].penalty).toBe(1);
    expect(parsed.teams[0].submissions[0].rejectedAttemptCount).toBe(1);
  });

  test('parses EDU problem labels containing regular-expression syntax', () => {
    const html = eduPage(eduAliceRow).replace(
      'title="A - Binary Search">A</a>',
      'title="* - Binary Search">*</a>',
    );

    const parsed = parseCodeforcesEduStandingsPage(html, ['alice']);

    expect(parsed.problems[0].index).toBe('*');
    expect(parsed.problems[0].name).toBe('Binary Search');
  });

  test('crawls paginated EDU standings with the web session and keeps target handles only', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(url));
      expect(String((init?.headers as Record<string, string>)?.Cookie || '')).toBe('JSESSIONID=session-token');
      const page = new URL(String(url)).searchParams.get('page');
      return new Response(page === '1'
        ? eduPage(eduAliceRow, '<a href="/edu/course/2/lesson/6/standings?page=2">201 - 400</a>')
        : eduPage('<tr><td>201</td><td class="contestant-cell"><a href="/profile/Bob">Bob</a></td><td>1</td><td><span class="cell-accepted">+</span></td><td></td></tr>'),
      { status: 200 });
    };

    const result = await fetchCodeforcesContestRank('edu:2:6', [2, 3], {
      fetchImpl: fetchImpl as any,
      webSession: 'session-token',
      targetHandles: ['alice', 'bob'],
      eduConcurrency: 1,
    });

    expect(result.statusCode).toBe(200);
    expect(urls).toHaveLength(2);
    expect(urls.every((url) => new URL(url).searchParams.get('friends') === 'true')).toBe(true);
    expect(result.body.totalProblems).toBe(2);
    expect(result.body.teams).toHaveLength(2);
    expect(result.body.teams[0].finalScore).toBe(5);
    expect(result.body.providerMeta.sourceType).toBe('edu');
  });

  test('reports when friends-only EDU standings contain no classroom student', async () => {
    const result = await fetchCodeforcesContestRank('edu:2:6', undefined, {
      fetchImpl: (async () => new Response(eduPage(eduAliceRow), { status: 200 })) as any,
      webSession: 'session-token',
      targetHandles: ['bob'],
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.code).toBe('CODEFORCES_EDU_NO_CLASSROOM_FRIENDS');
    expect(result.body.message).toContain('Codeforces friends standings');
  });

  test('rejects EDU HTML that does not contain an accessible standings table', () => {
    expect(() => parseCodeforcesEduStandingsPage('<title>Courses - Codeforces</title>')).toThrow('session is expired');
  });
});

describe('normalizeCodeforcesStandings', () => {
  test('normalizes ICPC rows and excludes non-official participant types', () => {
    const normalized = normalizeCodeforcesStandings(baseContest);

    expect(normalized.error).toBeUndefined();
    expect(normalized.totalProblems).toBe(2);
    expect(normalized.totalTeams).toBe(1);
    expect(normalized.contestInfo.phase).toBe('FINISHED');
    expect(normalized.contestInfo.frozen).toBe(false);
    expect(normalized.teams[0].username).toBe('alice');
    expect(normalized.teams[0].solvedCount).toBe(2);
    expect(normalized.teams[0].finalScore).toBe(2);
    expect(normalized.teams[0].nativeRank).toBe(1);
  });

  test('scales native Codeforces points without custom weights', () => {
    const normalized = normalizeCodeforcesStandings({
      ...baseContest,
      contest: { ...baseContest.contest, id: 2255, type: 'CF' },
      problems: [
        { contestId: 2255, index: 'A', name: 'A', points: 500 },
        { contestId: 2255, index: 'B', name: 'B', points: 1000 },
      ],
      rows: [{
        party: { participantType: 'CONTESTANT', members: [{ handle: 'bob' }] },
        rank: 7,
        points: 1300,
        penalty: 100,
        problemResults: [{ points: 250 }, { points: 1000 }],
      }],
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.teams[0].solvedCount).toBe(2);
    expect(normalized.teams[0].finalScore).toBe(1.7333);
    expect(normalized.teams[0].nativePoints).toBe(1300);
  });

  test('applies custom weights by earned fraction and keeps hack adjustment normalized', () => {
    const normalized = normalizeCodeforcesStandings({
      ...baseContest,
      contest: { ...baseContest.contest, id: 2255, type: 'CF' },
      problems: [
        { contestId: 2255, index: 'A', name: 'A', points: 500 },
        { contestId: 2255, index: 'B', name: 'B', points: 1000 },
      ],
      rows: [{
        party: { participantType: 'CONTESTANT', members: [{ handle: 'bob' }] },
        rank: 7,
        points: 1300,
        penalty: 100,
        problemResults: [{ points: 250 }, { points: 1000 }],
      }],
    }, [2, 3]);

    expect(normalized.error).toBeUndefined();
    expect(normalized.problemWeights).toEqual([2, 3]);
    expect(normalized.teams[0].providerMeta.hackAdjustment).toBe(50);
    expect(normalized.teams[0].finalScore).toBe(4.1667);
  });

  test('adds accepted post-contest submissions only for classroom handles', () => {
    const normalized = normalizeCodeforcesStandings({
      ...baseContest,
      rows: [{
        party: { participantType: 'CONTESTANT', members: [{ handle: 'alice' }] },
        rank: 1,
        points: 1,
        penalty: 30,
        problemResults: [{ points: 1 }, { points: 0 }],
      }],
    });
    const contestEnd = baseContest.contest.startTimeSeconds + baseContest.contest.durationSeconds;

    applyCodeforcesUpsolves(normalized, [
      {
        creationTimeSeconds: contestEnd + 60,
        verdict: 'WRONG_ANSWER',
        problem: { index: 'B' },
        author: { members: [{ handle: 'alice' }] },
      },
      {
        creationTimeSeconds: contestEnd + 120,
        verdict: 'OK',
        problem: { index: 'B' },
        author: { members: [{ handle: 'alice' }] },
      },
      {
        creationTimeSeconds: contestEnd + 120,
        verdict: 'OK',
        problem: { index: 'A' },
        author: { members: [{ handle: 'not-in-classroom' }] },
      },
    ], ['alice']);

    expect(normalized.teams).toHaveLength(1);
    expect(normalized.teams[0].solvedCount).toBe(2);
    expect(normalized.teams[0].submissions[1].type).toBe('UPSOLVE');
    expect(normalized.teams[0].submissions[1].rejectedAttemptCount).toBe(1);
    expect(normalized.teams[0].providerMeta.upsolveSolvedCount).toBe(1);
  });

  test('creates a practice-only row when a classroom handle upsolves without competing', () => {
    const normalized = normalizeCodeforcesStandings({ ...baseContest, rows: [] });
    const contestEnd = baseContest.contest.startTimeSeconds + baseContest.contest.durationSeconds;

    applyCodeforcesUpsolves(normalized, [{
      creationTimeSeconds: contestEnd + 60,
      verdict: 'OK',
      problem: { index: 'A' },
      author: { members: [{ handle: 'bob' }] },
    }], ['bob']);

    expect(normalized.teams).toHaveLength(1);
    expect(normalized.teams[0].username).toBe('bob');
    expect(normalized.teams[0].solvedCount).toBe(1);
    expect(normalized.teams[0].providerMeta.party.participantType).toBe('PRACTICE');
  });
});

describe('fetchCodeforcesContestRank', () => {
  test('fetches public standings anonymously with only contestId', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return okResponse(baseContest);
    };

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'key', apiSecret: 'secret' };
      },
      rateLimitMs: 0,
    });
    const searchParams = new URL(urls[0]).searchParams;

    expect(result.statusCode).toBe(200);
    expect(Array.from(searchParams.keys())).toEqual(['contestId']);
    expect(searchParams.get('contestId')).toBe('2');
    expect(credentialProviderCalls).toBe(0);
  });

  test('fetches post-contest submissions only when upsolves are enabled', async () => {
    const urls: string[] = [];
    const contestEnd = baseContest.contest.startTimeSeconds + baseContest.contest.durationSeconds;
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return urls.length === 1
        ? okResponse({
          ...baseContest,
          rows: [{
            party: { participantType: 'CONTESTANT', members: [{ handle: 'alice' }] },
            rank: 1,
            points: 1,
            penalty: 10,
            problemResults: [{ points: 1 }, { points: 0 }],
          }],
        })
        : okResponse([
          {
            creationTimeSeconds: contestEnd + 60,
            verdict: 'OK',
            problem: { index: 'B' },
            author: { members: [{ handle: 'alice' }] },
          },
          {
            creationTimeSeconds: contestEnd,
            verdict: 'WRONG_ANSWER',
            problem: { index: 'B' },
            author: { members: [{ handle: 'alice' }] },
          },
        ]);
    };

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      includeUpsolves: true,
      targetHandles: ['alice'],
      rateLimitMs: 0,
      upsolvePageSize: 10,
    });

    expect(result.statusCode).toBe(200);
    expect(urls).toHaveLength(2);
    expect(new URL(urls[1]).pathname).toEndWith('/contest.status');
    expect(result.body.teams[0].solvedCount).toBe(2);
  });

  test('retries with signed credentials when access requires authentication', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return urls.length === 1
        ? failedResponse('Access denied. You are not allowed to view the contest.')
        : okResponse(baseContest);
    };

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      apiKey: 'key',
      apiSecret: 'secret',
      nowSeconds: () => 1000,
      randomPrefix: () => 'abcdef',
      rateLimitMs: 0,
    });
    const firstParams = new URL(urls[0]).searchParams;
    const secondParams = new URL(urls[1]).searchParams;

    expect(result.statusCode).toBe(200);
    expect(Array.from(firstParams.keys())).toEqual(['contestId']);
    expect(secondParams.get('apiKey')).toBe('key');
    expect(secondParams.get('showUnofficial')).toBe('false');
    expect(String(secondParams.get('apiSig') || '').startsWith('abcdef')).toBe(true);
  });

  test('uses a lazy credential provider for authenticated standings retry', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return urls.length === 1
        ? failedResponse('Access denied. You are not allowed to view the contest.')
        : okResponse(baseContest);
    };

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'trainer-key', apiSecret: 'trainer-secret' };
      },
      nowSeconds: () => 1000,
      randomPrefix: () => 'abcdef',
      rateLimitMs: 0,
    });

    const secondParams = new URL(urls[1]).searchParams;

    expect(result.statusCode).toBe(200);
    expect(credentialProviderCalls).toBe(1);
    expect(secondParams.get('apiKey')).toBe('trainer-key');
    expect(secondParams.get('apiSig')).toContain('abcdef');
  });

  test('retries high-number hidden contests with signed credentials after anonymous not found', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return urls.length === 1
        ? failedResponse('contestId: Contest with id 626074 not found')
        : okResponse({ ...baseContest, contest: { ...baseContest.contest, id: 626074 } });
    };

    const result = await fetchCodeforcesContestRank('626074', undefined, {
      fetchImpl: fetchImpl as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'trainer-key', apiSecret: 'trainer-secret' };
      },
      nowSeconds: () => 1000,
      randomPrefix: () => 'abcdef',
      rateLimitMs: 0,
    });

    const secondParams = new URL(urls[1]).searchParams;

    expect(result.statusCode).toBe(200);
    expect(credentialProviderCalls).toBe(1);
    expect(secondParams.get('contestId')).toBe('626074');
    expect(secondParams.get('apiKey')).toBe('trainer-key');
  });

  test('does not retry low-number missing contests as private contests', async () => {
    const urls: string[] = [];
    let credentialProviderCalls = 0;
    const fetchImpl = async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return failedResponse('contestId: Contest with id 999 not found');
    };

    const result = await fetchCodeforcesContestRank('999', undefined, {
      fetchImpl: fetchImpl as any,
      credentialProvider: async () => {
        credentialProviderCalls += 1;
        return { apiKey: 'trainer-key', apiSecret: 'trainer-secret' };
      },
      rateLimitMs: 0,
    });

    expect(result.statusCode).toBe(502);
    expect(urls.length).toBe(1);
    expect(credentialProviderCalls).toBe(0);
  });

  test('returns credential guidance when signed retry has no credentials', async () => {
    const fetchImpl = async () => failedResponse('Access denied. You are not allowed to view the contest.');

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      apiKey: '',
      apiSecret: '',
      rateLimitMs: 0,
    });

    expect(result.statusCode).toBe(428);
    expect(result.body.code).toBe('CODEFORCES_CREDENTIALS_MISSING');
  });

  test('returns unusable credential guidance when credential provider fails', async () => {
    const fetchImpl = async () => failedResponse('Access denied. You are not allowed to view the contest.');

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      credentialProvider: async () => {
        throw new Error('decrypt failed');
      },
      rateLimitMs: 0,
    });

    expect(result.statusCode).toBe(503);
    expect(result.body.code).toBe('CODEFORCES_CREDENTIALS_UNAVAILABLE');
  });

  test('retries once after a Codeforces rate-limit failure', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const fetchImpl = async () => {
      calls += 1;
      return calls === 1
        ? failedResponse('Call limit exceeded')
        : okResponse(baseContest);
    };

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      rateLimitMs: 12,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result.statusCode).toBe(200);
    expect(calls).toBe(2);
    expect(sleeps).toContain(12);
  });

  test('guards oversized responses before parsing', async () => {
    const fetchImpl = async () => new Response('{"status":"OK","result":', { status: 200 });

    const result = await fetchCodeforcesContestRank('2', undefined, {
      fetchImpl: fetchImpl as any,
      rateLimitMs: 0,
      maxResponseBytes: 8,
    });

    expect(result.statusCode).toBe(502);
    expect(result.body.code).toBe('CODEFORCES_RESPONSE_TOO_LARGE');
  });
});

describe('buildCodeforcesApiSignature', () => {
  test('uses sorted params and six-character random prefix', () => {
    const params = {
      contestId: 2,
      apiKey: 'key',
      time: 1000,
    };
    const signature = buildCodeforcesApiSignature('contest.standings', params, 'secret', 'abcdef');

    expect(signature.length).toBe(134);
    expect(signature.startsWith('abcdef')).toBe(true);
  });
});
