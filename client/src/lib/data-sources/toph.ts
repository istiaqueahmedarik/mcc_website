import * as cheerio from 'cheerio';
import { UnifiedContest, UnifiedStandingsResponse, UnifiedStandingsRow, processCustomRanks } from './unified';

export async function getTophContests(): Promise<UnifiedContest[]> {
  try {
    const res = await fetch('https://toph.co/contests/tags/iupc', { next: { revalidate: 60 } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const contests: UnifiedContest[] = [];

    $('table.table tbody tr').each((i, row) => {
      const nameLink = $(row).find('a.clist__name');
      const href = nameLink.attr('href');
      const text = nameLink.text().trim();
      const timestampSpan = $(row).find('.timestamp[data-timestamp]');
      const timestamp = timestampSpan.attr('data-timestamp');
      
      if (href && text && href.split('/').length === 3) {
        const slug = href.split('/')[2];
        const startsAt = timestamp 
          ? new Date(parseInt(timestamp, 10) * 1000).toISOString()
          : new Date().toISOString();
        
        if (!contests.find(c => c.slug === slug)) {
          contests.push({
            id: slug,
            slug: slug,
            title: text,
            provider: 'toph',
            startsAt: startsAt,
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
    
    let startsAt = '';
    let durationMinutes = 300;
    
    try {
      const mainRes = await fetch(`https://toph.co/c/${slug}`, { next: { revalidate: 60 } });
      if (mainRes.ok) {
        const mainHtml = await mainRes.text();
        const $main = cheerio.load(mainHtml);
        const timestamps: number[] = [];
        $main('.timestamp[data-timestamp]').each((i, el) => {
          const ts = parseInt($main(el).attr('data-timestamp') || '', 10);
          if (ts && !timestamps.includes(ts)) {
            timestamps.push(ts);
          }
        });
        if (timestamps.length >= 2) {
          timestamps.sort((a, b) => a - b);
          startsAt = new Date(timestamps[0] * 1000).toISOString();
          durationMinutes = Math.round((timestamps[1] - timestamps[0]) / 60);
        } else if (timestamps.length === 1) {
          startsAt = new Date(timestamps[0] * 1000).toISOString();
        }
      }
    } catch (e) {
      console.error('Failed to fetch/parse Toph contest main page timestamps', e);
    }

    if (!startsAt) {
      const standingsTimestamp = parseInt($('.timestamp[data-timestamp]').first().attr('data-timestamp') || '', 10);
      if (standingsTimestamp) {
        startsAt = new Date((standingsTimestamp - 300 * 60) * 1000).toISOString();
      } else {
        startsAt = new Date().toISOString();
      }
    }

    const unifiedContest: UnifiedContest = {
      id: slug,
      slug: slug,
      title: title || slug,
      provider: 'toph',
      startsAt: startsAt,
      durationMinutes: durationMinutes,
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
      if (tds.length < 3) return;
      
      const rank = $(tds[0]).text().trim();
      const teamCell = $(tds[1]);
      
      const teamDiv = teamCell.find('div.d-flex > div');
      const institution = teamDiv.find('.adjunct').text().trim();
      
      let teamName = '';
      const link = teamDiv.find('a');
      if (link.length > 0) {
        teamName = link.first().text().trim();
      } else {
        teamName = teamDiv.clone().children().remove().end().text().trim();
      }
      
      const scoreCell = $(tds[2]);
      const score = parseInt(scoreCell.find('strong').text().trim(), 10) || 0;
      const penaltyText = scoreCell.find('.adjunct').text().trim().toLowerCase();

      const problems: any[] = [];
      for (let p = 3; p < tds.length; p++) {
        const pCell = $(tds[p]);
        
        const isSolved = pCell.hasClass('-perfect') || 
                         pCell.hasClass('-accepted') || 
                         pCell.hasClass('-firstsolve') || 
                         pCell.find('use').attr('href')?.includes('#check') || 
                         pCell.find('use').attr('href')?.includes('#star');
                         
        const isFailed = pCell.hasClass('-failed') || 
                         pCell.find('use').attr('href')?.includes('#cross');

        let tries = 0;
        let pPen = 0;

        if (isSolved) {
          const adjunct = pCell.find('.adjunct');
          const titleText = adjunct.attr('title') || '';
          
          const rejectionsMatch = titleText.match(/Rejections:\s*(\d+)/);
          tries = rejectionsMatch ? parseInt(rejectionsMatch[1], 10) + 1 : 1;
          
          const penaltyMatch = titleText.match(/Penalty:\s*(\d+)/);
          pPen = penaltyMatch ? parseInt(penaltyMatch[1], 10) : 0;
        } else if (isFailed) {
          tries = 1;
        }

        problems.push({
          label: unifiedProblems[p - 3]?.label || '?',
          title: unifiedProblems[p - 3]?.title || '?',
          solved: isSolved,
          tries: tries,
          penalty: pPen,
        });
      }

      let penalty = 0;
      if (penaltyText.includes('k')) {
        const sum = problems.reduce((acc, p) => acc + (p.solved ? p.penalty : 0), 0);
        if (sum > 0) {
          penalty = sum;
        } else {
          penalty = Math.round(parseFloat(penaltyText.replace('k', '')) * 1000);
        }
      } else {
        penalty = parseInt(penaltyText, 10) || 0;
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
