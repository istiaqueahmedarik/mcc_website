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
  apiRateLimitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  webSession?: string;
  targetHandles?: string[];
  eduConcurrency?: number;
  eduMaxPages?: number;
  includeUpsolves?: boolean;
  upsolvePageSize?: number;
  upsolveConcurrency?: number;
  upsolveMaxPages?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const DEFAULT_API_RATE_LIMIT_MS = 2_100;
const CONTESTANT_TYPE = 'CONTESTANT';
const CODEFORCES_WEB_BASE = 'https://codeforces.com';
const CODEFORCES_BROWSER_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
const EDU_SOURCE_REGEX = /^edu:(\d+):(\d+)(?::(friends)|:list:([A-Za-z0-9]+))?$/i;
const DEFAULT_WEB_CONCURRENCY = 6;
const DEFAULT_WEB_MAX_PAGES = 250;
const DEFAULT_UPSOLVE_CONCURRENCY = 3;
const DEFAULT_UPSOLVE_MAX_PAGES = 10;
const DEFAULT_API_UPSOLVE_PAGE_SIZE = 2_000;
const DEFAULT_API_UPSOLVE_MAX_PAGES = 25;
const MAX_UPSOLVE_HANDLES = 200;

let lastCodeforcesApiRequestAt = 0;
let codeforcesApiQueue: Promise<unknown> = Promise.resolve();

class CodeforcesWebError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 502) {
    super(message);
    this.name = 'CodeforcesWebError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

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

function parseFirstNumber(value: unknown, fallback = 0): number {
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? toFiniteNumber(match[0], fallback) : fallback;
}

function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10_000) / 10_000;
}

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeWebSession(value: unknown): string {
  const session = normalizeText(value, 1000);
  return /^[A-Za-z0-9._-]+$/.test(session) ? session : '';
}

export type CodeforcesContestSource =
  | { kind: 'contest'; contestId: string }
  | { kind: 'edu'; courseId: string; lessonId: string; filter: 'friends' | 'list'; listKey?: string };

type NumericSourceKind = 'contest' | 'gym';

type HtmlStandingsPageParseResult = {
  title: string;
  problems: any[];
  teams: any[];
  pageCount: number;
};

type CodeforcesWebSubmission = {
  id: number;
  handle: string;
  problem: { index: string };
  verdict: string;
};

type SubmissionPageParseResult = {
  submissions: CodeforcesWebSubmission[];
  pageCount: number;
};

