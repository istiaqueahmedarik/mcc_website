const HOUR_MS = 60 * 60 * 1000;
const WINDOWS = [24, 48, 72];

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Use absolute accepted timestamps where available; relative standings times
// require a verified contest start. Never substitute fetch/override timestamps.
function solveTime(submission: any, meta: any): number | null {
  const absolute = finiteNumber(submission.acceptedAtSeconds);
  if (absolute !== null && absolute > 0) return absolute * 1000;
  if (submission.isUpsolve) return null;
  const begin = finiteNumber(meta.begin);
  const seconds = finiteNumber(submission.timeSeconds ?? submission.bestSubmissionTimeSeconds);
  return begin !== null && begin > 0 && seconds !== null && seconds >= 0
    ? begin + seconds * 1000
    : null;
}

export function buildContestPerformance(user: any, metaById: Record<string, any>, asOf: string, missingContests = false) {
  const now = Date.parse(asOf);
  if (!Number.isFinite(now)) throw new Error('Performance requires a valid report timestamp');
  let incomplete = missingContests;
  const contests = Object.entries(user.contests || {}).map(([contestId, value]) => {
    const performance = value as any;
    const meta = metaById[contestId] || {};
    const problems = new Map<string, { time: number | null; unknown: boolean }>();
    for (const submission of performance.submissions || []) {
      if (Number(submission.status) !== 1) continue;
      const key = submission.problemIndex ?? submission.problemLabel;
      if (key === null || key === undefined || key === '') { incomplete = true; continue; }
      const time = solveTime(submission, meta);
      const valid = time !== null && time <= now;
      const previous = problems.get(String(key));
      problems.set(String(key), {
        time: valid ? Math.min(previous?.time ?? Infinity, time) : previous?.time ?? null,
        unknown: Boolean(previous?.unknown || !valid),
      });
    }
    const unknown = Boolean(performance.manualSolveOverride)
      || Number(performance.solved || 0) > problems.size
      || [...problems.values()].some((problem) => problem.unknown);
    incomplete ||= unknown;
    return {
      contestId,
      title: performance.contestTitle || meta.title || contestId,
      fetchedAt: meta.fetchedAt || null,
      incomplete: unknown,
      counts: WINDOWS.map((hours) => [...problems.values()].filter((problem) => (
        !problem.unknown && problem.time !== null && problem.time >= now - hours * HOUR_MS
      )).length),
    };
  });
  return {
    asOf,
    incomplete,
    windows: WINDOWS.map((hours, index) => ({
      hours,
      count: contests.reduce((total, contest) => total + contest.counts[index], 0),
      contests: contests.filter((contest) => contest.counts[index] > 0).map((contest) => ({
        contestId: contest.contestId, title: contest.title, count: contest.counts[index],
      })),
    })),
    sources: contests.map(({ counts: _counts, ...source }) => source),
  };
}
