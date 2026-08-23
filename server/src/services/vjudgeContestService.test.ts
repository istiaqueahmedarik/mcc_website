import { describe, expect, test } from 'bun:test';
import { processVjudgeRankData } from './vjudgeContestService';

describe('processVjudgeRankData', () => {
  test('keeps VJudge scoring compatible with custom problem weights', () => {
    const result = processVjudgeRankData({
      id: 123,
      title: 'VJudge Practice',
      begin: 0,
      length: 7_200_000,
      participants: {
        1: ['alice', 'Alice', null],
        2: ['bob', 'Bob', null],
      },
      submissions: [
        [1, 0, 0, 600, 0],
        [1, 0, 1, 900, 0],
        [1, 1, 1, 1200, 0],
        [2, 0, 1, 300, 0],
      ],
    }, [2, 3]);

    expect(result.error).toBeUndefined();
    expect(result.totalProblems).toBe(2);
    expect(result.problemWeights).toEqual([2, 3]);
    expect(result.teams.find((team: any) => team.username === 'alice')?.finalScore).toBe(5);
    expect(result.teams.find((team: any) => team.username === 'alice')?.penalty).toBe(55);
    expect(result.teams.find((team: any) => team.username === 'bob')?.finalScore).toBe(2);
  });
});
