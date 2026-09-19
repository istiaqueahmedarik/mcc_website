import { describe, expect, test } from 'bun:test';
import {
  buildContestKey,
  isValidExternalContestId,
  normalizeContestProvider,
  normalizeExternalContestIdForProvider,
} from './classroomContestRankService';

describe('contest provider source normalization', () => {
  test('keeps legacy and unknown providers on VJudge', () => {
    expect(normalizeContestProvider(undefined)).toBe('vjudge');
    expect(normalizeContestProvider('legacy')).toBe('vjudge');
    expect(normalizeExternalContestIdForProvider('vjudge', ' 709641 ')).toBe('709641');
    expect(isValidExternalContestId('vjudge', '709641')).toBe(true);
    expect(isValidExternalContestId('vjudge', 'contest/709641')).toBe(false);
  });

  test('normalizes numeric and URL Codeforces sources', () => {
    expect(normalizeExternalContestIdForProvider('codeforces', 'https://codeforces.com/contest/2060')).toBe('2060');
    expect(normalizeExternalContestIdForProvider('codeforces', 'https://codeforces.com/gym/105001')).toBe('105001');
    expect(normalizeExternalContestIdForProvider(
      'codeforces',
      'https://codeforces.com/group/SxSYDasIfo/contest/717234',
    )).toBe('group:SxSYDasIfo:717234');
    expect(normalizeExternalContestIdForProvider(
      'codeforces',
      'https://codeforces.com/edu/course/2/lesson/9/standings?list=AbC123',
    )).toBe('edu:2:9:list:AbC123');
    const longListKey = 'A'.repeat(100);
    expect(normalizeExternalContestIdForProvider(
      'codeforces',
      `https://codeforces.com/edu/course/2/lesson/9/standings?list=${longListKey}`,
    )).toBe(`edu:2:9:list:${longListKey}`);
    expect(isValidExternalContestId('codeforces', 'edu:2:9:friends')).toBe(true);
    expect(isValidExternalContestId('codeforces', 'group:SxSYDasIfo:717234')).toBe(true);
    expect(isValidExternalContestId('codeforces', 'not-a-contest')).toBe(false);
  });

  test('uses provider-prefixed report keys', () => {
    expect(buildContestKey('vjudge', '123')).toBe('vjudge:123');
    expect(buildContestKey('codeforces', '123')).toBe('codeforces:123');
  });
});
