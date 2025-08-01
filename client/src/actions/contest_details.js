'use server'

import { cookies } from 'next/headers';
import { post_with_token, get_with_token } from '@/lib/action';

const API_URL = process.env.SERVER_URL || 'http://localhost:5000';

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

export async function getContestStructuredRankWithDemerits(contestId, problemWeights) {
    const vjSession = cookies().get('vj_session')?.value;
    if (!vjSession) {
        return {
            status: 'error',
            message: 'VJudge login required. Please login first.',
            code: 'NO_VJUDGE_SESSION'
        };
    }

    try {
        // Fetch VJudge contest data (already processed by server)
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
                if (!retryResponse.ok) {
                    const errorData = await retryResponse.json();
                    return { status: 'error', ...errorData };
                }
                const contestData = await retryResponse.json();
                
                // Fetch demerits and apply them to the contest data
                return await applyDemeritsToContestData(contestData, contestId);
            }
            const errorData = await response.json();
            return { status: 'error', ...errorData };
        }

        const contestData = await response.json();
        
        // Fetch demerits and apply them to the contest data
        return await applyDemeritsToContestData(contestData, contestId);
        
    } catch (error) {
        console.error(`Error fetching/processing data for Contest ID ${contestId}:`, error.message);
        return {
            status: 'error',
            message: 'Error fetching or processing contest data',
            error_details: error.message,
        };
    }
}

async function applyDemeritsToContestData(contestData, contestId) {
    try {
        // Add defensive check for contest data structure
        if (!contestData || contestData.status === 'error' || !contestData.teams) {
            console.warn('Invalid contest data structure:', contestData);
            return contestData;
        }
        
        // Fetch demerits for this contest
        const demeritsResponse = await getDemeritsByContestId(contestId);
        const demerits = demeritsResponse.success ? demeritsResponse.data : [];
        
        // Create a map for quick demerit lookup by username
        const demeritMap = new Map();
        if (Array.isArray(demerits)) {
            demerits.forEach(demerit => {
                const username = demerit.vjudge_id;
                if (!demeritMap.has(username)) {
                    demeritMap.set(username, 0);
                }
                demeritMap.set(username, demeritMap.get(username) + (demerit.demerit_point || 0));
            });
        }
        
        // Apply demerits to each team
        if (contestData.teams && Array.isArray(contestData.teams)) {
            contestData.teams.forEach(team => {
                const teamDemeritPoints = demeritMap.get(team.username) || 0;
                team.demeritPoints = teamDemeritPoints;
                
                // Subtract demerit points from score and add penalty
                team.finalScore = Math.max(0, (team.finalScore || 0) - teamDemeritPoints);
                team.penalty = (team.penalty || 0) + (teamDemeritPoints * 100);
            });
        }
        
        return contestData;
    } catch (error) {
        console.error('Error applying demerits to contest data:', error);
        // If demerit application fails, return the original contest data
        return contestData;
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

// Demerit management functions
export async function createDemerit(contestId, vjudgeId, demeritPoint, reason) {
    const ret = await post_with_token('demerit/admin/create', {
        contest_id: contestId,
        vjudge_id: vjudgeId,
        demerit_point: parseInt(demeritPoint, 10),
        reason: reason
    });
    console.log(ret);
    return ret;
}

export async function getDemeritsByContestId(contestId) {
    const ret = await post_with_token('demerit/by-contest', { contest_id: contestId });
    console.log(ret);
    return ret;
}

export async function getDemeritsByVjudgeAndContest(vjudgeId, contestId) {
    const ret = await post_with_token('demerit/by-vjudge-contest', { 
        vjudge_id: vjudgeId, 
        contest_id: contestId 
    });
    console.log(ret);
    return ret;
}

export async function updateDemerit(demeritId, contestId, vjudgeId, demeritPoint, reason) {
    const ret = await post_with_token('demerit/admin/update', {
        demerit_id: demeritId,
        contest_id: contestId,
        vjudge_id: vjudgeId,
        demerit_point: parseInt(demeritPoint, 10),
        reason: reason
    });
    console.log(ret);
    return ret;
}

export async function deleteDemerit(demeritId) {
    const ret = await post_with_token('demerit/admin/delete', { demerit_id: demeritId });
    console.log(ret);
    return ret;
}

export async function getAllDemerits() {
    const ret = await get_with_token('demerit/admin/all');
    console.log(ret);
    return ret;
}