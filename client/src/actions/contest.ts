'use server';

import { getBapsContests, getBapsStandings } from '../lib/data-sources/baps';
import { getTophContests, getTophStandings } from '../lib/data-sources/toph';
import { UnifiedContest, UnifiedStandingsResponse, ContestProvider } from '../lib/data-sources/unified';

export async function getAllContests(): Promise<UnifiedContest[]> {
  try {
    const [bapsContests, tophContests] = await Promise.all([
      getBapsContests(),
      getTophContests()
    ]);
    
    // Sort by start date, newest first (if available)
    const all = [...bapsContests, ...tophContests];
    all.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return all;
  } catch (error) {
    console.error('Failed to get all contests', error);
    return [];
  }
}

export async function getContestStandings(provider: ContestProvider, slug: string): Promise<UnifiedStandingsResponse | null> {
  try {
    if (provider === 'baps') {
      return await getBapsStandings(slug);
    } else if (provider === 'toph') {
      return await getTophStandings(slug);
    }
    return null;
  } catch (error) {
    console.error(`Failed to get standings for ${provider} ${slug}`, error);
    return null;
  }
}