export function parseCodeforcesContestSource(value: unknown): CodeforcesContestSource | null {
  const text = normalizeText(value, 300);
  if (/^\d+$/.test(text)) return { kind: 'contest', contestId: text };

  const eduMatch = text.match(EDU_SOURCE_REGEX);
  if (!eduMatch) return null;
  return {
    kind: 'edu',
    courseId: eduMatch[1],
    lessonId: eduMatch[2],
    filter: eduMatch[4] ? 'list' : 'friends',
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
  return `edu:${urlMatch[1]}:${urlMatch[2]}:friends`;
}

async function runCodeforcesApiRequest<T>(operation: () => Promise<T>, options: CodeforcesFetchOptions) {
  const sleep = options.sleep || defaultSleep;
  const rateLimitMs = Math.max(0, options.apiRateLimitMs ?? DEFAULT_API_RATE_LIMIT_MS);
  const run = codeforcesApiQueue.then(async () => {
    const waitMs = Math.max(0, rateLimitMs - (Date.now() - lastCodeforcesApiRequestAt));
    if (waitMs > 0) await sleep(waitMs);
    lastCodeforcesApiRequestAt = Date.now();
    return operation();
  });
  codeforcesApiQueue = run.catch(() => undefined);
  return run;
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
  return `${randomPrefix}${createHash('sha512')
    .update(`${randomPrefix}/${methodName}?${query}#${apiSecret}`)
    .digest('hex')}`;
}

async function resolveCodeforcesApiCredentials(options: CodeforcesFetchOptions): Promise<CodeforcesApiCredentials> {
  let apiKey = normalizeText(options.apiKey, 200);
  let apiSecret = normalizeText(options.apiSecret, 1000);
  if ((!apiKey || !apiSecret) && options.credentialProvider) {
    let provided: CodeforcesApiCredentials | null;
    try {
      provided = await options.credentialProvider();
    } catch {
      throw new CodeforcesApiError(
        'CODEFORCES_CREDENTIALS_UNAVAILABLE',
        'Saved Codeforces API credentials could not be decrypted or loaded.',
        503,
      );
    }
    apiKey = normalizeText(provided?.apiKey, 200);
    apiSecret = normalizeText(provided?.apiSecret, 1000);
  }
  if (!apiKey || !apiSecret) {
    throw new CodeforcesApiError(
      'CODEFORCES_CREDENTIALS_MISSING',
      'Codeforces API key and secret are required for an authenticated API retry.',
      428,
    );
  }
  return { apiKey, apiSecret };
}

async function requestCodeforcesApi(
  methodName: string,
  params: Record<string, string | number | boolean>,
  options: CodeforcesFetchOptions,
  signed = false,
) {
  const requestParams: Record<string, string | number | boolean> = { ...params };
  if (signed) {
    const credentials = await resolveCodeforcesApiCredentials(options);
    const randomPrefix = (options.randomPrefix || (() => randomBytes(3).toString('hex')))()
      .slice(0, 6)
      .padEnd(6, '0');
    requestParams.apiKey = credentials.apiKey;
    requestParams.time = (options.nowSeconds || (() => Math.floor(Date.now() / 1000)))();
    requestParams.apiSig = buildCodeforcesApiSignature(
      methodName,
      requestParams,
      credentials.apiSecret,
      randomPrefix,
    );
  }
  return runCodeforcesApiRequest(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const url = new URL(`${CODEFORCES_API_BASE}/${methodName}`);
    url.search = sortedQuery(requestParams);
    try {
      const response = await (options.fetchImpl || fetch)(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MCC Classroom Contest Rank Fetcher',
        },
        signal: controller.signal,
      });
      const text = await readTextWithLimit(response, options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES);
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new CodeforcesApiError('CODEFORCES_API_INVALID_JSON', 'Codeforces API returned a non-JSON response.');
      }
      let comment = normalizeText(payload?.comment || response.statusText, 1000);
      [requestParams.apiKey, requestParams.apiSig].forEach((sensitiveValue) => {
        const literal = String(sensitiveValue || '');
        if (literal) comment = comment.split(literal).join('[redacted]');
      });
      if (!response.ok || payload?.status !== 'OK') {
        throw new CodeforcesApiError(
          response.status === 429 || /call limit|too many requests/i.test(comment)
            ? 'CODEFORCES_API_RATE_LIMIT'
            : 'CODEFORCES_API_UNAVAILABLE',
          comment || `Codeforces API returned HTTP ${response.status}.`,
          response.status === 429 ? 429 : 502,
          comment,
        );
      }
      return payload.result;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new CodeforcesApiError('CODEFORCES_API_TIMEOUT', 'Codeforces API request timed out.', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, options);
}

function requestCodeforcesApiStandings(
  contestId: string,
  options: CodeforcesFetchOptions,
  signed = false,
) {
  return requestCodeforcesApi(
    'contest.standings',
    signed ? { contestId, showUnofficial: false } : { contestId },
    options,
    signed,
  );
}

function maxProblemPoints(problem: any) {
  const explicit = toFiniteNumber(problem?.points, NaN);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return 1;
}

export function normalizeCodeforcesApiStandings(raw: any, problemWeights?: number[], targetHandles?: string[]) {
  if (!raw || typeof raw !== 'object' || !raw.contest || !Array.isArray(raw.problems) || !Array.isArray(raw.rows)) {
    return { error: 'Invalid Codeforces standings payload.' };
  }

  const contest = raw.contest;
  const problems = raw.problems.map((problem: any, index: number) => ({
    contestId: problem?.contestId ?? contest.id,
    problemsetName: problem?.problemsetName,
    index: normalizeText(problem?.index || String.fromCharCode(65 + index), 20),
    name: normalizeText(problem?.name || `Problem ${index + 1}`, 300),
    type: problem?.type,
    points: maxProblemPoints(problem),
    rating: problem?.rating,
    tags: Array.isArray(problem?.tags) ? problem.tags : [],
  }));
  const { hasCustomWeights, weights } = configuredWeights(problemWeights, problems.length);
  const totalMaximumPoints = problems.reduce(
    (sum: number, problem: any) => sum + toFiniteNumber(problem.points, 1),
    0,
  ) || problems.length || 1;
  const totalWeight = weights.reduce((sum: number, weight: number) => sum + weight, 0);
  const hackNormalizationFactor = totalMaximumPoints > 0 ? totalWeight / totalMaximumPoints : 0;
  const officialRows = raw.rows.filter((row: any) => row?.party?.participantType === CONTESTANT_TYPE);
  const targetSet = Array.isArray(targetHandles)
    ? new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean))
    : null;
  const classroomHandleMatchCount = targetSet
    ? officialRows.filter((row: any) => (
      Array.isArray(row?.party?.members)
      && row.party.members.some((member: any) => targetSet.has(normalizeText(member?.handle, 120).toLowerCase()))
    )).length
    : null;

  // Numeric API snapshots retain official rows so trainers can review and map
  // handles that are not yet present in the verified classroom roster.
  const teams = officialRows.map((row: any) => {
    const party = row.party || {};
    const sourceHandles = Array.isArray(party.members)
      ? party.members.map((member: any) => normalizeText(member?.handle, 120)).filter(Boolean)
      : [];
    const teamName = normalizeText(party.teamName, 180);
    const username = teamName || sourceHandles[0] || `rank-${row.rank}`;
    const problemResults = Array.isArray(row.problemResults) ? row.problemResults : [];
    const submissions = problems.map((problem: any, problemIndex: number) => {
      const result = problemResults[problemIndex] || {};
      const points = toFiniteNumber(result.points, 0);
      return {
        problemIndex,
        problemLabel: problem.index,
        status: points > 0 ? 1 : 0,
        points,
        maxPoints: toFiniteNumber(problem.points, 1),
        penalty: result.penalty,
        rejectedAttemptCount: toFiniteNumber(result.rejectedAttemptCount, 0),
        bestSubmissionTimeSeconds: result.bestSubmissionTimeSeconds,
        type: result.type,
      };
    });
    const rawProblemPoints = submissions.reduce(
      (sum: number, submission: any) => sum + toFiniteNumber(submission.points, 0),
      0,
    );
    const nativePoints = toFiniteNumber(row.points, 0);
    const hackAdjustment = nativePoints - rawProblemPoints;
    const weightedProblemScore = submissions.reduce((sum: number, submission: any, index: number) => {
      const maximum = toFiniteNumber(submission.maxPoints, 1);
      const fraction = maximum > 0 ? toFiniteNumber(submission.points, 0) / maximum : 0;
      return sum + Math.max(0, Math.min(1, fraction)) * (weights[index] || 0);
    }, 0);
    return {
      teamId: party.teamId ?? null,
      username,
      realName: teamName || sourceHandles.join(', ') || username,
      avatarUrl: null,
      submissions,
      solvedCount: submissions.filter((submission: any) => submission.points > 0).length,
      penalty: toFiniteNumber(row.penalty, 0),
      finalScore: roundScore(hasCustomWeights
        ? weightedProblemScore + (hackAdjustment * hackNormalizationFactor)
        : nativePoints * problems.length / totalMaximumPoints),
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
        sourceType: 'contest-api',
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
    fullParticipantCount: officialRows.length,
    totalProblems: problems.length,
    problemWeights: weights,
    problems,
    teams,
    providerMeta: {
      sourceType: 'contest-api',
      contestId: String(contest.id),
      fullParticipantCount: officialRows.length,
      officialParticipantCount: officialRows.length,
      requestedClassroomHandleCount: targetSet?.size ?? null,
      classroomHandleMatchCount,
      hasCustomWeights,
      includeUpsolves: false,
    },
  };
}

async function readTextWithLimit(response: Response, maxResponseBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxResponseBytes) {
      throw new CodeforcesWebError('CODEFORCES_RESPONSE_TOO_LARGE', 'Codeforces response exceeded the configured size limit.');
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
      throw new CodeforcesWebError('CODEFORCES_RESPONSE_TOO_LARGE', 'Codeforces response exceeded the configured size limit.');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

async function readStreamWithLimit(stream: ReadableStream<Uint8Array>, maxResponseBytes: number, onLimit: () => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > maxResponseBytes) {
      onLimit();
      throw new CodeforcesWebError('CODEFORCES_RESPONSE_TOO_LARGE', 'Codeforces response exceeded the configured size limit.');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function requestCodeforcesWithCurl(
  url: string,
  webSession: string,
  timeoutMs: number,
  maxResponseBytes: number,
) {
  const process = Bun.spawn([
    'curl',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    String(Math.max(1, Math.ceil(timeoutMs / 1000))),
    '--write-out',
    '\n%{http_code}',
    '--config',
    '-',
    url,
  ], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  process.stdin.write([
    'header = "Accept: text/html,application/xhtml+xml"',
    'header = "Accept-Language: en-US,en;q=0.9"',
    `header = "Cookie: JSESSIONID=${webSession}"`,
    `user-agent = "${CODEFORCES_BROWSER_USER_AGENT}"`,
    '',
  ].join('\n'));
  process.stdin.end();

  const stderrPromise = new Response(process.stderr).text();
  const output = await readStreamWithLimit(process.stdout, maxResponseBytes + 32, () => process.kill());
  const exitCode = await process.exited;
  const stderr = normalizeText(await stderrPromise, 500);
  if (exitCode !== 0) {
    if (exitCode === 28) throw new CodeforcesWebError('CODEFORCES_WEB_TIMEOUT', 'Codeforces standings request timed out.', 504);
    throw new CodeforcesWebError('CODEFORCES_WEB_HTTP_ERROR', stderr || 'Codeforces standings request failed.', 502);
  }

  const statusSeparator = output.lastIndexOf('\n');
  const status = Number(output.slice(statusSeparator + 1));
  const text = statusSeparator >= 0 ? output.slice(0, statusSeparator) : '';
  if (!Number.isInteger(status)) {
    throw new CodeforcesWebError('CODEFORCES_WEB_HTTP_ERROR', 'Codeforces returned an unreadable HTTP response.', 502);
  }
  return { status, ok: status >= 200 && status < 300, text };
}

async function requestCodeforcesDocument(
  url: string,
  webSession: string,
  options: Pick<CodeforcesFetchOptions, 'fetchImpl' | 'timeoutMs' | 'maxResponseBytes'>,
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  if (!options.fetchImpl) {
    return requestCodeforcesWithCurl(url, webSession, timeoutMs, maxResponseBytes);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await options.fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: `JSESSIONID=${webSession}`,
        'User-Agent': CODEFORCES_BROWSER_USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    return {
      status: response.status,
      ok: response.ok,
      text: await readTextWithLimit(response, maxResponseBytes),
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new CodeforcesWebError('CODEFORCES_WEB_TIMEOUT', 'Codeforces standings request timed out.', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateCodeforcesSession(
  webSession: string,
  options: Pick<CodeforcesFetchOptions, 'fetchImpl' | 'timeoutMs' | 'maxResponseBytes'> = {},
) {
  const session = normalizeWebSession(webSession);
  if (!session) return false;
  try {
    const response = await requestCodeforcesDocument(`${CODEFORCES_WEB_BASE}/edu/courses`, session, {
      ...options,
      maxResponseBytes: Math.min(options.maxResponseBytes ?? 1024 * 1024, 1024 * 1024),
    });
    if (!response.ok) return false;
    const $ = cheerio.load(response.text);
    return $('a[href^="/profile/"]').length > 0 && $('a[href^="/enter"]').length === 0;
  } catch {
    return false;
  }
}

function parseAttemptCount(text: string) {
  const match = text.match(/[+-](\d+)?/);
  return match?.[1] ? Number(match[1]) : 0;
}

function removeProblemLabelPrefix(fullTitle: string, label: string) {
  if (!fullTitle.toLowerCase().startsWith(label.toLowerCase())) return fullTitle;
  return fullTitle.slice(label.length).replace(/^\s*-\s*/, '') || fullTitle;
}

function parsePageCount($: cheerio.CheerioAPI) {
  return Math.max(1, ...$('a[href*="page"]').map((_, element) => {
    const href = $(element).attr('href') || '';
    const url = new URL(href, CODEFORCES_WEB_BASE);
    const pathPage = url.pathname.match(/\/page\/(\d+)(?:\/|$)/i)?.[1];
    return toFiniteNumber(url.searchParams.get('page') || pathPage, 1);
  }).get());
}

export function parseCodeforcesEduStandingsPage(html: string, targetHandles?: string[]): HtmlStandingsPageParseResult {
  const $ = cheerio.load(html);
  const table = $('table.standings').first();
  const title = normalizeText($('.contest-name').first().text(), 300);
  if (!table.length || !title) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_SESSION_INVALID',
      'The Codeforces web session expired or cannot access this EDU course.',
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
      name: removeProblemLabelPrefix(fullTitle, label),
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

    const rank = parseFirstNumber(cells.eq(0).text(), rowIndex + 1);
    const declaredSolved = parseFirstNumber(cells.eq(2).text(), 0);
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

  return { title, problems, teams, pageCount: parsePageCount($) };
}

function numericSourceKind(contestId: string): NumericSourceKind {
  return Number(contestId) >= 100_000 ? 'gym' : 'contest';
}

export function parseCodeforcesNumericStandingsPage(
  html: string,
  contestId: string,
  targetHandles?: string[],
  sourceKind: NumericSourceKind = numericSourceKind(contestId),
): HtmlStandingsPageParseResult {
  const $ = cheerio.load(html);
  const table = $('table.standings').first();
  const title = normalizeText($('.contest-name').first().text(), 300);
  if (!table.length || !title) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_SESSION_INVALID',
      `The Codeforces web session expired or cannot access this ${sourceKind === 'gym' ? 'Gym' : 'contest'}.`,
      428,
    );
  }

  const problemPrefix = `/${sourceKind}/${contestId}/problem/`;
  const headerCells = table.find('tr').first().find('th');
  const problemColumnIndexes: number[] = [];
  headerCells.each((index, element) => {
    const href = normalizeText($(element).find('a').first().attr('href'), 500);
    if (href.startsWith(problemPrefix)) problemColumnIndexes.push(index);
  });
  if (problemColumnIndexes.length === 0) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_PARSE_ERROR',
      'Codeforces standings problem columns could not be parsed safely.',
    );
  }

  const targetSet = targetHandles
    ? new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean))
    : null;
  const problems = problemColumnIndexes.map((columnIndex, index) => {
    const header = headerCells.eq(columnIndex);
    const link = header.find('a').first();
    const href = normalizeText(link.attr('href'), 500);
    const label = normalizeText(link.text() || String(index + 1), 20);
    const fullHeader = normalizeText(header.text(), 300);
    const fullTitle = normalizeText(link.attr('title') || label, 300);
    const maximumPoints = parseFirstNumber(fullHeader.slice(fullHeader.indexOf(label) + label.length), 1);
    return {
      contestId: Number(contestId),
      problemId: null,
      index: label,
      name: removeProblemLabelPrefix(fullTitle, label),
      type: 'PROGRAMMING',
      points: maximumPoints > 0 ? maximumPoints : 1,
      href,
    };
  });

  const aggregateHeader = normalizeText(headerCells.eq(3).attr('title') || headerCells.eq(3).text(), 40).toLowerCase();
  const hasNativePenalty = aggregateHeader.includes('penalty');
  const teams = table.find('tr').slice(1).not('.standingsStatisticsRow').map((rowIndex, element) => {
    const cells = $(element).find('td');
    const sourceHandles = cells.eq(1).find('a[href^="/profile/"]').map((_, link) => (
      normalizeText($(link).text(), 120)
    )).get().filter(Boolean);
    if (
      sourceHandles.length === 0
      || (targetSet && !sourceHandles.some((handle) => targetSet.has(handle.toLowerCase())))
    ) return null;

    const rank = parseFirstNumber(cells.eq(0).text(), rowIndex + 1);
    const declaredScore = parseFirstNumber(cells.eq(2).text(), 0);
    const aggregateText = normalizeText(cells.eq(3).text(), 80);
    const nativePenalty = hasNativePenalty ? parseFirstNumber(aggregateText, 0) : 0;
    const hackNumbers = aggregateText.match(/[+-]\d+/g) || [];
    const successfulHackCount = hackNumbers.filter((value) => value.startsWith('+'))
      .reduce((sum, value) => sum + Number(value.slice(1)), 0);
    const unsuccessfulHackCount = hackNumbers.filter((value) => value.startsWith('-'))
      .reduce((sum, value) => sum + Number(value.slice(1)), 0);
    const submissions = problemColumnIndexes.map((columnIndex, problemIndex) => {
      const cell = cells.eq(columnIndex);
      const text = normalizeText(cell.text(), 80);
      const passedScore = normalizeText(cell.find('.cell-passed-system-test').first().text(), 40);
      const accepted = cell.find('.cell-accepted, .cell-passed-system-test').length > 0 || text.startsWith('+');
      const rejected = cell.find('.cell-rejected').length > 0 || text.startsWith('-');
      const rejectedAttemptCount = (accepted || rejected) ? parseAttemptCount(text) : 0;
      const problem = problems[problemIndex];
      const points = passedScore ? parseFirstNumber(passedScore, 0) : accepted ? 1 : 0;
      const problemId = normalizeText(cell.attr('problemid'), 40);
      if (problem && problemId && !problem.problemId) problem.problemId = Number(problemId) || problemId;
      return {
        problemIndex,
        problemLabel: problem?.index || String(problemIndex + 1),
        status: accepted ? 1 : 0,
        points,
        maxPoints: toFiniteNumber(problem?.points, 1),
        penalty: rejectedAttemptCount,
        rejectedAttemptCount,
        acceptedSubmissionId: normalizeText(cell.attr('acceptedsubmissionid'), 40) || null,
        type: accepted ? 'FINAL' : rejected ? 'REJECTED' : null,
      };
    });
    const solvedCount = submissions.filter((submission: any) => submission.status === 1).length;
    const rejectedAttemptCount = submissions.reduce(
      (sum: number, submission: any) => sum + submission.rejectedAttemptCount,
      0,
    );
    const nativePoints = hasNativePenalty ? Math.max(declaredScore, solvedCount) : declaredScore;
    const rawProblemPoints = submissions.reduce(
      (sum: number, submission: any) => sum + toFiniteNumber(submission.points, 0),
      0,
    );

    return {
      teamId: null,
      username: sourceHandles[0],
      realName: sourceHandles.join(', '),
      avatarUrl: null,
      submissions,
      solvedCount: hasNativePenalty ? nativePoints : solvedCount,
      penalty: nativePenalty,
      finalScore: nativePoints,
      nativeRank: rank,
      nativePoints,
      successfulHackCount,
      unsuccessfulHackCount,
      sourceHandles,
      provider: 'codeforces',
      providerMeta: {
        nativeRank: rank,
        nativePoints,
        nativePenalty,
        rejectedAttemptCount,
        rawProblemPoints,
        hackAdjustment: hasNativePenalty ? 0 : nativePoints - rawProblemPoints,
        sourceType: `${sourceKind}-web`,
      },
    };
  }).get().filter(Boolean);

  return { title, problems, teams, pageCount: parsePageCount($) };
}

export function parseCodeforcesSubmissionPage(
  html: string,
  contestId: string,
  targetHandle: string,
  sourceKind: NumericSourceKind = numericSourceKind(contestId),
): SubmissionPageParseResult {
  const $ = cheerio.load(html);
  const table = $('table.status-frame-datatable').first();
  if (!table.length) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_SESSION_INVALID',
      `The Codeforces web session expired or cannot access this ${sourceKind === 'gym' ? 'Gym' : 'contest'} submission history.`,
      428,
    );
  }

  const normalizedTarget = normalizeText(targetHandle, 120).toLowerCase();
  const problemPrefix = `/${sourceKind}/${contestId}/problem/`;
  const submissions = table.find('tr[data-submission-id]').map((_, element) => {
    const row = $(element);
    const handle = normalizeText(row.find('.status-party-cell a[href^="/profile/"]').first().text(), 120);
    const problemHref = normalizeText(row.find(`a[href^="${problemPrefix}"]`).first().attr('href'), 500);
    const problemIndex = normalizeText(problemHref.slice(problemPrefix.length).split(/[/?#]/)[0], 20);
    const verdict = normalizeText(
      row.find('.submissionVerdictWrapper').first().attr('submissionverdict'),
      80,
    ).toUpperCase();
    const id = parseFirstNumber(row.attr('data-submission-id'), 0);
    if (!id || !handle || handle.toLowerCase() !== normalizedTarget || !problemIndex || !verdict) return null;
    return {
      id,
      handle,
      problem: { index: problemIndex },
      verdict,
    };
  }).get().filter(Boolean) as CodeforcesWebSubmission[];

  return { submissions, pageCount: parsePageCount($) };
}

function requireWebSession(options: CodeforcesFetchOptions) {
  const session = normalizeWebSession(options.webSession);
  if (!session) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_SESSION_MISSING',
      'A Codeforces JSESSIONID is required to fetch friends standings.',
      428,
    );
  }
  return session;
}

async function requestCodeforcesHtml(url: string, options: CodeforcesFetchOptions) {
  const webSession = requireWebSession(options);
  const response = await requestCodeforcesDocument(url, webSession, {
    ...options,
    maxResponseBytes: Math.min(options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 4 * 1024 * 1024),
  });
  if (!response.ok) {
    throw new CodeforcesWebError(
      response.status === 403 || response.status === 503 ? 'CODEFORCES_WEB_BLOCKED' : 'CODEFORCES_WEB_HTTP_ERROR',
      response.status === 403 || response.status === 503
        ? 'Codeforces blocked the authenticated web request. Wait briefly, then reconnect the session.'
        : `Codeforces authenticated web request returned HTTP ${response.status}.`,
      response.status === 403 || response.status === 503 ? 503 : 502,
    );
  }
  return response.text;
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

function buildNumericStandingsUrl(contestId: string, sourceKind: NumericSourceKind, page: number) {
  const pageSuffix = page > 1 ? `/page/${page}` : '';
  return new URL(`/${sourceKind}/${contestId}/standings/friends/true${pageSuffix}`, CODEFORCES_WEB_BASE).toString();
}

function buildSubmissionHistoryUrl(contestId: string, handle: string, page: number) {
  const pageSuffix = page > 1 ? `/page/${page}` : '';
  return new URL(
    `/submissions/${encodeURIComponent(handle)}/contest/${contestId}${pageSuffix}`,
    CODEFORCES_WEB_BASE,
  ).toString();
}

function configuredWeights(problemWeights: number[] | undefined, problemCount: number) {
  const hasCustomWeights = Array.isArray(problemWeights)
    && problemWeights.length === problemCount
    && problemWeights.every((weight) => Number.isFinite(Number(weight)) && Number(weight) >= 0);
  return {
    hasCustomWeights,
    weights: hasCustomWeights ? problemWeights!.map(Number) : Array(problemCount).fill(1),
  };
}

function remainingTargetHandles(targetHandles: string[] | undefined, firstPage: HtmlStandingsPageParseResult) {
  const remaining = Array.isArray(targetHandles)
    ? new Set(targetHandles.map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean))
    : null;
  firstPage.teams.flatMap((team: any) => team.sourceHandles || [team.username]).forEach(
    (handle: string) => remaining?.delete(handle.toLowerCase()),
  );
  return remaining;
}

async function crawlRemainingPages(
  firstPage: HtmlStandingsPageParseResult,
  options: CodeforcesFetchOptions,
  requestPage: (page: number) => Promise<string>,
  parsePage: (html: string) => HtmlStandingsPageParseResult,
) {
  const maxPages = options.eduMaxPages ?? DEFAULT_WEB_MAX_PAGES;
  if (firstPage.pageCount > maxPages) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_TOO_MANY_PAGES',
      `This standings view has ${firstPage.pageCount} pages, above the safe limit of ${maxPages}.`,
      422,
    );
  }

  const pageNumbers = Array.isArray(options.targetHandles) && options.targetHandles.length === 0
    ? []
    : Array.from({ length: Math.max(0, firstPage.pageCount - 1) }, (_, index) => index + 2);
  const concurrency = Math.max(1, Math.min(8, options.eduConcurrency ?? DEFAULT_WEB_CONCURRENCY));
  const pages = [firstPage];
  const remaining = remainingTargetHandles(options.targetHandles, firstPage);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, pageNumbers.length) }, async () => {
    while (cursor < pageNumbers.length && (!remaining || remaining.size > 0)) {
      const current = cursor;
      cursor += 1;
      const parsed = parsePage(await requestPage(pageNumbers[current]));
      parsed.teams.flatMap((team: any) => team.sourceHandles || [team.username]).forEach(
        (handle: string) => remaining?.delete(handle.toLowerCase()),
      );
      pages.push(parsed);
    }
  });
  await Promise.all(workers);
  return pages;
}

function mergeWebTeams(
  pages: HtmlStandingsPageParseResult[],
  problems: any[],
  problemWeights: number[] | undefined,
) {
  const { hasCustomWeights, weights } = configuredWeights(problemWeights, problems.length);
  const teamByIdentity = new Map<string, any>();
  pages.flatMap((page) => page.teams).forEach((team: any) => {
    const identity = (team.sourceHandles || [team.username]).map((handle: string) => handle.toLowerCase()).join('|');
    const weightedScore = team.submissions.reduce((sum: number, submission: any, index: number) => {
      const maximum = toFiniteNumber(submission.maxPoints, 1);
      const fraction = maximum > 0 ? toFiniteNumber(submission.points, 0) / maximum : 0;
      return sum + Math.max(0, Math.min(1, fraction)) * (weights[index] || 0);
    }, 0);
    teamByIdentity.set(identity, {
      ...team,
      finalScore: hasCustomWeights ? roundScore(weightedScore) : team.nativePoints,
    });
  });
  return {
    teams: Array.from(teamByIdentity.values()).sort(
      (left: any, right: any) => left.nativeRank - right.nativeRank || left.username.localeCompare(right.username),
    ),
    weights,
    hasCustomWeights,
  };
}

function ensureClassroomFriends(teams: any[], targetHandles: string[] | undefined) {
  if (Array.isArray(targetHandles) && teams.length === 0) {
    throw new CodeforcesWebError(
      'CODEFORCES_WEB_NO_CLASSROOM_FRIENDS',
      'No classroom students were found in this Codeforces friends standings view. Add their handles as Codeforces friends and verify their saved Codeforces IDs.',
      422,
    );
  }
}

function codeforcesSubmissionHandles(submission: any): string[] {
  return Array.isArray(submission?.author?.members)
    ? submission.author.members
      .map((member: any) => normalizeText(member?.handle, 120))
      .filter(Boolean)
    : [];
}

async function fetchCodeforcesApiUpsolveSubmissions(
  contestId: string,
  contestEndSeconds: number,
  options: CodeforcesFetchOptions,
  signed: boolean,
) {
  const targetSet = new Set(
    (options.targetHandles || []).map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean),
  );
  if (targetSet.size === 0 || !contestEndSeconds) return [];
  if (targetSet.size > MAX_UPSOLVE_HANDLES) {
    throw new CodeforcesApiError(
      'CODEFORCES_UPSOLVE_LIMIT',
      `Codeforces upsolve fetching is limited to ${MAX_UPSOLVE_HANDLES} classroom handles per fetch.`,
      422,
    );
  }

  const pageSize = Math.max(1, Math.min(10_000, options.upsolvePageSize ?? DEFAULT_API_UPSOLVE_PAGE_SIZE));
  const maxPages = Math.max(1, Math.min(100, options.upsolveMaxPages ?? DEFAULT_API_UPSOLVE_MAX_PAGES));
  const submissions: CodeforcesWebSubmission[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const raw = await requestCodeforcesApi(
      'contest.status',
      { contestId, from: page * pageSize + 1, count: pageSize },
      options,
      signed,
    );
    if (!Array.isArray(raw)) {
      throw new CodeforcesApiError(
        'CODEFORCES_API_INVALID_PAYLOAD',
        'Codeforces contest status returned an invalid payload.',
      );
    }

    let reachedContestWindow = false;
    raw.forEach((submission: any) => {
      const createdAt = toFiniteNumber(submission?.creationTimeSeconds, 0);
      if (createdAt <= contestEndSeconds) {
        reachedContestWindow = true;
        return;
      }
      const handle = codeforcesSubmissionHandles(submission)
        .find((candidate) => targetSet.has(candidate.toLowerCase()));
      const id = toFiniteNumber(submission?.id, 0);
      const problemIndex = normalizeText(submission?.problem?.index, 20);
      const verdict = normalizeText(submission?.verdict, 80).toUpperCase();
      if (!handle || !id || !problemIndex || !verdict) return;
      submissions.push({ id, handle, problem: { index: problemIndex }, verdict });
    });

    if (reachedContestWindow || raw.length < pageSize) return submissions;
  }

  throw new CodeforcesApiError(
    'CODEFORCES_UPSOLVE_LIMIT',
    'Codeforces has too many post-contest submissions to calculate upsolves safely for this contest.',
    422,
  );
}

async function fetchCodeforcesWebUpsolveSubmissions(
  contestId: string,
  sourceKind: NumericSourceKind,
  teams: any[],
  options: CodeforcesFetchOptions,
) {
  const targetSet = new Set(
    (options.targetHandles || []).map((handle) => normalizeText(handle, 120).toLowerCase()).filter(Boolean),
  );
  const handles = Array.from(new Map(
    teams.flatMap((team: any) => team.sourceHandles || [team.username])
      .map((handle: string) => [handle.toLowerCase(), handle] as const)
      .filter(([normalized]) => targetSet.has(normalized)),
  ).values());
  if (handles.length === 0) return [];
  if (handles.length > MAX_UPSOLVE_HANDLES) {
    throw new CodeforcesWebError(
      'CODEFORCES_UPSOLVE_LIMIT',
      `Codeforces upsolve crawling is limited to ${MAX_UPSOLVE_HANDLES} classroom handles per fetch.`,
      422,
    );
  }

  const maxPages = Math.max(1, Math.min(50, options.upsolveMaxPages ?? DEFAULT_UPSOLVE_MAX_PAGES));
  const concurrency = Math.max(1, Math.min(6, options.upsolveConcurrency ?? DEFAULT_UPSOLVE_CONCURRENCY));
  const submissions: CodeforcesWebSubmission[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, handles.length) }, async () => {
    while (cursor < handles.length) {
      const current = cursor;
      cursor += 1;
      const handle = handles[current];
      const parsePage = (html: string) => parseCodeforcesSubmissionPage(html, contestId, handle, sourceKind);
      const firstPage = parsePage(await requestCodeforcesHtml(buildSubmissionHistoryUrl(contestId, handle, 1), options));
      if (firstPage.pageCount > maxPages) {
        throw new CodeforcesWebError(
          'CODEFORCES_UPSOLVE_LIMIT',
          `${handle}'s contest submission history has ${firstPage.pageCount} pages, above the safe limit of ${maxPages}.`,
          422,
        );
      }
      submissions.push(...firstPage.submissions);
      for (let page = 2; page <= firstPage.pageCount; page += 1) {
        const parsed = parsePage(await requestCodeforcesHtml(buildSubmissionHistoryUrl(contestId, handle, page), options));
        submissions.push(...parsed.submissions);
      }
    }
  });
  await Promise.all(workers);
  return submissions;
}

