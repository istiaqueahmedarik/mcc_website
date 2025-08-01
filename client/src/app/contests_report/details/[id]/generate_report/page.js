import { getContestStructuredRank, getContestStructuredRankWithDemerits, getContestRoomContestById, getAllContestRoomContests, getDemeritsByContestId } from '@/actions/contest_details';
import ReportTable from '@/components/ReportTable';
import { Button } from '@/components/ui/button';
import React from 'react'


function mergeResultsByUser(results, contestIdToWeight = {}, allDemerits = {}) {
  // Add defensive checks
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { 
      users: [], 
      contestIds: [], 
      contestIdToTitle: {} 
    };
  }

  const contests = results.map(r => r?.contestInfo).filter(Boolean);
  const contestIdToTitle = Object.fromEntries(contests.map(c => [c.id, c.title]));
  const contestIds = contests.map(c => c.id);
  const userMap = {};
  
  for (const contest of results) {
    // Skip if contest or contest.teams is invalid
    if (!contest || !contest.contestInfo || !contest.teams || !Array.isArray(contest.teams)) {
      continue;
    }
    
    for (const team of contest.teams) {
      if (!team || !team.username) {
        continue;
      }
      
      if (!userMap[team.username]) {
        userMap[team.username] = {
          username: team.username,
          realName: team.realName || team.username,
          avatarUrl: team.avatarUrl,
          contests: {},
          totalSolved: 0,
          totalPenalty: 0,
          totalScore: 0,
          attended: 0,
          totalDemeritPoints: 0,
          demerits: {}, // Add demerits object back
          originalTotalScore: 0, // Track original score before demerits
        };
      }
      const weight = contestIdToWeight[contest.contestInfo.id] ?? 1;
      
      // Use the already processed finalScore from the team data
      const finalScore = (team.finalScore || 0) * weight;
      
      // Get demerits for this user in this contest
      const contestDemerits = allDemerits[contest.contestInfo.id] || [];
      const userDemerits = contestDemerits.filter(d => d.vjudge_id === team.username);
      
      userMap[team.username].contests[contest.contestInfo.id] = {
        solved: team.solvedCount || 0,
        penalty: team.penalty || 0, // Already includes demerit penalty
        finalScore,
        submissions: team.submissions || [],
        contestId: contest.contestInfo.id,
        contestTitle: contest.contestInfo.title,
        demeritPoints: team.demeritPoints || 0,
        demerits: userDemerits,
      };
      
      // Store demerits data for easy access by ReportTable
      userMap[team.username].demerits[contest.contestInfo.id] = userDemerits;
      
      userMap[team.username].totalDemeritPoints += (team.demeritPoints || 0);
      userMap[team.username].totalSolved += (team.solvedCount || 0);
      userMap[team.username].totalPenalty += (team.penalty || 0);
      userMap[team.username].totalScore += finalScore;
      userMap[team.username].attended += 1;
    }
  }
  
  for (const user of Object.values(userMap)) {
    for (const cid of contestIds) {
      if (!user.contests[cid]) {
        // Get demerits for this user in this contest even if they didn't participate
        const contestDemerits = allDemerits[cid] || [];
        const userDemerits = contestDemerits.filter(d => d.vjudge_id === user.username);
        const userDemeritPoints = userDemerits.reduce((sum, d) => sum + (d.demerit_point || 0), 0);
        
        user.contests[cid] = {
          solved: 0,
          penalty: userDemeritPoints * 100, // Only demerit penalty for non-participants
          finalScore: Math.max(0, 0 - userDemeritPoints), // Negative score from demerits
          submissions: [],
          contestId: cid,
          contestTitle: contestIdToTitle[cid] || 'Unknown Contest',
          demeritPoints: userDemeritPoints,
          demerits: userDemerits,
        };
        
        // Store demerits data
        user.demerits[cid] = userDemerits;
        user.totalDemeritPoints += userDemeritPoints;
        user.totalPenalty += (userDemeritPoints * 100);
        user.totalScore += Math.max(0, 0 - userDemeritPoints);
      }
    }
    
    // Add safety checks for calculations
    if (contestIds.length === 0) {
      user.stdDeviationPen = 0;
      user.stdDeviationScore = 0;
      user.effectiveSolved = user.totalScore;
      user.effectivePenalty = user.totalPenalty;
      continue;
    }
    
    const scores = contestIds.map(cid => user.contests[cid]?.finalScore || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scores.length;
    const totPen = contestIds.map(cid => user.contests[cid]?.penalty || 0);
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
  let allDemerits = {};

  if (searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)) {
    const res = await getContestStructuredRankWithDemerits(searchParamsBox.id);
    if (res && res.status !== 'error' && res.teams) {
      results.push(res);
      contestIdToWeight[searchParamsBox.id] = searchParamsBox.weight ? Number(searchParamsBox.weight) : 1;
      
      // Fetch demerits for tooltip functionality
      try {
        const demeritRes = await getDemeritsByContestId(searchParamsBox.id);
        if (demeritRes.success) {
          allDemerits[searchParamsBox.id] = demeritRes.data;
        } else {
          allDemerits[searchParamsBox.id] = [];
        }
      } catch (error) {
        console.error('Error fetching demerits for contest:', searchParamsBox.id, error);
        allDemerits[searchParamsBox.id] = [];
      }
    } else {
      console.warn('Failed to fetch contest data for ID:', searchParamsBox.id, res);
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
          let r = await getContestStructuredRankWithDemerits(cid.id);
          if(r.status && r.status === 'error')  continue;
          console.log(r,cid.title)
          if(cid.title) r.contestInfo.title = cid.title;
          if (r && r.status !== 'error' && r.teams) {
            results.push(r);
            
            // Fetch demerits for tooltip functionality
            try {
              const demeritRes = await getDemeritsByContestId(cid.id);
              if (demeritRes.success) {
                allDemerits[cid.id] = demeritRes.data;
              } else {
                allDemerits[cid.id] = [];
              }
            } catch (error) {
              console.error('Error fetching demerits for contest:', cid.id, error);
              allDemerits[cid.id] = [];
            }
          } else {
            console.warn('Failed to fetch contest data for ID:', cid.id, r);
          }
        }
      }
    }
  }

  const merged = mergeResultsByUser(results, contestIdToWeight, allDemerits);
  
  // Add defensive check to ensure merged data is valid
  if (!merged || !merged.users || !Array.isArray(merged.users)) {
    console.error('Invalid merged data:', merged);
    return (
      <div>
        <p>Error: Unable to load contest data. Please try again.</p>
      </div>
    );
  }
  
  console.log(merged)
  const liveReportId = (await params).id + (searchParamsBox.id ? `_${searchParamsBox.id}` : '');
  return (
    <div>
      <ReportTable merged={merged} liveReportId={liveReportId} report_id={(await params).id} partial={searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)} name={name} />
    </div>
  )
}

export default page