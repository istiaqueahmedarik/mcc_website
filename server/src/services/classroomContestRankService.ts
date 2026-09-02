import { fetchCodeforcesContestRank } from './codeforcesContestService';
import { fetchVjudgeContestRank } from './vjudgeContestService';

export const CLASSROOM_CONTEST_PROVIDERS = ['vjudge', 'codeforces'] as const;
export type ClassroomContestProvider = typeof CLASSROOM_CONTEST_PROVIDERS[number];

export type ClassroomContestRankRequest = {
  provider: ClassroomContestProvider;
  externalContestId: string;
  problemWeights?: number[];
  vjudgeSession?: string;
  codeforcesSession?: string;
  codeforcesTargetHandles?: string[];
  includeUpsolves?: boolean;
};

export function normalizeContestProvider(value: unknown): ClassroomContestProvider {
  const normalized = String(value ?? 'vjudge').trim().toLowerCase();
  return normalized === 'codeforces' ? 'codeforces' : 'vjudge';
}

export function contestProviderLabel(provider: ClassroomContestProvider) {
  return provider === 'codeforces' ? 'Codeforces' : 'VJudge';
}

export function buildContestKey(provider: ClassroomContestProvider, externalContestId: string) {
  return `${provider}:${String(externalContestId)}`;
}

export function splitContestKey(contestKey: string) {
  const [provider, ...rest] = String(contestKey || '').split(':');
  if (provider === 'vjudge' || provider === 'codeforces') {
    return {
      provider,
      externalContestId: rest.join(':'),
    };
  }
  return {
    provider: 'vjudge' as const,
    externalContestId: contestKey,
  };
}

export async function fetchClassroomContestRank(request: ClassroomContestRankRequest) {
  if (request.provider === 'codeforces') {
    return fetchCodeforcesContestRank(request.externalContestId, request.problemWeights, {
      webSession: request.codeforcesSession,
      targetHandles: request.codeforcesTargetHandles,
      includeUpsolves: request.includeUpsolves,
    });
  }

  return fetchVjudgeContestRank(
    request.externalContestId,
    request.vjudgeSession,
    request.problemWeights,
    request.includeUpsolves,
  );
}