export function applyCodeforcesWebUpsolves(
  standings: any,
  submissions: CodeforcesWebSubmission[],
  hasCustomWeights = false,
  includesContestAttempts = true,
) {
  if (!standings || !Array.isArray(standings.teams) || !Array.isArray(standings.problems)) return standings;
  if (!Array.isArray(submissions) || submissions.length === 0) return standings;

  const problemIndexByLabel = new Map(
    standings.problems.map((problem: any, index: number) => [normalizeText(problem?.index, 20), index]),
  );
  const teamByHandle = new Map<string, any>();
  standings.teams.forEach((team: any) => {
    (team.sourceHandles || [team.username]).forEach((handle: string) => {
      const normalized = normalizeText(handle, 120).toLowerCase();
      if (normalized) teamByHandle.set(normalized, team);
    });
  });

  const states = new Map<string, { failed: number; officialRejected: number; countedOfficialAttempts: number }>();
  const changedTeams = new Set<any>();
  submissions.slice().sort((left, right) => left.id - right.id).forEach((submission) => {
    const team = teamByHandle.get(submission.handle.toLowerCase());
    const problemIndex = problemIndexByLabel.get(normalizeText(submission.problem?.index, 20));
    if (!team || problemIndex === undefined) return;
    const current = team.submissions?.[problemIndex];
    if (!current || current.status === 1) return;

    const key = `${standings.teams.indexOf(team)}:${problemIndex}`;
    const state = states.get(key) || {
      failed: 0,
      officialRejected: toFiniteNumber(current.rejectedAttemptCount, 0),
      countedOfficialAttempts: includesContestAttempts ? toFiniteNumber(current.rejectedAttemptCount, 0) : 0,
    };
    if (submission.verdict !== 'OK') {
      if (submission.verdict !== 'TESTING' && submission.verdict !== 'SUBMITTED') state.failed += 1;
      states.set(key, state);
      return;
    }

    const additionalFailures = Math.max(0, state.failed - state.countedOfficialAttempts);
    team.submissions[problemIndex] = {
      ...current,
      status: 1,
      points: toFiniteNumber(current.maxPoints, 1),
      penalty: additionalFailures,
      rejectedAttemptCount: state.officialRejected + additionalFailures,
      acceptedSubmissionId: String(submission.id),
      type: 'UPSOLVE',
      isUpsolve: true,
    };
    team.penalty = roundScore(toFiniteNumber(team.penalty, 0) + additionalFailures * 20);
    changedTeams.add(team);
    states.delete(key);
  });

  const weights = Array.isArray(standings.problemWeights) ? standings.problemWeights : [];
  changedTeams.forEach((team) => {
    const rawProblemPoints = team.submissions.reduce(
      (sum: number, submission: any) => sum + toFiniteNumber(submission.points, 0),
      0,
    );
    const weightedScore = team.submissions.reduce((sum: number, submission: any, index: number) => {
      const maximum = toFiniteNumber(submission.maxPoints, 1);
      const fraction = maximum > 0 ? toFiniteNumber(submission.points, 0) / maximum : 0;
      return sum + Math.max(0, Math.min(1, fraction)) * toFiniteNumber(weights[index], 0);
    }, 0);
    const hackAdjustment = toFiniteNumber(team.providerMeta?.hackAdjustment, 0);
    const hasNativePenalty = toFiniteNumber(team.providerMeta?.nativePenalty, 0) > 0
      || String(team.providerMeta?.sourceType || '').startsWith('gym-');
    team.solvedCount = team.submissions.filter((submission: any) => submission.status === 1).length;
    team.finalScore = hasCustomWeights
      ? roundScore(weightedScore)
      : roundScore(hasNativePenalty ? team.solvedCount : rawProblemPoints + hackAdjustment);
    team.nativePoints = team.finalScore;
    team.providerMeta = {
      ...(team.providerMeta || {}),
      nativePoints: team.nativePoints,
      rawProblemPoints,
      includeUpsolves: true,
      upsolveSolvedCount: team.submissions.filter((submission: any) => submission.isUpsolve).length,
    };
  });

  standings.providerMeta = {
    ...(standings.providerMeta || {}),
    includeUpsolves: true,
    upsolveSubmissionCount: submissions.length,
  };
  return standings;
}

