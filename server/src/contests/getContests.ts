import { Hono } from 'hono'
const cheerio = require('cheerio');

const app = new Hono()



app.get('/', async (c) => {

    const url = 'https://toph.co/contests/tags/iupc';
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const contests: any[] = [];
    $('table tbody tr').each((_: any, row: any) => {
        const name = $(row).find('a').first().text().trim() || '';

        let status = '';
        let endedAt = null;
        let problems = null;

        $(row).find('.flair__item').each((_: any, item: any) => {
            const imgSrc = $(item).find('img').attr('src') || '';
            if (imgSrc.includes('clock.svg')) {
                status = 'Upcoming';
            } else if (imgSrc.includes('hourglassend.svg')) {
                status = 'Ended';
                endedAt = $(item).find('span.timestamp').attr('data-timestamp') || null;
            } else if (imgSrc.includes('puzzle.svg')) {
                problems = parseInt($(item).find('span.text').text().trim(), 10) || null;
            }
        });

        const standingsLink = $(row).find('a[href*="/standings"]').attr('href') || '';
        const practiceLink = $(row).find('a[href*="#intent=practice"]').attr('href') || '';
        const statisticsLink = $(row).find('a[href*="/statistics"]').attr('href') || '';

        contests.push({
            name,
            status,
            endedAt,
            problems,
            links: {
                standings: standingsLink,
                practice: practiceLink,
                statistics: statisticsLink
            }
        });
    });

    return c.json(contests);
})

app.get('/:cid', async (c) => {
    const { cid } = c.req.param();
    console.log(cid);
    const url = `https://toph.co/c/${cid}/standings`;
    console.log(url);
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const teams: any[] = [];
        console.log($('tr').length);
        $('.-standings tbody tr').each((_: any, element: any) => {
            let teamName = $(element).find('td').eq(1).text().trim().split('\n')[0];
            const universityName = $(element).find('td').eq(1).find('div.adjunct').text().trim();
            if (teamName.includes(universityName)) {
                teamName = teamName.replace(universityName, '').trim();
            }
            if (teamName.toUpperCase().includes('MIST')) {
                const rank = $(element).find('td').eq(0).text().trim();

                const university = $(element).find('td').eq(1).find('div.adjunct').text().trim();

                const solved = $(element).find('td.primary strong').text().trim();
                const penalty = $(element).find('td.primary div.adjunct').text().trim().replace('Penalty: ', '');

                teams.push({
                    rank,
                    teamName,
                    university,
                    solved,
                    penalty
                });
            }
        });
        if (teams.length > 0) {
            return c.json({
                status: 'success',
                data: teams
            });
        } else {
            return c.json({
                status: 'error',
                message: 'No teams found with "MIST" in their name'
            });
        }
    } catch (error) {
        console.error('Error fetching or parsing data:', error);
        return c.json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});


export default app
