import { UnifiedContest, UnifiedStandingsResponse, UnifiedStandingsRow, processCustomRanks } from './unified';

export async function getBapsContests(): Promise<UnifiedContest[]> {
  try {
    const res = await fetch('https://baps.amarbari.net/api/judge/contests/?offset=0&limit=100', {
      next: { revalidate: 60 }
    });
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      provider: 'baps',
      startsAt: c.starts_at,
      durationMinutes: c.duration,
    }));
  } catch (error) {
    console.error('Error fetching BAPS contests:', error);
    return [];
  }
}

export async function getBapsStandings(slug: string): Promise<UnifiedStandingsResponse | null> {
  try {
    const contestRes = await fetch(`https://baps.amarbari.net/api/judge/contests/${slug}/`, {
      next: { revalidate: 60 }
    });
    if (!contestRes.ok) return null;
    const contestData = await contestRes.json();

    const unifiedContest: UnifiedContest = {
      id: contestData.id,
      slug: contestData.slug,
      title: contestData.title,
      provider: 'baps',
      startsAt: contestData.starts_at,
      durationMinutes: contestData.duration,
    };

    const firstPageRes = await fetch(`https://baps.amarbari.net/api/judge/standings/?contest=${contestData.id}&page=1`, {
      next: { revalidate: 60 }
    });
    if (!firstPageRes.ok) return null;
    const firstPageData = await firstPageRes.json();
    
    let totalPages = firstPageData.total_pages || 1;
    let allResults = [...firstPageData.results];
    let problemAttempts = firstPageData.problem_attempts || [];

    if (totalPages > 1) {
      const promises = [];
      for (let i = 2; i <= totalPages; i++) {
        promises.push(
          fetch(`https://baps.amarbari.net/api/judge/standings/?contest=${contestData.id}&page=${i}`, {
            next: { revalidate: 60 }
          }).then(r => r.json())
        );
      }
      const pagesData = await Promise.all(promises);
      for (const page of pagesData) {
        if (page.results) {
          allResults = allResults.concat(page.results);
        }
      }
    }

    const unifiedProblems = problemAttempts.map((pa: any) => ({
      label: pa.number_to_alpha,
      title: `Problem ${pa.number_to_alpha}`,
      solvedBy: pa.total_accepted,
      attemptedBy: pa.total_tries,
    }));

    let rawStandings: UnifiedStandingsRow[] = allResults.map((r: any) => ({
      originalRank: r.rank,
      displayRank: r.rank,
      teamName: (r.fullname || r.username || 'Unknown').trim(),
      institution: r.institution || '',
      score: r.problem_total_points || 0,
      penalty: r.total_fine || 0,
      problems: r.problem_list ? r.problem_list.map((pl: any) => ({
        label: pl.number_to_alpha,
        title: `Problem ${pl.number_to_alpha}`,
        solved: pl.is_solved,
        tries: pl.total_tries,
        penalty: pl.fine || 0,
      })) : [],
    }));

    rawStandings = processCustomRanks(rawStandings);

    return {
      contest: unifiedContest,
      problems: unifiedProblems,
      standings: rawStandings,
    };
  } catch (error) {
    console.error('Error fetching BAPS standings:', error);
    return null;
  }
}
