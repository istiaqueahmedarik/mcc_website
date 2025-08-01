'use server'

import { cookies } from 'next/headers';
import { post_with_token, get_with_token } from '@/lib/action';

const API_URL = process.env.SERVER_URL || 'http://localhost:5000';

function contest_alias_title(id, title) {
    return title;
}

function processVjudgeRankData(rawData, problemWeights) {
    if (!rawData || typeof rawData !== 'object') {
        return {
            error: "Invalid or non-JSON data received from Vjudge",
            dataReceived: rawData
        };
    }

    const { id, title, begin, length, participants, submissions } = rawData;

    let alias_title

    const contestInfo = {
        id,
        title,
        begin,
        length,
        end: begin + length
    };

    const participantMap = new Map();
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
            const [teamId, problemIndex, status, timeSeconds, cumulativeScore, unknownVal] = sub;
            if(timeSeconds>(contestInfo.length)/1000)continue;
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

    let weights = [];
    if (Array.isArray(problemWeights) && problemWeights.length === totalProblems) {
        weights = problemWeights;
    } else {
        weights = Array(totalProblems).fill(1);
    }

    const teamsData = Array.from(participantMap.values());

    teamsData.forEach(team => {
        if (team.submissions.length > 0) {
            const solvedProblems = new Set();
            const problemSubs = {};
            team.submissions.forEach(s => {
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
        team.submissions.sort((a, b) => a.timeSeconds - b.timeSeconds);
    });

    return {
        contestInfo,
        totalTeams,
        totalProblems,
        problemWeights: weights,
        teams: teamsData
    };
}

export async function loginToVJudge(email, pass) {
    try {
        const response = await fetch(`${API_URL}/vjudge/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: email, password: pass }),
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const { jsessionid } = data;

        if (jsessionid) {
            cookies().set('vj_session', jsessionid, { httpOnly: true, path: '/', sameSite: 'lax' });
            cookies().set('vj_session_username', email, { httpOnly: true, path: '/', sameSite: 'lax' });
            cookies().set('vj_session_password', pass, { httpOnly: true, path: '/', sameSite: 'lax' });
            return jsessionid;
        }
        return "";
    } catch (error) {
        console.error('Error during VJudge authentication:', error);
        return "";
    }
}

export async function revalidateVJudgeSession() {
    const username = cookies().get('vj_session_username')?.value;
    const password = cookies().get('vj_session_password')?.value;
    if (!username || !password) return { status: 'error' }
    await loginToVJudge(username, password);
    return { status: 'success' }
}

export async function getContestStructuredRank(contestId, problemWeights) {
    const vjSession = cookies().get('vj_session')?.value;
    if (!vjSession) {
        return {
            status: 'error',
            message: 'VJudge login required. Please login first.',
            code: 'NO_VJUDGE_SESSION'
        };
    }

    try {
        const response = await fetch(`${API_URL}/vjudge/contest-rank/${contestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VJudge-Session': vjSession,
            },
            body: JSON.stringify({ problemWeights }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                await revalidateVJudgeSession();
                 const newVjSession = cookies().get('vj_session')?.value;
                 const retryResponse = await fetch(`${API_URL}/vjudge/contest-rank/${contestId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-VJudge-Session': newVjSession,
                    },
                    body: JSON.stringify({ problemWeights }),
                });
                if(!retryResponse.ok) {
                    const errorData = await retryResponse.json();
                    return { status: 'error', ...errorData };
                }
                return await retryResponse.json();
            }
            const errorData = await response.json();
            return { status: 'error', ...errorData };
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching/processing data for Contest ID ${contestId}:`, error.message);
        return {
            status: 'error',
            message: 'Error fetching or processing contest data',
            error_details: error.message,
        };
    }
}

export async function insertContestRoom(roomName) {
    const ret = await post_with_token('contest-room/insert', { room_name: roomName });
    console.log(ret);
    return ret;
}

export async function getAllContestRooms() {
    const ret = await get_with_token('contest-room/all');
    console.log(ret);
    return ret;
}

export async function getContestRoomById(roomId) {
    const ret = await post_with_token('contest-room/get', { room_id: roomId });
    console.log(ret);
    return ret;
}

export async function updateContestRoom(roomId, roomName) {
    const ret = await post_with_token('contest-room/update', { room_id: roomId, room_name: roomName });
    console.log(ret);
    return ret;
}

export async function deleteContestRoom(roomId) {
    const ret = await post_with_token('contest-room/delete', { room_id: roomId });
    console.log(ret);
    return ret;
}

export async function insertContestRoomContest(roomId, contestId,contestName) {
    const ret = await post_with_token('contest-room-contests/insert', { room_id: roomId, contest_id: contestId, name: contestName });
    console.log(ret);
    return ret;
}

export async function getAllContestRoomContests() {
    const ret = await get_with_token('contest-room-contests/all');
    console.log(ret);
    return ret;
}

export async function getContestRoomContestById(contestRoomContestId) {
    const ret = await post_with_token('contest-room-contests/get', { contest_room_contest_id: contestRoomContestId });
    console.log(ret);
    return ret;
}

export async function updateContestRoomContest(contestRoomContestId, roomId, contestId) {
    const ret = await post_with_token('contest-room-contests/update', { contest_room_contest_id: contestRoomContestId, room_id: roomId, contest_id: contestId });
    console.log(ret);
    return ret;
}

export async function deleteContestRoomContest(contestRoomContestId) {
    const ret = await post_with_token('contest-room-contests/delete', { contest_room_contest_id: contestRoomContestId });
    console.log(ret);
    return ret;
}

export async function updateContestRoomContestWithWeight(contestRoomContestId, roomId, contestId, weight) {
    const ret = await post_with_token('contest-room-contests/update', {
        contest_room_contest_id: contestRoomContestId,
        room_id: roomId,
        contest_id: contestId,
        weight: weight
    });
    console.log(ret);
    return ret;
}