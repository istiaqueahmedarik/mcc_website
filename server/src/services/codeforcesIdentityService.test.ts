import { describe, expect, test } from 'bun:test';
import {
  enrichCodeforcesRankIdentities,
  enrichVjudgeRankIdentities,
  extractStudentIdFromGroupUsername,
  normalizeCodeforcesSourceForType,
  parseCodeforcesIdentityCsv,
} from './codeforcesIdentityService';

describe('Codeforces contest source classification', () => {
  test('normalizes explicit Public, Gym, Group, and EDU sources', () => {
    expect(normalizeCodeforcesSourceForType('public', 'https://codeforces.com/contest/2258')).toBe('contest:2258');
    expect(normalizeCodeforcesSourceForType('gym', '105001')).toBe('gym:105001');
    expect(normalizeCodeforcesSourceForType('group', 'https://codeforces.com/group/SxSYDasIfo/contest/717234')).toBe('group:SxSYDasIfo:717234');
    expect(normalizeCodeforcesSourceForType('edu', 'https://codeforces.com/edu/course/2/lesson/6/standings?friends=true')).toBe('edu:2:6:friends');
    expect(normalizeCodeforcesSourceForType('group', '717234')).toBe('');
  });
});

describe('Codeforces group identity CSV', () => {
  test('extracts the student ID after the last equals sign', () => {
    expect(extractStudentIdFromGroupUsername('g21927=202314022')).toBe('202314022');
    expect(extractStudentIdFromGroupUsername('section=a=00202314022')).toBe('202314022');
    expect(extractStudentIdFromGroupUsername('g21927')).toBe('');
  });

  test('parses quoted usernames and normalizes student IDs', () => {
    expect(parseCodeforcesIdentityCsv('username,student_id\n"Group, Alice",00202314022')).toEqual([{
      rowNumber: 2,
      username: 'Group, Alice',
      normalizedUsername: 'group, alice',
      studentId: '202314022',
    }]);
  });

  test('rejects duplicate usernames and student IDs', () => {
    expect(() => parseCodeforcesIdentityCsv('username,student_id\nAlice,1\nalice,2')).toThrow('duplicate username');
    expect(() => parseCodeforcesIdentityCsv('username,student_id\nAlice,1\nBob,01')).toThrow('duplicate student_id');
  });
});

describe('Codeforces report identity enrichment', () => {
  const account = {
    id: '11111111-1111-4111-8111-111111111111',
    full_name: 'MCC Student',
    mist_id: '202314022',
    cf_id: 'SavedHandle',
    vjudge_id: 'SavedVjudge',
  };

  test('maps group suffix usernames to immutable MCC accounts', () => {
    const result = enrichCodeforcesRankIdentities({
      teams: [{ username: 'g21927=202314022', sourceHandles: ['g21927=202314022'] }],
      sourceType: 'group',
      groupIdentityMode: 'student_id_suffix',
      accounts: [account],
    });
    expect(result.warnings).toEqual([]);
    expect(result.teams[0].identityKey).toBe(`student:${account.id}`);
    expect(result.teams[0].realName).toBe('MCC Student');
    expect(result.teams[0].classroomMapping.student.mistId).toBe('202314022');
    expect(result.teams[0].classroomMapping.student.vjudgeId).toBe('SavedVjudge');
    expect(result.teams[0].sourceHandles).toEqual(['g21927=202314022']);
  });

  test('maps VJudge usernames to the same immutable MCC student identity', () => {
    const result = enrichVjudgeRankIdentities({
      teams: [{ username: 'savedvjudge', sourceHandles: ['savedvjudge'] }],
      accounts: [account],
    });
    expect(result.warnings).toEqual([]);
    expect(result.teams[0].identityKey).toBe(`student:${account.id}`);
    expect(result.teams[0].classroomMapping.student.vjudgeId).toBe('SavedVjudge');
    expect(result.teams[0].classroomMapping.student.cfId).toBe('SavedHandle');
  });

  test('maps ordinary contests by the saved MCC Codeforces handle', () => {
    const result = enrichCodeforcesRankIdentities({
      teams: [{ username: 'savedhandle', sourceHandles: ['savedhandle'] }],
      sourceType: 'public',
      accounts: [account],
    });
    expect(result.teams[0].identityKey).toBe(`student:${account.id}`);
    expect(result.teams[0].classroomMapping.matchedBy).toBe('cf_handle');
  });

  test('omits a provider team that does not map to exactly one MCC student', () => {
    const result = enrichCodeforcesRankIdentities({
      teams: [{ username: 'team', sourceHandles: ['SavedHandle', 'OtherHandle'] }],
      sourceType: 'gym',
      accounts: [account, { ...account, id: '22222222-2222-4222-8222-222222222222', cf_id: 'OtherHandle', mist_id: '202314023' }],
    });
    expect(result.teams).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.excluded[0].code).toBe('CODEFORCES_TEAM_MAPS_TO_MULTIPLE_STUDENTS');
  });

  test('omits VJudge participants without an eligible MCC account mapping', () => {
    const result = enrichVjudgeRankIdentities({
      teams: [{ username: 'not-saved', sourceHandles: ['not-saved'] }],
      accounts: [account],
    });
    expect(result.teams).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.excluded).toEqual([{
      username: 'not-saved',
      provider: 'vjudge',
      code: 'MCC_VJUDGE_HANDLE_NOT_FOUND',
    }]);
  });
});
