import { getContestStructuredRank, getContestRoomContestById, getAllContestRoomContests } from '@/actions/contest_details';
import ReportTable from '@/components/ReportTable';
import { Button } from '@/components/ui/button';
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
        user.contests[cid] = {
          solved: 0,
          penalty: 0,
          finalScore: 0,
          submissions: [],
          contestId: cid,
          contestTitle: contestIdToTitle[cid],
        };
      }
    }
    const scores = contestIds.map(cid => user.contests[cid].finalScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scores.length;
    const totPen = contestIds.map(cid => user.contests[cid].penalty);
    const meanPen = totPen.reduce((a, b) => a + b, 0) / totPen.length;
    const variancePen = totPen.reduce((sum, val) => sum + Math.pow(val - meanPen, 2), 0) / totPen.length;
    user.stdDeviationPen = Math.sqrt(variancePen);
    user.stdDeviationScore = Math.sqrt(variance);
    user.effectiveSolved = user.totalScore - user.stdDeviationScore;
    user.effectivePenalty = user.totalPenalty + user.stdDeviationPen;
  }
  const sortedUsers = Object.values(userMap).sort((a, b) => {
    if (b.effectiveSolved !== a.effectiveSolved) return b.effectiveSolved - a.effectiveSolved;
    if (a.effectivePenalty !== b.effectivePenalty) return a.effectivePenalty - b.effectivePenalty;
    return b.attended - a.attended;
  });
  return { users: sortedUsers, contestIds, contestIdToTitle };
}

async function page({ params, searchParams }) {
  const searchParamsBox = await searchParams;
  let contestIds = [];
  let name = ""
  let results = [];
  let usedFallback = false;
  let contestIdToWeight = {};

  if (searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)) {
    const res = await getContestStructuredRank(searchParamsBox.id);
    if (res && res.status !== 'error') {
      results.push(res);
      contestIdToWeight[searchParamsBox.id] = searchParamsBox.weight ? Number(searchParamsBox.weight) : 1;
    } else {
      usedFallback = true;
    }
  } else {
    usedFallback = true;
  }

  if (usedFallback) {
    const roomId = (await params).id;
    const roomRes = await getContestRoomContestById(roomId);
    console.log(roomRes);
    if (roomRes && roomRes.result && Array.isArray(roomRes.result)) {
      name = roomRes.name;
      contestIds = roomRes.result.map(x => ({
        id: x.contest_id,
        title: x.contest_name
      }));
      console.log(contestIds);
      for (const c of roomRes.result) {
        contestIdToWeight[c.contest_id] = c.weight ?? 1;
      }
      for (const cid of contestIds) {
        if (/^\d+$/.test(cid.id)) {
          let r = await getContestStructuredRank(cid.id);
          console.log(r,cid.title)
          if(cid.title) r.contestInfo.title = cid.title;
          if (r && r.status !== 'error') results.push(r);
        }
      }
    }
  }

  const merged = mergeResultsByUser(results, contestIdToWeight);
  console.log(merged)
  const liveReportId = (await params).id + (searchParamsBox.id ? `_${searchParamsBox.id}` : '');
  return (
    <div>
      <ReportTable merged={merged} liveReportId={liveReportId} report_id={(await params).id} partial={searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)} name={name} />
    </div>
  )
}

export default page