import { describe, expect, test } from 'bun:test';
import { buildContestPerformance } from './contestPerformance';

const asOf = '2026-09-11T12:00:00.000Z';
const now = Date.parse(asOf);
const hour = 3_600_000;
const accepted = (problemIndex: number, age: number) => ({ problemIndex, status: 1, acceptedAtSeconds: (now - age * hour) / 1000 });
const build = (submissions: any[], extra = {}, meta = {}) => buildContestPerformance({
  contests: { 'vjudge:1': { solved: new Set(submissions.filter((s) => s.status === 1).map((s) => s.problemIndex)).size, contestTitle: 'Practice', submissions, ...extra } },
}, { 'vjudge:1': meta }, asOf);

describe('report performance windows', () => {
  test('counts cumulative windows including exact boundaries, excludes old and failed solves', () => {
    const result = build([accepted(0, 24), accepted(1, 48), accepted(2, 72), accepted(3, 72.001), { ...accepted(4, 1), status: 0 }]);
    expect(result.windows.map((w) => w.count)).toEqual([1, 2, 3]);
    expect(result.windows[2].contests).toEqual([{ contestId: 'vjudge:1', title: 'Practice', count: 3 }]);
    expect(result.incomplete).toBe(false);
  });
  test('uses the first acceptance per problem, not a recent resubmission', () => {
    expect(build([accepted(0, 1), accepted(0, 100)]).windows.map((w) => w.count)).toEqual([0, 0, 0]);
  });
  test('unknown and future times are incomplete, never recent activity', () => {
    const result = build([{ problemIndex: 0, status: 1 }, accepted(1, -1)]);
    expect(result.incomplete).toBe(true);
    expect(result.windows.map((w) => w.count)).toEqual([0, 0, 0]);
  });
  test('an unknown earlier acceptance makes a duplicate uncertain', () => {
    expect(build([{ problemIndex: 0, status: 1 }, accepted(0, 1)]).windows[0].count).toBe(0);
  });
  test('converts relative seconds with a real start; null start is not epoch', () => {
    const submissions = [{ problemIndex: 0, status: 1, timeSeconds: 3600 }];
    expect(build(submissions, {}, { begin: now - 2 * hour }).windows[0].count).toBe(1);
    expect(build(submissions, {}, { begin: null }).incomplete).toBe(true);
  });
  test('Codeforces upsolves need an absolute time, not an inherited contest time', () => {
    const submission = { problemIndex: 0, status: 1, isUpsolve: true, bestSubmissionTimeSeconds: 0 };
    expect(build([submission], {}, { begin: now - hour }).incomplete).toBe(true);
    expect(build([{ ...submission, acceptedAtSeconds: (now - hour) / 1000 }]).windows[0].count).toBe(1);
  });
  test('manual corrections do not invent solve events', () => {
    const result = build([], { solved: 10, manualSolveOverride: { solvedCount: 10 } });
    expect(result.incomplete).toBe(true);
    expect(result.windows[0].count).toBe(0);
  });
  test('keeps contests separate and exposes freshness and missing sources', () => {
    const result = buildContestPerformance({ contests: {
      a: { submissions: [accepted(0, 1)] }, b: { submissions: [accepted(0, 2)] },
    } }, { a: { title: 'A', fetchedAt: asOf }, b: { title: 'B' } }, asOf, true);
    expect(result.windows[0].count).toBe(2);
    expect(result.windows[0].contests.map((c) => c.title)).toEqual(['A', 'B']);
    expect(result.sources[0].fetchedAt).toBe(asOf);
    expect(result.incomplete).toBe(true);
  });
});
