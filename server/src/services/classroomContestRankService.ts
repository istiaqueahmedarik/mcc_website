import {
  fetchCodeforcesContestRank,
  normalizeCodeforcesContestSource,
  parseCodeforcesContestSource,
  type CodeforcesApiCredentials,
} from './codeforcesContestService';
import { fetchVjudgeContestRank } from './vjudgeContestService';

export const CLASSROOM_CONTEST_PROVIDERS = ['vjudge', 'codeforces'] as const;
export type ClassroomContestProvider = typeof CLASSROOM_CONTEST_PROVIDERS[number];

export type ClassroomContestRankRequest = {
  provider: ClassroomContestProvider;
  externalContestId: string;
  problemWeights?: number[];
  vjudgeSession?: string;
  codeforcesCredentialProvider?: () => Promise<CodeforcesApiCredentials | null>;
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

export function normalizeExternalContestIdForProvider(
  provider: ClassroomContestProvider,
  value: unknown,
) {
  const text = String(value ?? '').trim().slice(0, 300);
  if (provider !== 'codeforces') return text.slice(0, 40);

  const normalizedSource = normalizeCodeforcesContestSource(text);
  if (parseCodeforcesContestSource(normalizedSource)) return normalizedSource.slice(0, 300);

  const urlMatch = text.match(/codeforces\.com\/(?:group\/[A-Za-z0-9]+\/contest|contest|gym)\/(\d+)/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const pathMatch = text.match(/^(?:group\/[A-Za-z0-9]+\/contest|contest|gym)\/(\d+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return text.slice(0, 40);
}

export function isValidExternalContestId(
  provider: ClassroomContestProvider,
  externalContestId: string,
) {
  return provider === 'codeforces'
    ? Boolean(parseCodeforcesContestSource(externalContestId))
    : /^\d+$/.test(externalContestId);
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
      credentialProvider: request.codeforcesCredentialProvider,
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