async function fetchCodeforcesEduLessonRank(
  source: Extract<CodeforcesContestSource, { kind: 'edu' }>,
  problemWeights: number[] | undefined,
  options: CodeforcesFetchOptions,
): Promise<CodeforcesServiceResult> {
  try {
    const requestPage = (page: number) => requestCodeforcesHtml(buildEduStandingsUrl(source, page), options);
    const parsePage = (html: string) => parseCodeforcesEduStandingsPage(html, options.targetHandles);
    const firstPage = parsePage(await requestPage(1));
    const pages = await crawlRemainingPages(firstPage, options, requestPage, parsePage);
    const { teams, weights } = mergeWebTeams(pages, firstPage.problems, problemWeights);
    if (source.filter === 'friends') ensureClassroomFriends(teams, options.targetHandles);
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
        totalProblems: firstPage.problems.length,
        problemWeights: weights,
        problems: firstPage.problems,
        teams,
        providerMeta: {
          sourceType: 'edu',
          courseId: source.courseId,
          lessonId: source.lessonId,
          filter: source.filter,
          crawledPages: pages.length,
          fullParticipantCount: teams.length,
        },
      },
    };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}

async function fetchCodeforcesNumericWebRank(
  contestId: string,
  problemWeights: number[] | undefined,
  options: CodeforcesFetchOptions,
): Promise<CodeforcesServiceResult> {
  try {
    const sourceKind = numericSourceKind(contestId);
    const requestPage = (page: number) => requestCodeforcesHtml(
      buildNumericStandingsUrl(contestId, sourceKind, page),
      options,
    );
    const parsePage = (html: string) => parseCodeforcesNumericStandingsPage(
      html,
      contestId,
      options.targetHandles,
      sourceKind,
    );
    const firstPage = parsePage(await requestPage(1));
    const pages = await crawlRemainingPages(firstPage, options, requestPage, parsePage);
    const { teams, weights, hasCustomWeights } = mergeWebTeams(pages, firstPage.problems, problemWeights);
    ensureClassroomFriends(teams, options.targetHandles);

    const body = {
      contestInfo: {
        id: contestId,
        title: firstPage.title,
        begin: null,
        length: null,
        end: null,
        provider: 'codeforces',
        type: sourceKind === 'gym' ? 'GYM_WEB' : 'CONTEST_WEB',
        phase: 'FINISHED',
        frozen: false,
      },
      provider: 'codeforces',
      totalTeams: teams.length,
      fullParticipantCount: teams.length,
      totalProblems: firstPage.problems.length,
      problemWeights: weights,
      problems: firstPage.problems,
      teams,
      providerMeta: {
        sourceType: `${sourceKind}-web`,
        contestId,
        filter: 'friends',
        crawledPages: pages.length,
        fullParticipantCount: teams.length,
        includeUpsolves: false,
      },
    };
    if (options.includeUpsolves) {
      const upsolveSubmissions = await fetchCodeforcesWebUpsolveSubmissions(contestId, sourceKind, teams, options);
      applyCodeforcesWebUpsolves(body, upsolveSubmissions, hasCustomWeights);
    }
    return { statusCode: 200, body };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}

async function fetchCodeforcesNumericRank(
  contestId: string,
  problemWeights: number[] | undefined,
  options: CodeforcesFetchOptions,
): Promise<CodeforcesServiceResult> {
  let normalized: any = null;
  let apiError: any = null;
  let usedSignedApi = false;
  try {
    const raw = await requestCodeforcesApiStandings(contestId, options, false);
    normalized = normalizeCodeforcesApiStandings(raw, problemWeights, options.targetHandles);
    if (normalized.error) {
      throw new CodeforcesApiError('CODEFORCES_API_INVALID_PAYLOAD', normalized.error);
    }
  } catch (error: any) {
    apiError = error;
    try {
      const raw = await requestCodeforcesApiStandings(contestId, options, true);
      normalized = normalizeCodeforcesApiStandings(raw, problemWeights, options.targetHandles);
      if (normalized.error) {
        throw new CodeforcesApiError('CODEFORCES_API_INVALID_PAYLOAD', normalized.error);
      }
      normalized.providerMeta = {
        ...(normalized.providerMeta || {}),
        authenticated: true,
      };
      usedSignedApi = true;
    } catch (signedError: any) {
      apiError = signedError;
      normalized = null;
    }
  }

  if (!normalized) {
    const fallback = await fetchCodeforcesNumericWebRank(contestId, problemWeights, options);
    if (fallback.statusCode === 200) {
      fallback.body.providerMeta = {
        ...(fallback.body.providerMeta || {}),
        apiFallbackCode: apiError instanceof CodeforcesApiError
          ? apiError.code
          : 'CODEFORCES_API_UNEXPECTED_ERROR',
      };
      return fallback;
    }
    if (
      apiError instanceof CodeforcesApiError
      && (
        fallback.body?.code === 'CODEFORCES_WEB_SESSION_MISSING'
        || fallback.body?.code === 'CODEFORCES_WEB_SESSION_INVALID'
      )
    ) {
      return serviceErrorToResult(apiError);
    }
    if (
      apiError instanceof CodeforcesApiError
      && apiError.code !== 'CODEFORCES_CREDENTIALS_MISSING'
    ) {
      const apiFailure = serviceErrorToResult(apiError);
      apiFailure.body.fallbackCode = normalizeText(fallback.body?.code, 100) || null;
      return apiFailure;
    }
    return fallback;
  }

  try {
    if (options.includeUpsolves) {
      const contestStart = toFiniteNumber(normalized.contestInfo?.startTimeSeconds, 0);
      const contestDuration = toFiniteNumber(normalized.contestInfo?.durationSeconds, 0);
      const upsolveSubmissions = await fetchCodeforcesApiUpsolveSubmissions(
        contestId,
        contestStart + contestDuration,
        options,
        usedSignedApi,
      );
      applyCodeforcesWebUpsolves(
        normalized,
        upsolveSubmissions,
        Boolean(normalized.providerMeta?.hasCustomWeights),
        false,
      );
      normalized.providerMeta = {
        ...(normalized.providerMeta || {}),
        includeUpsolves: true,
        upsolveSubmissionCount: upsolveSubmissions.length,
        upsolveSource: 'contest-status-api',
        upsolveAuthenticated: usedSignedApi,
      };
    }
    return { statusCode: 200, body: normalized };
  } catch (error: any) {
    return serviceErrorToResult(error);
  }
}

function serviceErrorToResult(error: any): CodeforcesServiceResult {
  if (error instanceof CodeforcesWebError || error instanceof CodeforcesApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        status: 'error',
        code: error.code,
        message: error.message,
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
  return source.kind === 'edu'
    ? fetchCodeforcesEduLessonRank(source, problemWeights, options)
    : fetchCodeforcesNumericRank(source.contestId, problemWeights, options);
}
