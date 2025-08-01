import { Hono } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'

const vjudgeRoute = new Hono()

// Helper function moved from client/src/actions/contest_details.js and adapted for TypeScript
function processVjudgeRankData(rawData: any, problemWeights: number[] | undefined) {
    if (!rawData || typeof rawData !== 'object') {
        return {
            error: "Invalid or non-JSON data received from Vjudge",
            dataReceived: rawData
        };
    }

    const { id, title, begin, length, participants, submissions } = rawData;

    const contestInfo = {
        id,
        title,
        begin,
        length,
        end: begin + length
    };

    const participantMap = new Map<number, any>();
    let totalTeams = 0;
    if (participants) {
        for (const teamId in participants) {
            if (Object.hasOwnProperty.call(participants, teamId)) {
                const teamData = participants[teamId];
                participantMap.set(parseInt(teamId, 10), {
                    teamId: parseInt(teamId, 10),
                    username: teamData[0],
                    realName: teamData[1] || teamData[0],
                    avatarUrl: teamData[2],
                    submissions: [],
                    solvedCount: 0,
                    penalty: 0
                });
                totalTeams++;
            }
        }
    }

    let maxProblemIndex = -1;
    if (submissions && Array.isArray(submissions)) {
        submissions.sort((a, b) => a[3] - b[3]);
        for (const sub of submissions) {
            const [teamId, problemIndex, status, timeSeconds, cumulativeScore] = sub;
            if (timeSeconds > (contestInfo.length) / 1000) continue;
            if (participantMap.has(teamId)) {
                const team = participantMap.get(teamId);
                team.submissions.push({
                    problemIndex: problemIndex,
                    status: status,
                    timeSeconds: timeSeconds,
                    cumulativeScore: cumulativeScore,
                });
                if (problemIndex > maxProblemIndex) {
                    maxProblemIndex = problemIndex;
                }
            }
        }
    }

    const totalProblems = maxProblemIndex >= 0 ? maxProblemIndex + 1 : 0;

    let weights: number[] = [];
    if (Array.isArray(problemWeights) && problemWeights.length === totalProblems) {
        weights = problemWeights;
    } else {
        weights = Array(totalProblems).fill(1);
    }

    const teamsData = Array.from(participantMap.values());

    teamsData.forEach(team => {
        if (team.submissions.length > 0) {
            const solvedProblems = new Set<number>();
            const problemSubs: { [key: number]: any[] } = {};
            team.submissions.forEach((s: any) => {
                if (!problemSubs[s.problemIndex]) problemSubs[s.problemIndex] = [];
                problemSubs[s.problemIndex].push(s);
                if (s.status === 1) {
                    solvedProblems.add(s.problemIndex);
                }
            });
            team.solvedCount = solvedProblems.size;
            team.finalScore = Array.from(solvedProblems).reduce(
                (sum, idx) => sum + (weights[idx] || 1), 0
            );
            let totalPenalty = 0;
            for (const pIdx of solvedProblems) {
                const subs = problemSubs[pIdx];
                let firstAC = subs.find(s => s.status === 1);
                if (firstAC) {
                    let failCount = 0;
                    for (const s of subs) {
                        if (s === firstAC) break;
                        if (s.status !== 1) failCount++;
                    }
                    const penalty = (failCount * 20 + (firstAC.timeSeconds) / 60);
                    totalPenalty += Math.round(penalty * 100) / 100;
                }
            }
            team.penalty = totalPenalty;
        } else {
            team.finalScore = 0;
            team.solvedCount = 0;
            team.penalty = 0;
        }
        team.submissions.sort((a: any, b: any) => a.timeSeconds - b.timeSeconds);
    });

    return {
        contestInfo,
        totalTeams,
        totalProblems,
        problemWeights: weights,
        teams: teamsData
    };
}


vjudgeRoute.post('/login', async (c) => {
    try {
        const { username, password } = await c.req.json();

        if (!username || !password) {
            return c.json({ error: 'Username and password are required' }, 400);
        }

        const response = await fetch('https://vjudge.net/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: new URLSearchParams({
                username,
                password
            })
        });

        const setCookie = response.headers.get('set-cookie');
        let jsessionid = '';
        if (setCookie) {
            const match = setCookie.match(/JSESSIONID=([^;]+)/);
            if (match) {
                jsessionid = match[1];
            }
        }

        if (jsessionid) {
            return c.json({ jsessionid });
        } else {
            return c.json({ error: 'Login failed, JSESSIONID not found' }, 401);
        }
    } catch (error: any) {
        return c.json({ error: 'Error during VJudge authentication', details: error.message }, 500);
    }
});

vjudgeRoute.post('/contest-rank/:contestId', async (c) => {
    const contestId = c.req.param('contestId');
    const jsessionid = c.req.header('X-VJudge-Session');
    const { problemWeights } = await c.req.json();

    if (!jsessionid) {
        return c.json({ status: 'error', message: 'VJudge session not provided.', code: 'NO_VJUDGE_SESSION' }, 401);
    }

    if (!/^\d+$/.test(contestId)) {
        return c.json({ status: 'error', message: 'Invalid Contest ID format. Must be numeric.', contestId: contestId }, 400);
    }

    const vjudgeUrl = `https://vjudge.net/contest/rank/single/${contestId}`;

    try {
        const response = await fetch(vjudgeUrl, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://vjudge.net/contest/${contestId}`,
                'Cookie': `JSESSIONID=${jsessionid}`,
            },
        });

        if (!response.ok) {
            return c.json({ status: 'error', message: `Vjudge API returned status ${response.status}`, vjudge_url: vjudgeUrl }, response.status as StatusCode);
        }

        const contentType = response.headers.get('content-type');
        const textData = await response.text();

        if (!contentType || !contentType.includes('application/json')) {
            try {
                const rawData = JSON.parse(textData);
                const structuredData = processVjudgeRankData(rawData, problemWeights);
                if (structuredData.error) {
                    return c.json({ status: 'error', message: 'Failed to process data received from Vjudge.', details: structuredData.error, vjudge_url: vjudgeUrl }, 500);
                }
                return c.json(structuredData);
            } catch (e) {
                return c.json({ status: 'error', message: 'Vjudge returned non-JSON response and parsing failed.', vjudge_url: vjudgeUrl, data_received: textData.substring(0, 500) }, 500);
            }
        }

        const rawData = JSON.parse(textData);
        const structuredData = processVjudgeRankData(rawData, problemWeights);

        if (structuredData.error) {
            return c.json({ status: 'error', message: 'Failed to process data received from Vjudge.', details: structuredData.error, vjudge_url: vjudgeUrl }, 500);
        }

        return c.json(structuredData);

    } catch (error: any) {
        return c.json({ status: 'error', message: 'Error fetching or processing contest data', error_details: error.message, vjudge_url: vjudgeUrl }, 500);
    }
});

export default vjudgeRoute;
