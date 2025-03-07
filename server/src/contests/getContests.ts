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

export default app
