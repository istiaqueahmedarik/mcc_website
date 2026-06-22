import {
  getContestStructuredRankWithDemerits,
  getContestRoomContestById,
  getDemeritsByContestId,
} from "@/actions/contest_details";
import { publicFinalizedTeamsByContest } from "@/actions/team_collection";
import ReportTable from "@/components/ReportTable";

function normalizeRoomType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "TSC" || normalized === "TPC" || normalized === "TFC") {
    return normalized;
  }
  return "TFC";
}

function clampPercentage(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
}

function mergeResultsByUser(results, contestIdToWeight = {}, allDemerits = {}) {
  // Add defensive checks
  if (!results || !Array.isArray(results) || results.length === 0) {
    return {
      users: [],
      contestIds: [],
      contestIdToTitle: {},
    };
  }

  const contests = results.map((r) => r?.contestInfo).filter(Boolean);
  const contestIdToTitle = Object.fromEntries(
    contests.map((c) => [c.id, c.title])
  );
  const contestIds = contests.map((c) => c.id);
  const userMap = {};

  for (const contest of results) {
    // Skip if contest or contest.teams is invalid
    if (
      !contest ||
      !contest.contestInfo ||
      !contest.teams ||
      !Array.isArray(contest.teams)
    ) {
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
      const userDemerits = contestDemerits.filter(
        (d) => d.vjudge_id === team.username
      );

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

      userMap[team.username].totalDemeritPoints += team.demeritPoints || 0;
      userMap[team.username].totalSolved += team.solvedCount || 0;
      userMap[team.username].totalPenalty += team.penalty || 0;
      userMap[team.username].totalScore += finalScore;
      userMap[team.username].attended += 1;
    }
  }

  for (const user of Object.values(userMap)) {
    for (const cid of contestIds) {
      if (!user.contests[cid]) {
        // Get demerits for this user in this contest even if they didn't participate
        const contestDemerits = allDemerits[cid] || [];
        const userDemerits = contestDemerits.filter(
          (d) => d.vjudge_id === user.username
        );
        const userDemeritPoints = userDemerits.reduce(
          (sum, d) => sum + (d.demerit_point || 0),
          0
        );

        user.contests[cid] = {
          solved: 0,
          penalty: userDemeritPoints * 100, // Only demerit penalty for non-participants
          finalScore: Math.max(0, 0 - userDemeritPoints), // Negative score from demerits
          submissions: [],
          contestId: cid,
          contestTitle: contestIdToTitle[cid] || "Unknown Contest",
          demeritPoints: userDemeritPoints,
          demerits: userDemerits,
        };

        // Store demerits data
        user.demerits[cid] = userDemerits;
        user.totalDemeritPoints += userDemeritPoints;
        user.totalPenalty += userDemeritPoints * 100;
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

    const scores = contestIds.map((cid) => user.contests[cid]?.finalScore || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      scores.length;
    const totPen = contestIds.map((cid) => user.contests[cid]?.penalty || 0);
    const meanPen = totPen.reduce((a, b) => a + b, 0) / totPen.length;
    const variancePen =
      totPen.reduce((sum, val) => sum + Math.pow(val - meanPen, 2), 0) /
      totPen.length;
    user.stdDeviationPen = Math.sqrt(variancePen);
    user.stdDeviationScore = Math.sqrt(variance);
    user.effectiveSolved = user.totalScore - user.stdDeviationScore;
    user.effectivePenalty = user.totalPenalty + user.stdDeviationPen;
  }

  const sortedUsers = Object.values(userMap).sort((a, b) => {
    if (b.effectiveSolved !== a.effectiveSolved)
      return b.effectiveSolved - a.effectiveSolved;
    if (a.effectivePenalty !== b.effectivePenalty)
      return a.effectivePenalty - b.effectivePenalty;
    return b.attended - a.attended;
  });

  return { users: sortedUsers, contestIds, contestIdToTitle };
}

function mergeResultsForTsc(
  results,
  contestIdToWeight = {},
  tfcScoreByTeam = new Map(),
  tfcPercentage = 0,
  tscPercentage = 100
) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return {
      users: [],
      contestIds: [],
      contestIdToTitle: {},
      scoringMode: "TSC_COMBINED",
      tscConfig: {
        tfcPercentage,
        tscPercentage,
        highestTfcScore: 0,
        highestTscScore: 0,
      },
    };
  }

  const contests = results.map((r) => r?.contestInfo).filter(Boolean);
  const contestIdToTitle = Object.fromEntries(
    contests.map((c) => [c.id, c.title])
  );
  const contestIds = contests.map((c) => c.id);
  const teamMap = {};

  for (const contest of results) {
    if (
      !contest ||
      !contest.contestInfo ||
      !contest.teams ||
      !Array.isArray(contest.teams)
    ) {
      continue;
    }

    for (const team of contest.teams) {
      const teamName = String(team?.username || "").trim();
      if (!teamName) continue;

      if (!teamMap[teamName]) {
        teamMap[teamName] = {
          username: teamName,
          realName: teamName,
          avatarUrl: null,
          contests: {},
          totalSolved: 0,
          totalPenalty: 0,
          totalScore: 0,
          attended: 0,
          totalDemeritPoints: 0,
          demerits: {},
        };
      }

      const weight = contestIdToWeight[contest.contestInfo.id] ?? 1;
      const finalScore = (team.finalScore || 0) * weight;

      teamMap[teamName].contests[contest.contestInfo.id] = {
        solved: team.solvedCount || 0,
        penalty: team.penalty || 0,
        finalScore,
        submissions: team.submissions || [],
        contestId: contest.contestInfo.id,
        contestTitle: contest.contestInfo.title,
        demeritPoints: team.demeritPoints || 0,
        demerits: [],
      };

      teamMap[teamName].totalDemeritPoints += team.demeritPoints || 0;
      teamMap[teamName].totalSolved += team.solvedCount || 0;
      teamMap[teamName].totalPenalty += team.penalty || 0;
      teamMap[teamName].totalScore += finalScore;
      teamMap[teamName].attended += 1;
    }
  }

  for (const team of Object.values(teamMap)) {
    for (const cid of contestIds) {
      if (!team.contests[cid]) {
        team.contests[cid] = {
          solved: 0,
          penalty: 0,
          finalScore: 0,
          submissions: [],
          contestId: cid,
          contestTitle: contestIdToTitle[cid] || "Unknown Contest",
          demeritPoints: 0,
          demerits: [],
        };
      }
    }
  }

  const highestTscScore = Math.max(
    ...Object.values(teamMap).map((team) => Number(team.totalScore) || 0),
    0
  );
  const highestTfcScore = Math.max(
    ...Array.from(tfcScoreByTeam.values()).map((value) => Number(value) || 0),
    0
  );

  for (const team of Object.values(teamMap)) {
    const tfcRawScore = Number(
      tfcScoreByTeam.get(String(team.username).toLowerCase()) || 0
    );
    const tscRawScore = Number(team.totalScore) || 0;

    const tfcComponent =
      tfcPercentage > 0 && highestTfcScore > 0
        ? (tfcRawScore / highestTfcScore) * tfcPercentage
        : 0;
    const tscComponent =
      tscPercentage > 0 && highestTscScore > 0
        ? (tscRawScore / highestTscScore) * tscPercentage
        : 0;
    const combinedScore = tfcComponent + tscComponent;

    team.tfcScore = tfcRawScore;
    team.tscScore = tscRawScore;
    team.tfcComponent = tfcComponent;
    team.tscComponent = tscComponent;
    team.totalScore = combinedScore;
    team.stdDeviationPen = 0;
    team.stdDeviationScore = 0;
    team.effectiveSolved = combinedScore;
    team.effectivePenalty = team.totalPenalty;
  }

  const sortedUsers = Object.values(teamMap).sort((a, b) => {
    if (b.effectiveSolved !== a.effectiveSolved)
      return b.effectiveSolved - a.effectiveSolved;
    if (a.effectivePenalty !== b.effectivePenalty)
      return a.effectivePenalty - b.effectivePenalty;
    if (b.attended !== a.attended) return b.attended - a.attended;
    return String(a.username).localeCompare(String(b.username));
  });

  return {
    users: sortedUsers,
    contestIds,
    contestIdToTitle,
    scoringMode: "TSC_COMBINED",
    tscConfig: {
      tfcPercentage,
      tscPercentage,
      highestTfcScore,
      highestTscScore,
    },
  };
}

async function getTfcScoreMap(referenceRoomId) {
  const scoreByTeam = new Map();
  if (!referenceRoomId) return scoreByTeam;

  try {
    const finalized = await publicFinalizedTeamsByContest();
    const blocks = Array.isArray(finalized?.result) ? finalized.result : [];
    const target = blocks.find(
      (block) => String(block?.room_id || "") === String(referenceRoomId)
    );

    if (!target || !Array.isArray(target?.teams)) return scoreByTeam;

    for (const team of target.teams) {
      const score = Number(team?.combined_score);
      const normalizedScore = Number.isFinite(score) ? score : 0;

      const title = String(team?.team_title || "").trim().toLowerCase();
      if (title) {
        scoreByTeam.set(title, normalizedScore);
      }

      const members = Array.isArray(team?.members) ? team.members : [];
      for (const member of members) {
        const normalizedMember = String(member || "").trim().toLowerCase();
        if (!normalizedMember) continue;
        scoreByTeam.set(normalizedMember, normalizedScore);
      }
    }
  } catch (error) {
    console.error("Failed to build TFC score map", error);
  }

  return scoreByTeam;
}

async function fetchContestDataWithDemerits(contestId, contestName, allDemerits) {
  const response = await getContestStructuredRankWithDemerits(contestId);
  if (!response || response.status === "error" || !Array.isArray(response.teams)) {
    return null;
  }

  if (!response.contestInfo) {
    response.contestInfo = {
      id: contestId,
      title: contestName || `Contest ${contestId}`,
    };
  } else if (contestName) {
    response.contestInfo.title = contestName;
  }

  try {
    const demeritRes = await getDemeritsByContestId(contestId);
    if (demeritRes?.success) {
      allDemerits[contestId] = demeritRes.data;
    } else {
      allDemerits[contestId] = [];
    }
  } catch (error) {
    console.error("Error fetching demerits for contest:", contestId, error);
    allDemerits[contestId] = [];
  }

  return response;
}

async function page({ params, searchParams }) {
  const paramsBox = await params;
  const roomId = paramsBox.id;
  const searchParamsBox = await searchParams;
  const requestedContestId =
    searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)
      ? String(searchParamsBox.id)
      : null;

  let name = "";
  let roomType = "TFC";
  let roomMeta = null;
  let results = [];
  let contestIdToWeight = {};
  let allDemerits = {};

  const roomRes = await getContestRoomContestById(roomId);
  const roomContests = Array.isArray(roomRes?.result) ? roomRes.result : [];
  roomMeta = roomRes?.room || null;
  roomType = normalizeRoomType(roomMeta?.contest_type);
  name = roomRes?.name || roomMeta?.["Room Name"] || "";

  const defaultTfcPercentage = clampPercentage(roomMeta?.tfc_percentage, 0);
  const selectedTfcPercentage =
    roomType === "TSC"
      ? defaultTfcPercentage
      : 0;
  const derivedTscPercentage = roomType === "TSC" ? 100 - selectedTfcPercentage : 100;

  let contestsToFetch = roomContests;
  if (requestedContestId) {
    const contestFromRoom = roomContests.find(
      (contest) => String(contest?.contest_id) === requestedContestId
    );

    contestsToFetch = [
      contestFromRoom || {
        contest_id: requestedContestId,
        contest_name: `Contest ${requestedContestId}`,
        weight: searchParamsBox.weight ? Number(searchParamsBox.weight) : 1,
      },
    ];
  }

  for (const contest of contestsToFetch) {
    const contestId = String(contest?.contest_id || "").trim();
    if (!/^\d+$/.test(contestId)) continue;

    const fromContestRow = Number(contest?.weight);
    const fromQuery = Number(searchParamsBox.weight);
    const weight = Number.isFinite(fromContestRow)
      ? fromContestRow
      : requestedContestId && Number.isFinite(fromQuery)
        ? fromQuery
        : 1;

    contestIdToWeight[contestId] = weight;

    const result = await fetchContestDataWithDemerits(
      contestId,
      contest?.contest_name,
      allDemerits
    );
    if (!result) {
      continue;
    }
    results.push(result);
  }

  let merged = null;
  if (roomType === "TSC") {
    const tfcPercentage = selectedTfcPercentage;
    const tscPercentage = derivedTscPercentage;
    const tfcRoomId = roomMeta?.tfc_room_id ? String(roomMeta.tfc_room_id) : null;
    const tfcScoreByTeam = await getTfcScoreMap(tfcRoomId);

    merged = mergeResultsForTsc(
      results,
      contestIdToWeight,
      tfcScoreByTeam,
      tfcPercentage,
      tscPercentage
    );
    merged.tscConfig = {
      ...(merged.tscConfig || {}),
      tfcRoomId,
    };
  } else {
    merged = mergeResultsByUser(results, contestIdToWeight, allDemerits);
  }

  merged.name = name;
  merged.roomType = roomType;

  // Add defensive check to ensure merged data is valid
  if (!merged || !merged.users || !Array.isArray(merged.users)) {
    console.error("Invalid merged data:", merged);
    return (
      <div>
        <p>Error: Unable to load contest data. Please try again.</p>
      </div>
    );
  }

  const liveReportId = roomId + (requestedContestId ? `_${requestedContestId}` : "");
  return (
    <div className="space-y-4">
      <ReportTable
        merged={merged}
        liveReportId={liveReportId}
        name={name}
      />
    </div>
  );
}

export default page;
