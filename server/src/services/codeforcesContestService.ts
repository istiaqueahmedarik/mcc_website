import { createHash, randomBytes } from 'crypto';
import * as cheerio from 'cheerio';

export type CodeforcesServiceResult = {
  statusCode: number;
  body: any;
};

export type CodeforcesApiCredentials = {
  apiKey: string;
  apiSecret: string;
};

export type CodeforcesFetchOptions = {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  apiSecret?: string;
  credentialProvider?: () => Promise<CodeforcesApiCredentials | null>;
  nowSeconds?: () => number;
  randomPrefix?: () => string;
  sleep?: (ms: number) => Promise<void>;
  rateLimitMs?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  webSession?: string;
  targetHandles?: string[];
  eduConcurrency?: number;
  eduMaxPages?: number;
  includeUpsolves?: boolean;
  upsolvePageSize?: number;
  upsolveMaxPages?: number;
};

const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const CODEFORCES_STANDINGS_METHOD = 'contest.standings';
const CODEFORCES_STATUS_METHOD = 'contest.status';
const DEFAULT_RATE_LIMIT_MS = 2100;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const CONTESTANT_TYPE = 'CONTESTANT';
const CODEFORCES_WEB_BASE = 'https://codeforces.com';
const EDU_SOURCE_REGEX = /^edu:(\d+):(\d+)(?::(friends)|:list:([A-Za-z0-9]+))?$/i;
const DEFAULT_EDU_CONCURRENCY = 6;
const DEFAULT_EDU_MAX_PAGES = 250;
const DEFAULT_UPSOLVE_PAGE_SIZE = 2_000;
const DEFAULT_UPSOLVE_MAX_PAGES = 25;

let lastCodeforcesRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

class CodeforcesApiError extends Error {
  code: string;
  statusCode: number;
  comment?: string;

  constructor(code: string, message: string, statusCode = 502, comment?: string) {
    super(message);
    this.name = 'CodeforcesApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.comment = comment;
  }
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10_000) / 10_000;
}

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export type CodeforcesContestSource =
  | { kind: 'contest'; contestId: string }
  | { kind: 'edu'; courseId: string; lessonId: string; filter: 'all' | 'friends' | 'list'; listKey?: string };

export function parseCodeforcesContestSource(value: unknown): CodeforcesContestSource | null {
  const text = normalizeText(value, 300);
  if (/^\d+$/.test(text)) return { kind: 'contest', contestId: text };

  const eduMatch = text.match(EDU_SOURCE_REGEX);
  if (!eduMatch) return null;
  return {
    kind: 'edu',
    courseId: eduMatch[1],
    lessonId: eduMatch[2],
    filter: eduMatch[3] ? 'friends' : eduMatch[4] ? 'list' : 'all',
    ...(eduMatch[4] ? { listKey: eduMatch[4] } : {}),
  };
}

