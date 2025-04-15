import { getContestStructuredRank, getContestRoomContestById, getAllContestRoomContests } from '@/actions/contest_details';
import ReportTable from '@/components/ReportTable';
import React from 'react'


function mergeResultsByUser(results, contestIdToWeight = {}) {
  const contests = results.map(r => r.contestInfo);
  const contestIdToTitle = Object.fromEntries(contests.map(c => [c.id, c.title]));
  const contestIds = contests.map(c => c.id);
  const userMap = {};
  for (const contest of results) {
    for (const team of contest.teams) {
      if (!userMap[team.username]) {
        userMap[team.username] = {
          username: team.username,
          realName: team.realName,
          avatarUrl: team.avatarUrl,
          contests: {},
          totalSolved: 0,
          totalPenalty: 0,
          totalScore: 0,
          attended: 0,
        };
      }
      const weight = contestIdToWeight[contest.contestInfo.id] ?? 1;
      const finalScore = team.solvedCount * weight;
      userMap[team.username].contests[contest.contestInfo.id] = {
        solved: team.solvedCount,
        penalty: team.penalty,
        finalScore,
        submissions: team.submissions,
        contestId: contest.contestInfo.id,
        contestTitle: contest.contestInfo.title,
      };
      userMap[team.username].totalSolved += team.solvedCount;
      userMap[team.username].totalPenalty += team.penalty;
      userMap[team.username].totalScore += finalScore;
      userMap[team.username].attended += 1;
    }
  }
  for (const user of Object.values(userMap)) {
    for (const cid of contestIds) {
      if (!user.contests[cid]) {
        user.contests[cid] = null;
      }
    }
  }
  // Sort users: totalScore desc, totalSolved desc, totalPenalty asc
  const sortedUsers = Object.values(userMap).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.totalSolved !== a.totalSolved) return b.totalSolved - a.totalSolved;
    if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty;
    return b.attended - a.attended;
  });
  return { users: sortedUsers, contestIds, contestIdToTitle };
}

async function page({ params, searchParams }) {
  const searchParamsBox = await searchParams;
  let contestIds = [];
  let results = [];
  let usedFallback = false;
  let contestIdToWeight = {};

  // Try to use the id from searchParams first
  if (searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)) {
    const res = await getContestStructuredRank(searchParamsBox.id);
    if (res && res.status !== 'error') {
      results.push(res);
      // If single contest, try to get weight from searchParams or default to 1
      contestIdToWeight[searchParamsBox.id] = searchParamsBox.weight ? Number(searchParamsBox.weight) : 1;
    } else {
      usedFallback = true;
    }
  } else {
    usedFallback = true;
  }

  // If fallback needed, use params.id to get all contest ids for the room
  if (usedFallback) {
    const roomId = params.id;
    const roomRes = await getContestRoomContestById(roomId);
    // roomRes.result is an array of contest-room-contest objects
    if (roomRes && roomRes.result && Array.isArray(roomRes.result)) {
      contestIds = roomRes.result.map(x => x.contest_id);
      // Build contestIdToWeight from fetched contests
      for (const c of roomRes.result) {
        contestIdToWeight[c.contest_id] = c.weight ?? 1;
      }
      for (const cid of contestIds) {
        if (/^\d+$/.test(cid)) {
          const r = await getContestStructuredRank(cid);
          if (r && r.status !== 'error') results.push(r);
        }
      }
    }
  }

  const merged = mergeResultsByUser(results, contestIdToWeight);

  return (
    <div>
      <ReportTable merged={merged} />
    </div>
  )
}

export default page