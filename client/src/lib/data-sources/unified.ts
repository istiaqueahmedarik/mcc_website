export type ContestProvider = 'baps' | 'toph';

export interface UnifiedContest {
  id: string | number;
  slug: string;
  title: string;
  provider: ContestProvider;
  startsAt: string;
  durationMinutes: number;
  published?: boolean;
  isSaved?: boolean;
}

export interface ProblemStat {
  label: string;
  title: string;
  solved: boolean;
  tries: number;
  penalty: number;
  firstSolved?: boolean;
}

export interface UnifiedStandingsRow {
  originalRank: number | string;
  displayRank: number | string;
  teamName: string;
  institution: string;
  score: number;
  penalty: number;
  problems: ProblemStat[];
  skippedTeams?: UnifiedStandingsRow[];
}

export interface UnifiedStandingsResponse {
  contest: UnifiedContest;
  problems: { label: string; title: string; solvedBy: number; attemptedBy: number }[];
  standings: UnifiedStandingsRow[];
}

export function processCustomRanks(rows: UnifiedStandingsRow[]): UnifiedStandingsRow[] {
  let currentRank = 1;
  const seenUniversities = new Set<string>();
  const universityToMainTeam = new Map<string, UnifiedStandingsRow>();
  const output: UnifiedStandingsRow[] = [];

  rows.forEach(row => {
    const institutionLower = (row.institution || '').toLowerCase().trim();
    const teamLower = (row.teamName || '').toLowerCase().trim();

    const isMist = 
      teamLower.startsWith('mist_') || 
      institutionLower === 'mist' || 
      institutionLower === 'military institute of science and technology';

    if (isMist) {
      row.displayRank = '-';
      row.skippedTeams = [];
      output.push(row);
    } else {
      if (seenUniversities.has(institutionLower)) {
        row.displayRank = '-';
        const mainTeam = universityToMainTeam.get(institutionLower);
        if (mainTeam) {
          if (!mainTeam.skippedTeams) {
            mainTeam.skippedTeams = [];
          }
          mainTeam.skippedTeams.push(row);
        }
      } else {
        row.displayRank = currentRank;
        currentRank++;
        seenUniversities.add(institutionLower);
        row.skippedTeams = [];
        universityToMainTeam.set(institutionLower, row);
        output.push(row);
      }
    }
  });

  return output;
}
