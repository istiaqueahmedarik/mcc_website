import { Hono } from 'hono'
import sql from '../db';
import { fetchBatchStatistics } from '../vjudge';
import { sendEmail } from '../sendEmail';
const cheerio = require('cheerio');
import { timeout } from 'hono/timeout'
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

const loginToVJudge = async () => {
    try {
        const username = process.env.VJUDGE_USERNAME || '';
        const password = process.env.VJUDGE_PASSWORD || '';

        console.log('Authenticating with VJudge...');

        const response = await fetch('https://vjudge.net/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                username,
                password
            }),
            credentials: 'include'
        });

        const cookie = response.headers.get('set-cookie');
        let JSESSIONID = cookie?.split(';')[0].split('=')[1];
        return JSESSIONID;


    } catch (error) {
        console.error('Error during VJudge authentication:', error);
        return "";
    }
};

const createEmailBody = (irregular: any[]) => {
    let email = '<h1>Irregulars</h1>';
    irregular.forEach((irr) => {
        email += `<h1>${irr.batch}</h1>`;
        email += `<h2>${irr.irregular[0].full_name}</h2>`;
        email += `<p>Total Submission: ${irr.irregular[0].totalSubmissions}</p>`;
        email += `<p>Accepted Submission: ${irr.irregular[0].acceptedSubmissions}</p>`;
        email += `<p>submissionFrequency: ${irr.irregular[0].submissionFrequency}</p>`;
        email += `<p>Vjudge ID: ${irr.irregular[0].vjudge_id}</p>`;
        email += `<p>Codeforces ID: ${irr.irregular[0].cf_id || "N/A"}</p>`;
        email += `<p>AtCoder ID: ${irr.irregular[0].atcoder_id || "N/A"}</p>`;
    });
    return email;
}

app.use('/cron/send', timeout(60000))
app.get('/cron/send', async (c) => {


    const jessionid = await loginToVJudge() || '';
    const combine: any = []
    const email_v_combines: Record<string, any[]> = {} //store irregulars for each email
    try {
        const result = await sql`select * from batches order by created_at desc`
        await Promise.all(result.map(async (batch: any) => {
            console.log(batch)
            const b_details = await sql`select id, full_name, mist_id, vjudge_id, cf_id, codechef_id, atcoder_id from users
      where id not in (select ins_id from batch_instructors
        where batch_id = ${batch.id}
      ) and
      id in (select mem_id from batch_members
        where batch_id = ${batch.id}
      ) and
      admin = false
      order by mist_id 
      `
            const emails = await sql`select u.full_name, u.email, u.profile_pic from batch_instructors ci join users u
  on ci.ins_id = u.id where ci.batch_id = ${batch.id}`

            await fetchBatchStatistics(b_details, "696631", 7, jessionid)
                .then((res) => {
                    const irregular = res.filter((s: any) => s.irregular === true)
                    if (irregular.length > 0) {
                        combine.push({
                            batch: batch.name,
                            irregular: irregular
                        })
                        emails.forEach((email: any) => {
                            console.log(email.email)
                            email_v_combines[email.email] = email_v_combines[email.email] || []
                            email_v_combines[email.email].push({
                                batch: batch.name,
                                irregular: irregular
                            })
                        })
                    }
                    return res
                })
                .catch((err) => {
                    console.log(err)
                    return []
                })
        }));
        for (const [email, irregulars] of Object.entries(email_v_combines)) {
            await sendEmail(email, `Irregulars of ${irregulars.map(i => i.batch).join(', ')}`, '', createEmailBody(irregulars))
            // await sendEmail('istiaqueahmedarik@gmail.com', 'Irregulars', '', createEmailBody(combine))
        }
        return c.json({ email_v_combines })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
})

export default app
