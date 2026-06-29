'use server';

import { revalidatePath } from 'next/cache';
import { getBapsContests, getBapsStandings } from '@/lib/data-sources/baps';
import { getTophContests, getTophStandings } from '@/lib/data-sources/toph';
import { UnifiedContest, UnifiedStandingsResponse, ContestProvider } from '@/lib/data-sources/unified';

const API = (process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000').replace(/\/+$/, '');

export async function getAllContests(): Promise<UnifiedContest[]> {
  try {
    // 1. Check if the contests list is saved in DB
    let isListSaved = false;
    const resStatus = await fetch(`${API}/saved-standings/list-status`, { cache: 'no-store' });
    if (resStatus.ok) {
      const statusData = await resStatus.json();
      isListSaved = statusData.success && statusData.saved;
    }

    // 2. If list is saved, ONLY load from the database
    if (isListSaved) {
      const resDb = await fetch(`${API}/saved-standings/all`, { cache: 'no-store' });
      if (resDb.ok) {
        const dbData = await resDb.json();
        if (dbData.success && dbData.contests) {
          const savedContests = dbData.contests.map((c: any) => ({
            id: c.slug,
            slug: c.slug,
            title: c.title,
            provider: c.provider,
            startsAt: c.startsAt,
            durationMinutes: c.durationMinutes,
            published: c.published,
            isSaved: c.isSaved,
          }));
          savedContests.sort((a: any, b: any) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
          return savedContests;
        }
      }
    }
  } catch (err) {
    console.error('Failed to check database for cached contests', err);
  }

  // 3. Fallback: Fetch live contests from crawlers
  let liveContests: UnifiedContest[] = [];
  try {
    const [bapsContests, tophContests] = await Promise.all([
      getBapsContests(),
      getTophContests()
    ]);
    liveContests = [...bapsContests, ...tophContests];
  } catch (error) {
    console.error('Failed to fetch live contests', error);
  }

  // 4. Fetch whatever saved contests are in the database (e.g. manually added ones)
  let savedContests: UnifiedContest[] = [];
  try {
    const resDb = await fetch(`${API}/saved-standings/all`, { cache: 'no-store' });
    if (resDb.ok) {
      const dbData = await resDb.json();
      if (dbData.success && dbData.contests) {
        savedContests = dbData.contests.map((c: any) => ({
          id: c.slug,
          slug: c.slug,
          title: c.title,
          provider: c.provider,
          startsAt: c.startsAt,
          durationMinutes: c.durationMinutes,
          published: c.published,
          isSaved: c.isSaved,
        }));
      }
    }
  } catch (err) {
    console.error('Failed to fetch saved contests from DB', err);
  }

  // 5. Merge live and saved contests
  const contestsMap = new Map<string, UnifiedContest>();
  
  liveContests.forEach(c => {
    const key = `${c.provider}-${c.slug}`;
    contestsMap.set(key, { ...c, published: false, isSaved: false });
  });
  
  savedContests.forEach(c => {
    const key = `${c.provider}-${c.slug}`;
    contestsMap.set(key, c);
  });

  const all = Array.from(contestsMap.values());
  all.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return all;
}

export async function getContestStandings(provider: ContestProvider, slug: string): Promise<UnifiedStandingsResponse | null> {
  try {
    // 1. Try to fetch from backend DB first
    try {
      const resDb = await fetch(`${API}/saved-standings?provider=${provider}&slug=${slug}`, { cache: 'no-store' });
      if (resDb.ok) {
        const dbData = await resDb.json();
        if (dbData.success && dbData.saved) {
          return {
            ...dbData.data,
            isSaved: true,
            savedAt: dbData.savedAt
          };
        }
      }
    } catch (err) {
      console.error('Failed to query saved standings from DB', err);
    }

    // 2. Fall back to live crawler if not saved
    let liveData: UnifiedStandingsResponse | null = null;
    if (provider === 'baps') {
      liveData = await getBapsStandings(slug);
    } else if (provider === 'toph') {
      liveData = await getTophStandings(slug);
    }

    if (liveData) {
      // Fetch and apply university aliases to live data
      try {
        const aliasesList = await getUniversityAliases();
        if (aliasesList && aliasesList.length > 0) {
          const aliasMap = new Map<string, string>();
          aliasesList.forEach(a => {
            aliasMap.set(a.aliasName.trim().toLowerCase(), a.canonicalName);
          });

          const mapRow = (row: any) => {
            if (row.institution) {
              const key = row.institution.trim().toLowerCase();
              if (aliasMap.has(key)) {
                row.institution = aliasMap.get(key)!;
              }
            }
            if (row.skippedTeams && Array.isArray(row.skippedTeams)) {
              row.skippedTeams.forEach(mapRow);
            }
          };

          if (liveData.standings) {
            liveData.standings.forEach(mapRow);
          }
        }
      } catch (e) {
        console.error('Failed to apply aliases to live standings data', e);
      }

      return {
        ...liveData,
        isSaved: false
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to get standings for ${provider} ${slug}`, error);
    return null;
  }
}

export async function saveContestStandings(provider: ContestProvider, slug: string, data: any): Promise<{ success: boolean; message: string }> {
  try {
    const { isSaved, savedAt, ...cleanData } = data;
    
    const res = await fetch(`${API}/saved-standings/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider,
        slug,
        data: cleanData
      })
    });
    
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        revalidatePath(`/admin/contests/${provider}/${slug}`);
        revalidatePath('/admin/contests');
        revalidatePath('/contests');
        return { success: true, message: 'Standings saved successfully' };
      }
    }
    return { success: false, message: 'Failed to save standings' };
  } catch (error: any) {
    console.error('Failed to save standings', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function deleteSavedStandings(provider: ContestProvider, slug: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider, slug })
    });
    
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        revalidatePath(`/admin/contests/${provider}/${slug}`);
        revalidatePath('/admin/contests');
        revalidatePath('/contests');
        return { success: true, message: 'Saved standings deleted successfully' };
      }
    }
    return { success: false, message: 'Failed to delete saved standings' };
  } catch (error: any) {
    console.error('Failed to delete saved standings', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function getContestsListStatus(): Promise<{ saved: boolean; savedAt: string | null }> {
  try {
    const res = await fetch(`${API}/saved-standings/list-status`, { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        return { saved: result.saved, savedAt: result.savedAt };
      }
    }
    return { saved: false, savedAt: null };
  } catch (error) {
    console.error('Failed to get contests list status', error);
    return { saved: false, savedAt: null };
  }
}

export async function saveContestsList(contests: UnifiedContest[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/save-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contests })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        revalidatePath('/admin/contests');
        revalidatePath('/contests');
        return { success: true, message: 'Contests list saved successfully' };
      }
    }
    return { success: false, message: 'Failed to save contests list' };
  } catch (error: any) {
    console.error('Failed to save contests list', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function deleteContestsList(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/delete-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        revalidatePath('/admin/contests');
        revalidatePath('/contests');
        return { success: true, message: 'Contests list unsaved successfully' };
      }
    }
    return { success: false, message: 'Failed to unsave contests list' };
  } catch (error: any) {
    console.error('Failed to unsave contests list', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function getCombinedUniversityStandings(): Promise<{ success: boolean; contests: any[]; universities: any[] }> {
  try {
    const res = await fetch(`${API}/saved-standings/combined-universities`, { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        return { success: true, contests: result.contests, universities: result.universities };
      }
    }
    return { success: false, contests: [], universities: [] };
  } catch (error) {
    console.error('Failed to get combined university standings', error);
    return { success: false, contests: [], universities: [] };
  }
}

export async function getUniversityAliases(): Promise<{ aliasName: string; canonicalName: string }[]> {
  try {
    const res = await fetch(`${API}/saved-standings/aliases`, { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        return result.aliases;
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to get university aliases', error);
    return [];
  }
}

export async function getRawUniversities(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/saved-standings/raw-universities`, { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        return result.rawUniversities;
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to get raw universities', error);
    return [];
  }
}

export async function mergeUniversities(aliasName: string, canonicalName: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/aliases/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ aliasName, canonicalName })
    });

    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      if (result.success) {
        revalidatePath('/contests');
        revalidatePath('/contests/combined');
        revalidatePath('/admin/contests');
        revalidatePath('/admin/contests/combined');
        return { success: true, message: result.message };
      }
      return { success: false, message: result.error || 'Failed to merge universities' };
    }
    return { success: false, message: result.error || `Failed to merge (HTTP ${res.status})` };
  } catch (error: any) {
    console.error('Failed to merge universities', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function splitUniversityAlias(aliasName: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/aliases/split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ aliasName })
    });

    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      if (result.success) {
        revalidatePath('/contests');
        revalidatePath('/contests/combined');
        revalidatePath('/admin/contests');
        revalidatePath('/admin/contests/combined');
        return { success: true, message: result.message };
      }
      return { success: false, message: result.error || 'Failed to split university alias' };
    }
    return { success: false, message: result.error || `Failed to split (HTTP ${res.status})` };
  } catch (error: any) {
    console.error('Failed to split university alias', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function toggleContestPublish(provider: string, slug: string): Promise<{ success: boolean; published?: boolean; message?: string }> {
  try {
    const res = await fetch(`${API}/saved-standings/toggle-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, slug })
    });

    const result = await res.json().catch(() => ({}));
    if (res.ok && result.success) {
      revalidatePath('/contests');
      revalidatePath('/admin/contests');
      revalidatePath('/contests/combined');
      revalidatePath('/admin/contests/combined');
      return { success: true, published: result.published };
    }
    return { success: false, message: result.error || 'Failed to toggle publish' };
  } catch (error: any) {
    console.error('Failed to toggle contest publish', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

export async function getPublishedContests(): Promise<UnifiedContest[]> {
  try {
    const res = await fetch(`${API}/saved-standings/published`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.contests) {
        return data.contests.map((c: any) => ({
          id: c.slug,
          slug: c.slug,
          title: c.title,
          provider: c.provider,
          startsAt: c.startsAt,
          durationMinutes: c.durationMinutes
        }));
      }
    }
    return [];
  } catch (error: any) {
    console.error('Failed to get published contests', error);
    return [];
  }
}
