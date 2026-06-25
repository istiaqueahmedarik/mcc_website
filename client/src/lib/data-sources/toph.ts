import * as cheerio from 'cheerio';
import { UnifiedContest, UnifiedStandingsResponse, UnifiedStandingsRow, processCustomRanks } from './unified';

export async function getTophContests(): Promise<UnifiedContest[]> {
  try {
    const res = await fetch('https://toph.co/contests/tags/iupc', { next: { revalidate: 60 } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const contests: UnifiedContest[] = [];

    $('a[href^="/c/"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text && !text.includes('Standings') && href.split('/').length === 3) {
        const slug = href.split('/')[2];
        if (!contests.find(c => c.slug === slug)) {
          contests.push({
            id: slug,
            slug: slug,
            title: text,
            provider: 'toph',
            startsAt: new Date().toISOString(),
            durationMinutes: 300,
          });
        }
      }
    });

    return contests;
  } catch (error) {
    console.error('Error fetching Toph contests:', error);
    return [];
  }
}

export async function getTophStandings(slug: string): Promise<UnifiedStandingsResponse | null> {
  try {
    const res = await fetch(`https://toph.co/c/${slug}/standings`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').text().split('Standings')[0].trim();
    
    const unifiedContest: UnifiedContest = {
      id: slug,
      slug: slug,
      title: title || slug,
      provider: 'toph',
      startsAt: new Date().toISOString(),
      durationMinutes: 300,
    };

    const unifiedProblems: any[] = [];
    const table = $('table.-standings');
    const headers = table.find('thead th');
    
    headers.each((i, el) => {
      const problemLabel = $(el).find('div[title]').first().text().trim();
      const problemTitle = $(el).find('div[title]').first().attr('title');
      const stats = $(el).find('.adjunct').text().trim();
      if (problemLabel && problemLabel.length <= 2) {
        let solvedBy = 0;
        let attemptedBy = 0;
        if (stats.includes('/')) {
          const parts = stats.split('/');
          solvedBy = parseInt(parts[0], 10) || 0;
          attemptedBy = parseInt(parts[1], 10) || 0;
        }
        unifiedProblems.push({
          label: problemLabel,
          title: problemTitle || `Problem ${problemLabel}`,
          solvedBy,
          attemptedBy,
        });
      }
    });

    let rawStandings: UnifiedStandingsRow[] = [];
    table.find('tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length < 4) return;
      
      const rank = $(tds[0]).text().trim();
      const teamCell = $(tds[1]);
      const teamName = teamCell.find('a').first().text().trim() || teamCell.text().split('\n')[0].trim();
      const institution = teamCell.find('.text-muted').text().trim() || teamCell.find('small').text().trim() || '';
      
      const score = parseInt($(tds[2]).text().trim(), 10) || 0;
      const penalty = parseInt($(tds[3]).text().trim(), 10) || 0;

      const problems: any[] = [];
      for (let p = 4; p < tds.length; p++) {
        const pCell = $(tds[p]);
        const cellText = pCell.text().trim();
        let solved = pCell.hasClass('accepted') || pCell.find('.fa-check').length > 0;
        problems.push({
          label: unifiedProblems[p - 4]?.label || '?',
          title: unifiedProblems[p - 4]?.title || '?',
          solved: solved,
          tries: parseInt(cellText) || 0,
          penalty: 0,
        });
      }

      rawStandings.push({
        originalRank: rank,
        displayRank: rank,
        teamName,
        institution,
        score,
        penalty,
        problems,
      });
    });

    rawStandings = processCustomRanks(rawStandings);

    return {
      contest: unifiedContest,
      problems: unifiedProblems,
      standings: rawStandings,
    };
  } catch (error) {
    console.error('Error fetching Toph standings:', error);
    return null;
  }
}
