import { createHash, randomBytes } from 'crypto';

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
};

const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const CODEFORCES_METHOD = 'contest.standings';
const DEFAULT_RATE_LIMIT_MS = 2100;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const CONTESTANT_TYPE = 'CONTESTANT';

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
    CODEFORCES_METHOD,
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
  if (!/^\d+$/.test(String(contestId))) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        code: 'CODEFORCES_INVALID_CONTEST_ID',
        message: 'Codeforces contest id must be numeric.',
      },
    };
  }

  try {
    const fetchRawStandings = async () => {
      try {
        return await requestCodeforcesJson({ contestId }, false, options);
      } catch (error: any) {
        const comment = error?.comment || error?.message || '';
        if (
          !(error instanceof CodeforcesApiError)
          || (!isAuthenticationRequired(comment) && !isPossiblyPrivateContestNotFound(comment, String(contestId)))
        ) {
          throw error;
        }
        return requestCodeforcesJson(
          { contestId, showUnofficial: false },
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

    return { statusCode: 200, body: normalized };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}