export function normalizeCodeforcesContestSource(value: unknown): string {
  const text = normalizeText(value, 300);
  const urlMatch = text.match(/codeforces\.com\/edu\/course\/(\d+)\/lesson\/(\d+)\/standings(?:\?([^#\s]*))?/i)
    || text.match(/^\/?edu\/course\/(\d+)\/lesson\/(\d+)\/standings(?:\?([^#\s]*))?/i);
  if (!urlMatch) return text;

  const params = new URLSearchParams(urlMatch[3] || '');
  const listKey = normalizeText(params.get('list'), 120);
  if (listKey && /^[A-Za-z0-9]+$/.test(listKey)) {
    return `edu:${urlMatch[1]}:${urlMatch[2]}:list:${listKey}`;
  }
  if (params.get('friends') === 'true') return `edu:${urlMatch[1]}:${urlMatch[2]}:friends`;
  return `edu:${urlMatch[1]}:${urlMatch[2]}`;
}

export async function validateCodeforcesEduSession(
  webSession: string,
  options: Pick<CodeforcesFetchOptions, 'fetchImpl' | 'timeoutMs' | 'maxResponseBytes'> = {},
) {
  const session = normalizeText(webSession, 1000);
  if (!session) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl || fetch)(`${CODEFORCES_WEB_BASE}/edu/courses?locale=en&mobile=true`, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Cookie: `JSESSIONID=${session}`,
        'User-Agent': 'MCC Classroom EDU Session Validator',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const html = await readTextWithLimit(response, Math.min(options.maxResponseBytes ?? 1024 * 1024, 1024 * 1024));
    const $ = cheerio.load(html);
    return $('a[href^="/profile/"]').length > 0 && $('a[href^="/enter"]').length === 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sortedQuery(params: Record<string, string | number | boolean>) {
  return Object.entries(params)
    .map(([key, value]) => [String(key), String(value)] as const)
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function buildCodeforcesApiSignature(
  methodName: string,
  params: Record<string, string | number | boolean>,
  apiSecret: string,
  randomPrefix: string,
) {
  const query = sortedQuery(params);
  const hash = createHash('sha512')
    .update(`${randomPrefix}/${methodName}?${query}#${apiSecret}`)
    .digest('hex');
  return `${randomPrefix}${hash}`;
}

function buildCodeforcesUrl(
  methodName: string,
  params: Record<string, string | number | boolean>,
  credentials?: { apiKey: string; apiSecret: string; nowSeconds: number; randomPrefix: string },
) {
  const requestParams: Record<string, string | number | boolean> = { ...params };
  if (credentials) {
    requestParams.apiKey = credentials.apiKey;
    requestParams.time = credentials.nowSeconds;
    requestParams.apiSig = buildCodeforcesApiSignature(
      methodName,
      requestParams,
      credentials.apiSecret,
      credentials.randomPrefix,
    );
  }
  return `${CODEFORCES_API_BASE}/${methodName}?${sortedQuery(requestParams)}`;
}

function isAuthenticationRequired(comment: string) {
  const text = comment.toLowerCase();
  return (
    text.includes('access denied')
    || text.includes('permission')
    || text.includes('private')
    || text.includes('not allowed')
    || text.includes('not available')
    || text.includes('authentication')
    || text.includes('login')
    || text.includes('view the contest')
  );
}

function isPossiblyPrivateContestNotFound(comment: string, contestId: string) {
  const numericContestId = Number(contestId);
  return (
    Number.isFinite(numericContestId)
    && numericContestId >= 100_000
    && /contest\s+with\s+id\s+\d+\s+not\s+found/i.test(comment)
  );
}

function isRateLimitFailure(comment: string, statusCode?: number) {
  const text = comment.toLowerCase();
  return statusCode === 429 || text.includes('call limit exceeded') || text.includes('too many requests');
}

async function runQueued<T>(operation: () => Promise<T>, options: Required<Pick<CodeforcesFetchOptions, 'sleep' | 'rateLimitMs'>>) {
  const run = requestQueue.then(async () => {
    const waitMs = Math.max(0, options.rateLimitMs - (Date.now() - lastCodeforcesRequestAt));
    if (waitMs > 0) await options.sleep(waitMs);
    lastCodeforcesRequestAt = Date.now();
    return operation();
  });
  requestQueue = run.catch(() => undefined);
  return run;
}

async function readTextWithLimit(response: Response, maxResponseBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxResponseBytes) {
      throw new CodeforcesApiError(
        'CODEFORCES_RESPONSE_TOO_LARGE',
        'Codeforces response exceeded the configured size limit.',
        502,
      );
    }
    return text;
  }

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > maxResponseBytes) {
      throw new CodeforcesApiError(
        'CODEFORCES_RESPONSE_TOO_LARGE',
        'Codeforces response exceeded the configured size limit.',
        502,
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

async function resolveSignedCredentials(options: CodeforcesFetchOptions): Promise<CodeforcesApiCredentials> {
  let apiKey = normalizeText(options.apiKey, 1000);
  let apiSecret = normalizeText(options.apiSecret, 1000);

  if ((!apiKey || !apiSecret) && options.credentialProvider) {
    let provided: CodeforcesApiCredentials | null = null;
    try {
      provided = await options.credentialProvider();
    } catch {
      throw new CodeforcesApiError(
        'CODEFORCES_CREDENTIALS_UNAVAILABLE',
        'Saved Codeforces API credentials could not be used. Re-save them from Codeforces API settings.',
        503,
      );
    }
    apiKey = normalizeText(provided?.apiKey, 1000);
    apiSecret = normalizeText(provided?.apiSecret, 1000);
  }

  if (!apiKey || !apiSecret) {
    throw new CodeforcesApiError(
      'CODEFORCES_CREDENTIALS_MISSING',
      'Your trainer Codeforces API credentials are required for this private Gym or mashup contest.',
      428,
    );
  }

  return { apiKey, apiSecret };
}

async function requestCodeforcesJson(
  methodName: string,
  params: Record<string, string | number | boolean>,
  signed: boolean,
  options: CodeforcesFetchOptions,
) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const sleep = options.sleep || defaultSleep;
  const rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  const nowSeconds = options.nowSeconds || (() => Math.floor(Date.now() / 1000));
  const randomPrefix = options.randomPrefix || (() => randomBytes(3).toString('hex'));
  const credentials = signed ? await resolveSignedCredentials(options) : null;

  const url = buildCodeforcesUrl(
    methodName,
    params,
    credentials
      ? {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        nowSeconds: nowSeconds(),
        randomPrefix: randomPrefix().slice(0, 6).padEnd(6, '0'),
      }
      : undefined,
  );

  return runQueued(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MCC Classroom Contest Rank Fetcher',
        },
        signal: controller.signal,
      });

      const text = await readTextWithLimit(response, maxResponseBytes);
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new CodeforcesApiError(
          'CODEFORCES_INVALID_JSON',
          'Codeforces returned a non-JSON response.',
          502,
        );
      }

      if (!response.ok) {
        const comment = normalizeText(payload?.comment || response.statusText, 1000);
        throw new CodeforcesApiError(
          isRateLimitFailure(comment, response.status) ? 'CODEFORCES_RATE_LIMIT' : 'CODEFORCES_HTTP_ERROR',
          comment || `Codeforces returned HTTP ${response.status}.`,
          response.status,
          comment,
        );
      }

      if (payload?.status !== 'OK') {
        const comment = normalizeText(payload?.comment || 'Codeforces API request failed.', 1000);
        throw new CodeforcesApiError(
          isRateLimitFailure(comment) ? 'CODEFORCES_RATE_LIMIT' : 'CODEFORCES_FAILED',
          comment,
          502,
          comment,
        );
      }

      return payload.result;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new CodeforcesApiError(
          'CODEFORCES_TIMEOUT',
          'Codeforces request timed out.',
          504,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, { sleep, rateLimitMs });
}

function maxProblemPoints(problem: any, contestType: string) {
  const explicit = toFiniteNumber(problem?.points, NaN);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (contestType === 'ICPC') return 1;
  return 1;
}

export function normalizeCodeforcesStandings(raw: any, problemWeights?: number[]) {
  if (!raw || typeof raw !== 'object' || !raw.contest || !Array.isArray(raw.problems) || !Array.isArray(raw.rows)) {
    return {
      error: 'Invalid Codeforces standings payload.',
    };
  }

  const contest = raw.contest;
  const contestType = normalizeText(contest.type, 20) || 'ICPC';
  const problems = raw.problems.map((problem: any, index: number) => ({
    contestId: problem?.contestId ?? contest.id,
    problemsetName: problem?.problemsetName,
    index: normalizeText(problem?.index || String.fromCharCode(65 + index), 20),
    name: normalizeText(problem?.name || `Problem ${index + 1}`, 300),
    type: problem?.type,
    points: maxProblemPoints(problem, contestType),
    rating: problem?.rating,
    tags: Array.isArray(problem?.tags) ? problem.tags : [],
  }));

  const totalProblems = problems.length;
  const defaultWeights = Array(totalProblems).fill(1);
  const hasCustomWeights = Array.isArray(problemWeights)
    && problemWeights.length === totalProblems
    && problemWeights.every((weight) => Number.isFinite(Number(weight)) && Number(weight) >= 0);
  const weights = hasCustomWeights ? problemWeights!.map((weight) => Number(weight)) : defaultWeights;
  const totalMaximumPoints = problems.reduce((sum: number, problem: any) => sum + toFiniteNumber(problem.points, 1), 0) || totalProblems || 1;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const hackNormalizationFactor = totalWeight > 0 ? totalWeight / totalMaximumPoints : 0;
  const officialRows = raw.rows.filter((row: any) => row?.party?.participantType === CONTESTANT_TYPE);

  const teams = officialRows.map((row: any) => {
    const party = row.party || {};
    const sourceHandles = Array.isArray(party.members)
      ? party.members.map((member: any) => normalizeText(member?.handle, 120)).filter(Boolean)
      : [];
    const teamName = normalizeText(party.teamName, 180);
    const username = teamName || sourceHandles[0] || `rank-${row.rank}`;
    const realName = teamName || sourceHandles.join(', ') || username;
    const problemResults = Array.isArray(row.problemResults) ? row.problemResults : [];
    const normalizedSubmissions = problemResults.map((result: any, problemIndex: number) => {
      const problem = problems[problemIndex] || { points: 1, index: String(problemIndex + 1) };
      const points = toFiniteNumber(result?.points, 0);
      return {
        problemIndex,
        problemLabel: problem.index,
        status: points > 0 ? 1 : 0,
        points,
        maxPoints: toFiniteNumber(problem.points, 1),
        penalty: result?.penalty,
        rejectedAttemptCount: toFiniteNumber(result?.rejectedAttemptCount, 0),
        bestSubmissionTimeSeconds: result?.bestSubmissionTimeSeconds,
        type: result?.type,
      };
    });

    const rawProblemPoints = normalizedSubmissions.reduce((sum: number, item: any) => sum + toFiniteNumber(item.points, 0), 0);
    const nativePoints = toFiniteNumber(row.points, 0);
    const hackAdjustment = nativePoints - rawProblemPoints;
    const weightedProblemScore = normalizedSubmissions.reduce((sum: number, item: any, index: number) => {
      const maxPoints = toFiniteNumber(item.maxPoints, 1);
      const earnedFraction = maxPoints > 0 ? toFiniteNumber(item.points, 0) / maxPoints : 0;
      return sum + earnedFraction * (weights[index] || 0);
    }, 0);
    const finalScore = hasCustomWeights
      ? weightedProblemScore + (hackAdjustment * hackNormalizationFactor)
      : nativePoints * (totalProblems || 1) / totalMaximumPoints;

    return {
      teamId: party.teamId ?? null,
      username,
      realName,
      avatarUrl: null,
      submissions: normalizedSubmissions,
      solvedCount: normalizedSubmissions.filter((item: any) => toFiniteNumber(item.points, 0) > 0).length,
      penalty: toFiniteNumber(row.penalty, 0),
      finalScore: roundScore(finalScore),
      nativeRank: row.rank,
      nativePoints,
      successfulHackCount: toFiniteNumber(row.successfulHackCount, 0),
      unsuccessfulHackCount: toFiniteNumber(row.unsuccessfulHackCount, 0),
      sourceHandles,
      provider: 'codeforces',
      providerMeta: {
        party,
        nativeRank: row.rank,
        nativePoints,
        rawProblemPoints,
        hackAdjustment,
        lastSubmissionTimeSeconds: row.lastSubmissionTimeSeconds,
      },
    };
  });

  return {
    contestInfo: {
      id: String(contest.id),
      title: contest.name,
      begin: contest.startTimeSeconds ? contest.startTimeSeconds * 1000 : null,
      length: contest.durationSeconds ? contest.durationSeconds * 1000 : null,
      end: contest.startTimeSeconds && contest.durationSeconds
        ? (contest.startTimeSeconds + contest.durationSeconds) * 1000
        : null,
      provider: 'codeforces',
      type: contest.type,
      phase: contest.phase,
      frozen: Boolean(contest.frozen),
      startTimeSeconds: contest.startTimeSeconds,
      durationSeconds: contest.durationSeconds,
      freezeDurationSeconds: contest.freezeDurationSeconds,
    },
    provider: 'codeforces',
    totalTeams: teams.length,
    fullParticipantCount: teams.length,
    totalProblems,
    problemWeights: weights,
    problems,
    teams,
    providerMeta: {
      contest,
      problems,
      totalMaximumPoints,
      fullParticipantCount: teams.length,
      officialParticipantCount: teams.length,
    },
  };
}

function codeforcesSubmissionHandles(submission: any): string[] {
  return Array.isArray(submission?.author?.members)
    ? submission.author.members.map((member: any) => normalizeText(member?.handle, 120)).filter(Boolean)
    : [];
}

export function applyCodeforcesUpsolves(
  standings: any,
  submissions: any[],
  targetHandles: string[] = [],
) {
  if (!standings || !Array.isArray(standings.teams) || !Array.isArray(standings.problems)) return standings;

  const targetSet = new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean));
  if (targetSet.size === 0 || !Array.isArray(submissions) || submissions.length === 0) return standings;

  const contestStart = toFiniteNumber(standings.contestInfo?.startTimeSeconds, 0);
  const duration = toFiniteNumber(standings.contestInfo?.durationSeconds, 0);
  const contestEnd = contestStart + duration;
  if (!contestStart || !duration) return standings;

  const problemIndexByLabel = new Map(
    standings.problems.map((problem: any, index: number) => [normalizeText(problem?.index, 20), index]),
  );
  const teamByHandle = new Map<string, any>();
  standings.teams.forEach((team: any) => {
    (Array.isArray(team.sourceHandles) ? team.sourceHandles : [team.username]).forEach((handle: any) => {
      const normalized = normalizeText(handle, 120).toLowerCase();
      if (normalized) teamByHandle.set(normalized, team);
    });
  });

  const createPracticeTeam = (handle: string) => {
    const team = {
      teamId: null,
      username: handle,
      realName: handle,
      avatarUrl: null,
      submissions: standings.problems.map((problem: any, problemIndex: number) => ({
        problemIndex,
        problemLabel: problem.index,
        status: 0,
        points: 0,
        maxPoints: toFiniteNumber(problem.points, 1),
        penalty: 0,
        rejectedAttemptCount: 0,
        bestSubmissionTimeSeconds: null,
        type: null,
      })),
      solvedCount: 0,
      penalty: 0,
      finalScore: 0,
      nativeRank: null,
      nativePoints: 0,
      successfulHackCount: 0,
      unsuccessfulHackCount: 0,
      sourceHandles: [handle],
      provider: 'codeforces',
      providerMeta: {
        party: { participantType: 'PRACTICE', members: [{ handle }] },
        nativeRank: null,
        nativePoints: 0,
        rawProblemPoints: 0,
        hackAdjustment: 0,
        upsolveSolvedCount: 0,
      },
    };
    standings.teams.push(team);
    teamByHandle.set(handle.toLowerCase(), team);
    return team;
  };

  const attempts = new Map<string, { team: any; problemIndex: number; failed: number }>();
  submissions
    .slice()
    .sort((left: any, right: any) => toFiniteNumber(left?.creationTimeSeconds, 0) - toFiniteNumber(right?.creationTimeSeconds, 0))
    .forEach((submission: any) => {
      const createdAt = toFiniteNumber(submission?.creationTimeSeconds, 0);
      if (createdAt <= contestEnd) return;
      const matchedHandle = codeforcesSubmissionHandles(submission)
        .find((handle) => targetSet.has(handle.toLowerCase()));
      if (!matchedHandle) return;

      const problemIndex = problemIndexByLabel.get(normalizeText(submission?.problem?.index, 20));
      if (problemIndex === undefined) return;
      const team = teamByHandle.get(matchedHandle.toLowerCase()) || createPracticeTeam(matchedHandle);
      const current = team.submissions?.[problemIndex];
      if (!current || current.status === 1) return;

      const key = `${standings.teams.indexOf(team)}:${problemIndex}`;
      const state = attempts.get(key) || { team, problemIndex, failed: 0 };
      if (submission?.verdict !== 'OK') {
        if (submission?.verdict && submission.verdict !== 'TESTING') state.failed += 1;
        attempts.set(key, state);
        return;
      }

      const acceptedTimeSeconds = Math.max(0, createdAt - contestStart);
      team.submissions[problemIndex] = {
        ...current,
        status: 1,
        points: toFiniteNumber(current.maxPoints, 1),
        penalty: state.failed,
        rejectedAttemptCount: state.failed,
        bestSubmissionTimeSeconds: acceptedTimeSeconds,
        type: 'UPSOLVE',
        isUpsolve: true,
      };
      team.penalty = roundScore(toFiniteNumber(team.penalty, 0) + state.failed * 20 + acceptedTimeSeconds / 60);
      team.providerMeta = {
        ...(team.providerMeta || {}),
        upsolveSolvedCount: toFiniteNumber(team.providerMeta?.upsolveSolvedCount, 0) + 1,
      };
      attempts.delete(key);
    });

  const weights = Array.isArray(standings.problemWeights) ? standings.problemWeights : [];
  const totalMaximumPoints = toFiniteNumber(standings.providerMeta?.totalMaximumPoints, standings.problems.length || 1);
  const totalWeight = weights.reduce((sum: number, weight: any) => sum + toFiniteNumber(weight, 0), 0);
  const hackNormalizationFactor = totalMaximumPoints > 0 ? totalWeight / totalMaximumPoints : 0;
  standings.teams.forEach((team: any) => {
    const upsolveSolvedCount = toFiniteNumber(team.providerMeta?.upsolveSolvedCount, 0);
    if (upsolveSolvedCount <= 0) return;
    const rawProblemPoints = team.submissions.reduce(
      (sum: number, item: any) => sum + toFiniteNumber(item?.points, 0),
      0,
    );
    const weightedProblemScore = team.submissions.reduce((sum: number, item: any, index: number) => {
      const maxPoints = toFiniteNumber(item?.maxPoints, 1);
      return sum + (maxPoints > 0 ? toFiniteNumber(item?.points, 0) / maxPoints : 0) * toFiniteNumber(weights[index], 0);
    }, 0);
    const hackAdjustment = toFiniteNumber(team.providerMeta?.hackAdjustment, 0);
    team.solvedCount = team.submissions.filter((item: any) => item?.status === 1).length;
    team.finalScore = roundScore(weightedProblemScore + hackAdjustment * hackNormalizationFactor);
    team.providerMeta = {
      ...team.providerMeta,
      effectiveProblemPoints: rawProblemPoints,
      includeUpsolves: true,
    };
  });

  standings.totalTeams = standings.teams.length;
  standings.fullParticipantCount = standings.teams.length;
  standings.providerMeta = {
    ...(standings.providerMeta || {}),
    includeUpsolves: true,
    upsolveSubmissionCount: submissions.length,
  };
  return standings;
}

async function fetchCodeforcesUpsolveSubmissions(
  contestId: string,
  contestEndSeconds: number,
  targetHandles: string[],
  options: CodeforcesFetchOptions,
) {
  const targetSet = new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean));
  if (targetSet.size === 0 || !contestEndSeconds) return [];

  const pageSize = Math.max(1, Math.min(10_000, options.upsolvePageSize ?? DEFAULT_UPSOLVE_PAGE_SIZE));
  const maxPages = Math.max(1, Math.min(100, options.upsolveMaxPages ?? DEFAULT_UPSOLVE_MAX_PAGES));
  const matches: any[] = [];
  let signed = false;
  let reachedContestWindow = false;

  for (let page = 0; page < maxPages; page += 1) {
    const params = { contestId, from: page * pageSize + 1, count: pageSize };
    let pageSubmissions: any[];
    try {
      pageSubmissions = await requestCodeforcesJson(CODEFORCES_STATUS_METHOD, params, signed, options);
    } catch (error: any) {
      const comment = error?.comment || error?.message || '';
      if (page === 0 && !signed && error instanceof CodeforcesApiError && isAuthenticationRequired(comment)) {
        signed = true;
        pageSubmissions = await requestCodeforcesJson(CODEFORCES_STATUS_METHOD, params, true, options);
      } else {
        throw error;
      }
    }

    if (!Array.isArray(pageSubmissions)) break;
    for (const submission of pageSubmissions) {
      const createdAt = toFiniteNumber(submission?.creationTimeSeconds, 0);
      if (createdAt <= contestEndSeconds) {
        reachedContestWindow = true;
        continue;
      }
      if (codeforcesSubmissionHandles(submission).some((handle) => targetSet.has(handle.toLowerCase()))) {
        matches.push(submission);
      }
    }
    if (reachedContestWindow || pageSubmissions.length < pageSize) return matches;
  }

  throw new CodeforcesApiError(
    'CODEFORCES_UPSOLVE_LIMIT',
    'Codeforces has too many post-contest submissions to calculate upsolves safely for this contest.',
    422,
  );
}

type EduPageParseResult = {
  title: string;
  problems: any[];
  teams: any[];
  pageCount: number;
};

function parseAttemptCount(text: string) {
  const match = text.match(/[+-](\d+)?/);
  return match?.[1] ? Number(match[1]) : 0;
}

export function parseCodeforcesEduStandingsPage(html: string, targetHandles?: string[]): EduPageParseResult {
  const $ = cheerio.load(html);
  const table = $('table.standings').first();
  const title = normalizeText($('.contest-name').first().text(), 300);
  if (!table.length || !title) {
    throw new CodeforcesApiError(
      'CODEFORCES_EDU_SESSION_INVALID',
      'Codeforces EDU session is expired or cannot access this course. Reconnect the JSESSIONID and try again.',
      428,
    );
  }

  const targetSet = targetHandles
    ? new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean))
    : null;
  const problems = table.find('tr').first().find('th').slice(3).map((index, element) => {
    const header = $(element);
    const link = header.find('a').first();
    const href = normalizeText(link.attr('href'), 500);
    const pathMatch = href.match(/\/lesson\/(\d+)\/(\d+)\/practice\/contest\/(\d+)\/problem\/([^/?#]+)/i);
    const label = normalizeText(link.text() || header.text() || String(index + 1), 20);
    const fullTitle = normalizeText(link.attr('title') || label, 300);
    return {
      contestId: pathMatch?.[3] ? Number(pathMatch[3]) : null,
      problemId: null,
      index: label,
      name: fullTitle.replace(new RegExp(`^${label}\\s*-\\s*`, 'i'), '') || fullTitle,
      type: 'PROGRAMMING',
      points: 1,
      eduStep: pathMatch?.[2] ? Number(pathMatch[2]) : null,
      href,
    };
  }).get();

  const teams = table.find('tr').slice(1).not('.standingsStatisticsRow').map((rowIndex, element) => {
    const cells = $(element).find('td');
    const handle = normalizeText(cells.eq(1).find('a[href^="/profile/"]').first().text(), 120);
    if (!handle || (targetSet && !targetSet.has(handle.toLowerCase()))) return null;

    const rank = toFiniteNumber(cells.eq(0).text().replace(/[^0-9.]/g, ''), rowIndex + 1);
    const declaredSolved = toFiniteNumber(cells.eq(2).text(), 0);
    const submissions = cells.slice(3).map((problemIndex, cellElement) => {
      const cell = $(cellElement);
      const text = normalizeText(cell.text(), 80);
      const accepted = cell.find('.cell-accepted').length > 0 || text.startsWith('+');
      const rejected = cell.find('.cell-rejected').length > 0 || text.startsWith('-');
      const rejectedAttemptCount = (accepted || rejected) ? parseAttemptCount(text) : 0;
      const problem = problems[problemIndex];
      const problemId = normalizeText(cell.attr('problemid'), 40);
      if (problem && problemId && !problem.problemId) problem.problemId = Number(problemId) || problemId;
      return {
        problemIndex,
        problemLabel: problem?.index || String(problemIndex + 1),
        status: accepted ? 1 : 0,
        points: accepted ? 1 : 0,
        maxPoints: 1,
        penalty: rejectedAttemptCount,
        rejectedAttemptCount,
        acceptedSubmissionId: normalizeText(cell.attr('acceptedsubmissionid'), 40) || null,
        type: accepted ? 'FINAL' : rejected ? 'REJECTED' : null,
      };
    }).get();
    const solvedCount = submissions.filter((submission: any) => submission.status === 1).length;
    const penalty = submissions.reduce((sum: number, submission: any) => sum + submission.rejectedAttemptCount, 0);

    return {
      teamId: null,
      username: handle,
      realName: handle,
      avatarUrl: null,
      submissions,
      solvedCount: Math.max(declaredSolved, solvedCount),
      penalty,
      finalScore: solvedCount,
      nativeRank: rank,
      nativePoints: solvedCount,
      successfulHackCount: 0,
      unsuccessfulHackCount: 0,
      sourceHandles: [handle],
      provider: 'codeforces',
      providerMeta: {
        nativeRank: rank,
        nativePoints: solvedCount,
        rejectedAttemptCount: penalty,
        sourceType: 'edu',
      },
    };
  }).get().filter(Boolean);

  const pageCount = Math.max(1, ...$('a[href*="page="]').map((_, element) => {
    const href = $(element).attr('href') || '';
    return toFiniteNumber(new URL(href, CODEFORCES_WEB_BASE).searchParams.get('page'), 1);
  }).get());

  return { title, problems, teams, pageCount };
}

function buildEduStandingsUrl(source: Extract<CodeforcesContestSource, { kind: 'edu' }>, page: number) {
  const url = new URL(`/edu/course/${source.courseId}/lesson/${source.lessonId}/standings`, CODEFORCES_WEB_BASE);
  url.searchParams.set('page', String(page));
  url.searchParams.set('locale', 'en');
  url.searchParams.set('mobile', 'true');
  if (source.filter === 'friends') url.searchParams.set('friends', 'true');
  if (source.filter === 'list' && source.listKey) url.searchParams.set('list', source.listKey);
  return url.toString();
}

async function requestCodeforcesEduPage(
  source: Extract<CodeforcesContestSource, { kind: 'edu' }>,
  page: number,
  options: CodeforcesFetchOptions,
) {
  const webSession = normalizeText(options.webSession, 1000);
  if (!webSession) {
    throw new CodeforcesApiError(
      'CODEFORCES_EDU_SESSION_MISSING',
      'A Codeforces JSESSIONID is required to fetch EDU course standings.',
      428,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl || fetch)(buildEduStandingsUrl(source, page), {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Cookie: `JSESSIONID=${webSession}`,
        'User-Agent': 'MCC Classroom EDU Standings Fetcher',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new CodeforcesApiError(
        response.status === 403 ? 'CODEFORCES_EDU_BLOCKED' : 'CODEFORCES_EDU_HTTP_ERROR',
        response.status === 403
          ? 'Codeforces blocked the EDU standings request. Wait briefly, then reconnect the session.'
          : `Codeforces EDU standings returned HTTP ${response.status}.`,
        response.status === 403 ? 503 : 502,
      );
    }
    return readTextWithLimit(response, Math.min(options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 4 * 1024 * 1024));
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new CodeforcesApiError('CODEFORCES_EDU_TIMEOUT', 'Codeforces EDU standings request timed out.', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCodeforcesEduLessonRank(
  source: Extract<CodeforcesContestSource, { kind: 'edu' }>,
  problemWeights: number[] | undefined,
  options: CodeforcesFetchOptions,
): Promise<CodeforcesServiceResult> {
  try {
    const firstHtml = await requestCodeforcesEduPage(source, 1, options);
    const firstPage = parseCodeforcesEduStandingsPage(firstHtml, options.targetHandles);
    const maxPages = options.eduMaxPages ?? DEFAULT_EDU_MAX_PAGES;
    if (firstPage.pageCount > maxPages) {
      throw new CodeforcesApiError(
        'CODEFORCES_EDU_TOO_MANY_PAGES',
        `This EDU standings source has ${firstPage.pageCount} pages; use a Codeforces list or friends standings URL limited to ${maxPages} pages.`,
        422,
      );
    }

    const pageNumbers = Array.isArray(options.targetHandles) && options.targetHandles.length === 0
      ? []
      : Array.from({ length: Math.max(0, firstPage.pageCount - 1) }, (_, index) => index + 2);
    const concurrency = Math.max(1, Math.min(8, options.eduConcurrency ?? DEFAULT_EDU_CONCURRENCY));
    const parsedPages: EduPageParseResult[] = [firstPage];
    const remainingHandles = Array.isArray(options.targetHandles)
      ? new Set(options.targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean))
      : null;
    firstPage.teams.forEach((team: any) => remainingHandles?.delete(String(team.username).toLowerCase()));
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, pageNumbers.length) }, async () => {
      while (cursor < pageNumbers.length && (!remainingHandles || remainingHandles.size > 0)) {
        const current = cursor;
        cursor += 1;
        const html = await requestCodeforcesEduPage(source, pageNumbers[current], options);
        const parsed = parseCodeforcesEduStandingsPage(html, options.targetHandles);
        parsed.teams.forEach((team: any) => remainingHandles?.delete(String(team.username).toLowerCase()));
        parsedPages.push(parsed);
      }
    });
    await Promise.all(workers);

    const problems = firstPage.problems;
    const hasCustomWeights = Array.isArray(problemWeights)
      && problemWeights.length === problems.length
      && problemWeights.every((weight) => Number.isFinite(Number(weight)) && Number(weight) >= 0);
    const weights = hasCustomWeights ? problemWeights!.map(Number) : Array(problems.length).fill(1);
    const teamByHandle = new Map<string, any>();
    parsedPages.flatMap((page) => page.teams).forEach((team: any) => {
      teamByHandle.set(String(team.username).toLowerCase(), {
        ...team,
        finalScore: roundScore(team.submissions.reduce(
          (sum: number, submission: any, index: number) => sum + (submission.status ? weights[index] || 0 : 0),
          0,
        )),
      });
    });
    const teams = Array.from(teamByHandle.values()).sort(
      (left: any, right: any) => left.nativeRank - right.nativeRank || left.username.localeCompare(right.username),
    );
    const sourceId = `edu:${source.courseId}:${source.lessonId}`;

    return {
      statusCode: 200,
      body: {
        contestInfo: {
          id: sourceId,
          title: firstPage.title,
          begin: null,
          length: null,
          end: null,
          provider: 'codeforces',
          type: 'EDU_COURSE',
          phase: 'FINISHED',
          frozen: false,
        },
        provider: 'codeforces',
        totalTeams: teams.length,
        fullParticipantCount: teams.length,
        totalProblems: problems.length,
        problemWeights: weights,
        problems,
        teams,
        providerMeta: {
          sourceType: 'edu',
          courseId: source.courseId,
          lessonId: source.lessonId,
          filter: source.filter,
          crawledPages: parsedPages.length,
          fullParticipantCount: teams.length,
        },
      },
    };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}

function serviceErrorToResult(error: any): CodeforcesServiceResult {
  if (error instanceof CodeforcesApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        status: 'error',
        code: error.code,
        message: error.message,
        comment: error.comment,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      status: 'error',
      code: 'CODEFORCES_UNEXPECTED_ERROR',
      message: error?.message || 'Failed to fetch Codeforces standings.',
    },
  };
}

export async function fetchCodeforcesContestRank(
  contestId: string,
  problemWeights?: number[],
  options: CodeforcesFetchOptions = {},
): Promise<CodeforcesServiceResult> {
  const source = parseCodeforcesContestSource(contestId);
  if (!source) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        code: 'CODEFORCES_INVALID_CONTEST_ID',
        message: 'Codeforces source must be a numeric contest id or an EDU lesson standings URL.',
      },
    };
  }
  if (source.kind === 'edu') {
    return fetchCodeforcesEduLessonRank(source, problemWeights, options);
  }

  const numericContestId = source.contestId;

  try {
    const fetchRawStandings = async () => {
      try {
        return await requestCodeforcesJson(CODEFORCES_STANDINGS_METHOD, { contestId: numericContestId }, false, options);
      } catch (error: any) {
        const comment = error?.comment || error?.message || '';
        if (
          !(error instanceof CodeforcesApiError)
          || (!isAuthenticationRequired(comment) && !isPossiblyPrivateContestNotFound(comment, numericContestId))
        ) {
          throw error;
        }
        return requestCodeforcesJson(
          CODEFORCES_STANDINGS_METHOD,
          { contestId: numericContestId, showUnofficial: false },
          true,
          options,
        );
      }
    };

    let raw: any;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        raw = await fetchRawStandings();
        break;
      } catch (error: any) {
        if (
          attempt === 0
          && error instanceof CodeforcesApiError
          && error.code === 'CODEFORCES_RATE_LIMIT'
        ) {
          await (options.sleep || defaultSleep)(options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS);
          continue;
        }
        throw error;
      }
    }

    const normalized = normalizeCodeforcesStandings(raw, problemWeights);
    if (normalized.error) {
      return {
        statusCode: 500,
        body: {
          status: 'error',
          code: 'CODEFORCES_NORMALIZE_FAILED',
          message: normalized.error,
        },
      };
    }

    if (options.includeUpsolves) {
      const contestStart = toFiniteNumber(normalized.contestInfo?.startTimeSeconds, 0);
      const contestDuration = toFiniteNumber(normalized.contestInfo?.durationSeconds, 0);
      const upsolveSubmissions = await fetchCodeforcesUpsolveSubmissions(
        numericContestId,
        contestStart + contestDuration,
        options.targetHandles || [],
        options,
      );
      applyCodeforcesUpsolves(normalized, upsolveSubmissions, options.targetHandles || []);
    }

    return { statusCode: 200, body: normalized };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}
