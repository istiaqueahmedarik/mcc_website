"use client"
import { getPublicProfilesByVjudgeIds } from "@/actions/report"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCheck, Download, FileText, Info, Minus, Search, TrendingDown, TrendingUp, Users2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import LiveShareModal from "./LiveShareModal"
import { ScrollArea } from "./ui/scroll-area"

function normalizeProvider(value) {
  return String(value || "vjudge").toLowerCase() === "codeforces" ? "codeforces" : "vjudge"
}

function rowIdentity(user) {
  return String(user?.identityKey || user?.username || "")
}

function sourceHandlesForUser(user) {
  return [
    ...(Array.isArray(user?.sourceHandles) ? user.sourceHandles : []),
    user?.username,
    user?.realName,
  ].map((value) => String(value || "").trim()).filter(Boolean)
}

function hasProvider(user, provider) {
  const normalized = normalizeProvider(provider)
  const providers = Array.isArray(user?.providers) ? user.providers.map(normalizeProvider) : []
  if (providers.includes(normalized)) return true
  return Object.values(user?.contests || {}).some((contest) => normalizeProvider(contest?.provider) === normalized)
}

function vjudgeLookupIdForUser(user) {
  const mappedVjudge = user?.classroomMapping?.student?.vjudgeId || user?.classroomMapping?.student?.vjudge_id
  if (mappedVjudge) return String(mappedVjudge).trim().toLowerCase()

  const hasExplicitProviders = Array.isArray(user?.providers) && user.providers.length > 0
  if (hasExplicitProviders && !hasProvider(user, "vjudge")) return ""

  const vjudgeContest = Object.values(user?.contests || {}).find((contest) => normalizeProvider(contest?.provider) === "vjudge")
  const sourceHandle = Array.isArray(vjudgeContest?.sourceHandles) ? vjudgeContest.sourceHandles[0] : null
  return String(sourceHandle || user?.username || "").trim().toLowerCase()
}

function ProviderBadge({ provider }) {
  const normalized = normalizeProvider(provider)
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/70 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-normal",
        normalized === "codeforces"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700",
      )}
    >
      {normalized === "codeforces" ? "CF" : "VJ"}
    </Badge>
  )
}

function ReportTable({
  merged,
  liveReportId,
  name,
  shareControl = null,
  publishEndpoint = null,
  showLiveShare = true,
  solveOnly = false,
  contestOrder = [],
  highlightStudentId = "",
  highlightVjudgeId = "",
  highlightGroupIds = [],
}) {
  const isTscCombined = merged?.scoringMode === "TSC_COMBINED"
  const isScoredSnapshot = Boolean(merged?.snapshotVersion === 2 || merged?.scoring)
  const scorePrecision = Number.isFinite(Number(merged?.scoring?.scorePrecision ?? merged?.scorePrecision))
    ? Number(merged?.scoring?.scorePrecision ?? merged?.scorePrecision)
    : 2
  const formatScore = (value, precision = scorePrecision) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric.toFixed(precision) : "0"
  }
  const clampPercentage = (value, fallback = 0) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return Math.max(0, Math.min(100, numeric))
  }

  const [tfcPercentageInput, setTfcPercentageInput] = useState(() =>
    String(clampPercentage(merged?.tscConfig?.tfcPercentage, 0)),
  )
  const [searchText, setSearchText] = useState("")
  const [removeWorstCount, setRemoveWorstCount] = useState(0)
  const [optOutContests, setOptOutContests] = useState({})
  const [advancedFilters] = useState({
    minSolved: 0,
    maxSolved: Number.POSITIVE_INFINITY,
    minContests: 0,
    performanceFilter: null,
    sortBy: "effectiveTotalSolved", // Default sort by effective solved
    sortDirection: "desc",
  })
  const [publicProfilesByVjudge, setPublicProfilesByVjudge] = useState({})
  const [isProfilesLoading, setIsProfilesLoading] = useState(false)
  const [failedAvatars, setFailedAvatars] = useState(new Set())
  const profileCacheRef = useRef(new Map())
  const latestProfilesRequestRef = useRef(0)
  const serverBase = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    return base ? String(base).replace(/\/+$/, "") : ""
  }, [])
  const debugProfiles = process.env.NEXT_PUBLIC_DEBUG_PROFILE_BATCH === "true"
  const tfcPercentage = useMemo(
    () => clampPercentage(tfcPercentageInput, 0),
    [tfcPercentageInput],
  )
  const tscPercentage = useMemo(
    () => (isTscCombined ? 100 - tfcPercentage : 100),
    [isTscCombined, tfcPercentage],
  )
  const normalizedHighlightStudentId = String(highlightStudentId || "")
  const normalizedHighlightVjudgeId = String(highlightVjudgeId || "").trim().toLowerCase()
  const highlightedGroupIdSet = useMemo(
    () => new Set((highlightGroupIds || []).map((id) => String(id))),
    [highlightGroupIds],
  )
  const mergedContestIds = useMemo(
    () => (Array.isArray(merged?.contestIds) ? merged.contestIds : []),
    [merged?.contestIds],
  )
  const orderedContestIds = useMemo(() => {
    const existingIds = new Set(mergedContestIds)
    const ordered = (Array.isArray(contestOrder) ? contestOrder : []).filter((contestId) => existingIds.has(contestId))
    return [
      ...ordered,
      ...mergedContestIds.filter((contestId) => !ordered.includes(contestId)),
    ]
  }, [contestOrder, mergedContestIds])

  const computeStdDeviation = (values) => {
    if (!Array.isArray(values) || values.length === 0) return 0
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance =
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      values.length
    return Math.sqrt(variance)
  }

  const rankedUsers = useMemo(() => {
    if (isScoredSnapshot) {
      return (Array.isArray(merged.users) ? merged.users : []).map((u) => ({
        ...u,
        totalContestsAttended: Number(u.totalContestsAttended ?? u.attended ?? 0),
        worstContests: [],
        optedOutContests: [],
        effectiveTotalSolved: Number(u.effectiveTotalSolved ?? u.effectiveSolved ?? u.score ?? 0),
        effectiveTotalPenalty: Number(u.effectiveTotalPenalty ?? u.effectivePenalty ?? 0),
        effectiveTotalScore: Number(u.effectiveTotalScore ?? u.score ?? 0),
      }))
    }

    if (solveOnly) {
      const processed = merged.users.map((u) => {
        const activeContestIds = orderedContestIds.filter((cid) => !optOutContests[cid])
        const attendedContests = activeContestIds.map((cid) => [cid, u.contests?.[cid]]).filter(([, perf]) => Boolean(perf))
        const totalSolved = attendedContests.reduce((sum, [, perf]) => sum + Number(perf?.solved || 0), 0)
        const totalContestsAttended = attendedContests.filter(([, perf]) => (
          Number(perf?.solved || 0) > 0 ||
          Boolean(perf?.manualSolveOverride) ||
          (Array.isArray(perf?.submissions) && perf.submissions.length > 0)
        )).length

        return {
          ...u,
          totalContestsAttended,
          worstContests: [],
          optedOutContests: Object.keys(optOutContests).filter((contestId) => optOutContests[contestId] && u.contests?.[contestId]),
          effectiveTotalSolved: totalSolved,
          effectiveTotalPenalty: 0,
          effectiveTotalScore: totalSolved,
        }
      })

      processed.sort((a, b) => {
        for (const contestId of orderedContestIds) {
          if (optOutContests[contestId]) continue
          const contestDelta = Number(b.contests?.[contestId]?.solved || 0) - Number(a.contests?.[contestId]?.solved || 0)
          if (contestDelta !== 0) return contestDelta
        }

        if (a.effectiveTotalSolved !== b.effectiveTotalSolved) {
          return b.effectiveTotalSolved - a.effectiveTotalSolved
        }

        if (a.totalContestsAttended !== b.totalContestsAttended) {
          return b.totalContestsAttended - a.totalContestsAttended
        }

        return String(a.username || "").localeCompare(String(b.username || ""))
      })

      return processed
    }

    let processed = merged.users.map((u) => {
      const allContestIds = Object.keys(u.contests).filter((cid) => !optOutContests[cid])
      const attendedContests = allContestIds.map((cid) => [cid, u.contests[cid]])
      const totalContestsAttended = attendedContests.filter(
        ([_, v]) => v && (v.solved > 0 || (v.submissions && v.submissions.length > 0)),
      ).length
      const processedUser = {
        ...u,
        totalContestsAttended,
        worstContests: [],
        optedOutContests: [],
        effectiveTotalSolved: u.effectiveSolved,
        effectiveTotalPenalty: u.effectivePenalty,
        effectiveTotalScore: u.effectiveSolved,
      }

      if (removeWorstCount > 0 && attendedContests.length > 0) {
        const sortedContests = [...attendedContests].sort((a, b) => {
          if ((a[1]?.solved || 0) !== (b[1]?.solved || 0)) return (a[1]?.solved || 0) - (b[1]?.solved || 0)
          return (b[1]?.penalty || 0) - (a[1]?.penalty || 0)
        })

        const worstToRemove = Math.min(removeWorstCount, attendedContests.length)

        for (let i = 0; i < worstToRemove; i++) {
          const [worstContestId, perf] = sortedContests[i]
          processedUser.worstContests.push(worstContestId)
          processedUser.effectiveTotalSolved -= perf?.solved || 0
          processedUser.effectiveTotalPenalty -= perf?.penalty || 0
          processedUser.effectiveTotalScore -= perf?.finalScore || 0
        }
      }

      Object.keys(optOutContests).forEach((contestId) => {
        if (optOutContests[contestId] && u.contests[contestId]) {
          if (!processedUser.worstContests.includes(contestId)) {
            processedUser.optedOutContests.push(contestId)
            processedUser.effectiveTotalSolved -= u.contests[contestId].solved
            processedUser.effectiveTotalPenalty -= u.contests[contestId].penalty
            processedUser.effectiveTotalScore -= u.contests[contestId].finalScore
          }
        }
      })

      return processedUser
    })

    if (isTscCombined) {
      const highestTfcScore = Number(merged?.tscConfig?.highestTfcScore || 0)

      const adjustedUsers = processed.map((u) => {
        const dropped = new Set([...(u.worstContests || []), ...(u.optedOutContests || [])])
        const keptContestIds = Object.keys(u.contests || {}).filter((cid) => !dropped.has(cid))

        const adjustedTscScore = keptContestIds.reduce(
          (sum, cid) => sum + Number(u.contests?.[cid]?.finalScore || 0),
          0,
        )
        const adjustedPenalty = keptContestIds.reduce(
          (sum, cid) => sum + Number(u.contests?.[cid]?.penalty || 0),
          0,
        )
        const adjustedAttended = keptContestIds.filter((cid) => {
          const performance = u.contests?.[cid]
          return (
            performance &&
            (performance.solved > 0 ||
              (performance.submissions && performance.submissions.length > 0))
          )
        }).length

        const keptScores = keptContestIds.map((cid) => Number(u.contests?.[cid]?.finalScore || 0))
        const keptPenalties = keptContestIds.map((cid) => Number(u.contests?.[cid]?.penalty || 0))

        return {
          ...u,
          _adjustedTscScore: adjustedTscScore,
          _adjustedPenalty: adjustedPenalty,
          _adjustedAttended: adjustedAttended,
          stdDeviationScore: computeStdDeviation(keptScores),
          stdDeviationPen: computeStdDeviation(keptPenalties),
        }
      })

      const highestAdjustedTscScore = Math.max(
        ...adjustedUsers.map((u) => Number(u._adjustedTscScore || 0)),
        0,
      )

      processed = adjustedUsers.map((u) => {
        const tfcRawScore = Number(u.tfcScore || 0)
        const tfcComponent =
          tfcPercentage > 0 && highestTfcScore > 0
            ? (tfcRawScore / highestTfcScore) * tfcPercentage
            : 0
        const tscComponent =
          tscPercentage > 0 && highestAdjustedTscScore > 0
            ? (Number(u._adjustedTscScore || 0) / highestAdjustedTscScore) *
              tscPercentage
            : 0

        const combinedScore = tfcComponent + tscComponent
        const effectivePenalty =
          Number(u._adjustedPenalty || 0) + Number(u.stdDeviationPen || 0)

        return {
          ...u,
          totalContestsAttended: u._adjustedAttended,
          effectiveTotalSolved: combinedScore,
          effectiveTotalScore: combinedScore,
          effectiveTotalPenalty: effectivePenalty,
          effectiveSolved: combinedScore,
          effectivePenalty,
          tfcComponent,
          tscComponent,
          tscAdjustedScore: Number(u._adjustedTscScore || 0),
        }
      })
    }

    processed.sort((a, b) => {
      if (a.effectiveTotalScore !== b.effectiveTotalScore) return b.effectiveTotalScore - a.effectiveTotalScore
      if (a.effectiveTotalSolved !== b.effectiveTotalSolved) return b.effectiveTotalSolved - a.effectiveTotalSolved
      if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty) return a.effectiveTotalPenalty - b.effectiveTotalPenalty
      return b.totalContestsAttended - a.totalContestsAttended
    })

    return processed
  }, [
    merged.users,
    merged?.tscConfig?.highestTfcScore,
    removeWorstCount,
    optOutContests,
    isTscCombined,
    tfcPercentage,
    tscPercentage,
    solveOnly,
    orderedContestIds,
    isScoredSnapshot,
  ])

  const users = useMemo(() => {
    let filtered = rankedUsers.filter(
      (u) =>
        !searchText ||
        u.username.toLowerCase().includes(searchText.toLowerCase()) ||
        (u.realName && u.realName.toLowerCase().includes(searchText.toLowerCase())),
    )

    filtered = filtered.filter((u) => {
      if (u.effectiveTotalSolved < advancedFilters.minSolved) return false
      if (advancedFilters.maxSolved !== Number.POSITIVE_INFINITY && u.effectiveTotalSolved > advancedFilters.maxSolved)
        return false

      if (u.totalContestsAttended < advancedFilters.minContests) return false

      if (advancedFilters.performanceFilter) {
        const [contestId, minSolved] = advancedFilters.performanceFilter.split("|")
        const performance = u.contests[contestId]
        if (!performance || performance.solved < Number.parseInt(minSolved)) return false
      }

      return true
    })

    if (isScoredSnapshot) return filtered

    filtered.sort((a, b) => {
      if (solveOnly) {
        for (const contestId of orderedContestIds) {
          if (optOutContests[contestId]) continue
          const contestDelta = Number(b.contests?.[contestId]?.solved || 0) - Number(a.contests?.[contestId]?.solved || 0)
          if (contestDelta !== 0) return contestDelta
        }

        if (a.effectiveTotalSolved !== b.effectiveTotalSolved) {
          return b.effectiveTotalSolved - a.effectiveTotalSolved
        }

        if (a.totalContestsAttended !== b.totalContestsAttended) {
          return b.totalContestsAttended - a.totalContestsAttended
        }

        return String(a.username || "").localeCompare(String(b.username || ""))
      }

      const direction = advancedFilters.sortDirection === "asc" ? 1 : -1

      switch (advancedFilters.sortBy) {
        case "username":
          return direction * a.username.localeCompare(b.username)
        case "effectiveTotalSolved":
          if (a.effectiveTotalSolved !== b.effectiveTotalSolved)
            return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
          if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty)
            return direction * -1 * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
          return b.totalContestsAttended - a.totalContestsAttended
        case "effectiveTotalScore":
          if (a.effectiveTotalScore !== b.effectiveTotalScore)
            return direction * (a.effectiveTotalScore - b.effectiveTotalScore)
          return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
        case "effectiveTotalPenalty":
          return direction * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
        case "contestsAttended":
          return direction * (a.totalContestsAttended - b.totalContestsAttended)
        default:
          if (a.effectiveTotalScore !== b.effectiveTotalScore) return b.effectiveTotalScore - a.effectiveTotalScore
          if (a.effectiveTotalSolved !== b.effectiveTotalSolved) return b.effectiveTotalSolved - a.effectiveTotalSolved
          if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty)
            return a.effectiveTotalPenalty - b.effectiveTotalPenalty
          return b.totalContestsAttended - a.totalContestsAttended
      }
    })

    return filtered
  }, [
    rankedUsers,
    searchText,
    advancedFilters,
    solveOnly,
    orderedContestIds,
    optOutContests,
    isScoredSnapshot,
  ])

  const profileIds = useMemo(() => {
    const ids = new Set(users.map(vjudgeLookupIdForUser).filter(Boolean))
    return Array.from(ids).sort()
  }, [users])

  const profileIdsSignature = useMemo(() => profileIds.join("|"), [profileIds])

  const areProfileMapsEqual = (a, b) => {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (a[key] !== b[key]) return false
    }
    return true
  }

  const getCustomAvatar = (username) => {
    if (!username) return "?"
    const usernameStr = String(username).trim()
    if (!usernameStr) return "?"
    
    // If username starts with MIST_, use the character after MIST_ (index 5)
    if (usernameStr.startsWith("MIST_")) {
      const char = usernameStr.charAt(5) || usernameStr.charAt(0)
      return char.toUpperCase()
    }
    
    // Otherwise use the first character
    return usernameStr.charAt(0).toUpperCase()
  }

  const resolveAvatarUrl = (rawUrl) => {
    if (typeof rawUrl !== "string") return null
    const value = rawUrl.trim()
    if (!value || value === "null" || value === "undefined") return null

    if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
      return value
    }

    if (value.startsWith("//")) {
      return `https:${value}`
    }

    if (!serverBase) return value
    if (value.startsWith("/")) return `${serverBase}${value}`
    return `${serverBase}/${value.replace(/^\/+/, "")}`
  }

  const toggleOptOut = (contestId) => {
    setOptOutContests((prev) => ({
      ...prev,
      [contestId]: !prev[contestId],
    }))
  }

  useEffect(() => {
    if (!isTscCombined) return
    setTfcPercentageInput(String(clampPercentage(merged?.tscConfig?.tfcPercentage, 0)))
  }, [isTscCombined, merged?.tscConfig?.tfcPercentage])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++latestProfilesRequestRef.current

    const isRequestActive = () => !controller.signal.aborted && requestId === latestProfilesRequestRef.current

    const setProfilesIfChanged = (nextMap) => {
      if (!isRequestActive()) return
      setPublicProfilesByVjudge((prev) => (areProfileMapsEqual(prev, nextMap) ? prev : nextMap))
    }

    const loadProfiles = async () => {
      try {
        if (profileIds.length === 0) {
          setProfilesIfChanged({})
          if (isRequestActive()) setIsProfilesLoading(false)
          return
        }

        const nextMap = {}
        const idsToFetch = []
        profileIds.forEach((id) => {
          if (profileCacheRef.current.has(id)) nextMap[id] = profileCacheRef.current.get(id)
          else idsToFetch.push(id)
        })

        setProfilesIfChanged(nextMap)

        if (idsToFetch.length === 0) {
          if (isRequestActive()) setIsProfilesLoading(false)
          return
        }

        if (isRequestActive()) setIsProfilesLoading(true)

        let batchMap = {}
        let requestFailed = false
        try {
          const json = await getPublicProfilesByVjudgeIds(idsToFetch)
          if (controller.signal.aborted) return

          if (!json || json.error) {
            requestFailed = true
          } else {
            batchMap = json?.result && typeof json.result === "object" ? json.result : {}
          }
        } catch {
          requestFailed = true
        }

        if (!isRequestActive()) return

        const unresolvedIds = []
        idsToFetch.forEach((requestedId) => {
          const profile = batchMap[requestedId] ?? batchMap[requestedId.toLowerCase()] ?? null
          if (profile == null) unresolvedIds.push(requestedId)
          profileCacheRef.current.set(requestedId, profile)
          nextMap[requestedId] = profile
        })

        if (debugProfiles && (requestFailed || unresolvedIds.length > 0)) {
          console.warn("Profile batch fetch diagnostics", {
            requestFailed,
            requested: idsToFetch.length,
            unresolvedIds,
          })
        }

        setProfilesIfChanged(nextMap)
        if (isRequestActive()) setIsProfilesLoading(false)
      } catch (e) {
        if (controller.signal.aborted) return
        console.error("Failed to load public profiles by vjudge id", e)
        if (isRequestActive()) setIsProfilesLoading(false)
      }
    }

    loadProfiles()
    return () => {
      controller.abort()
    }
  }, [profileIdsSignature, profileIds, debugProfiles])

  // Progress: build per-contest ranking and compute last vs previous attended
  const { contestRanks, progressByUser } = useMemo(() => {
    const contestRanks = {}
    const comparePerf = (aPerf, bPerf) => {
      const aScore = aPerf?.finalScore ?? 0
      const bScore = bPerf?.finalScore ?? 0
      if (aScore !== bScore) return bScore - aScore
      const aSolved = aPerf?.solved ?? 0
      const bSolved = bPerf?.solved ?? 0
      if (aSolved !== bSolved) return bSolved - aSolved
      const aPen = aPerf?.penalty ?? Number.POSITIVE_INFINITY
      const bPen = bPerf?.penalty ?? Number.POSITIVE_INFINITY
      return aPen - bPen
    }
    orderedContestIds.forEach((cid) => {
      const participants = merged.users
        .filter((u) => u.contests && u.contests[cid])
        .sort((u1, u2) => comparePerf(u1.contests[cid], u2.contests[cid]))
      const rankMap = {}
      participants.forEach((u, idx) => {
        rankMap[rowIdentity(u)] = idx + 1
      })
      contestRanks[cid] = rankMap
    })
    const lastId = orderedContestIds[orderedContestIds.length - 1]
    const progressByUser = {}
    merged.users.forEach((u) => {
      const identity = rowIdentity(u)
      const lastRank = contestRanks[lastId]?.[identity]
      let prevRank
      for (let i = orderedContestIds.length - 2; i >= 0; i--) {
        const cid = orderedContestIds[i]
        if (u.contests && u.contests[cid]) {
          prevRank = contestRanks[cid]?.[identity]
          if (prevRank !== undefined) break
        }
      }
      let status = 'neutral'
      let delta = 0
      if (lastRank !== undefined && prevRank !== undefined) {
        delta = prevRank - lastRank
        if (delta >= 3) status = 'incredible'
        else if (delta <= -1) status = 'down'
        else status = 'neutral'
      }
      progressByUser[identity] = { status, delta, lastRank, prevRank }
    })
    return { contestRanks, progressByUser }
  }, [merged.users, orderedContestIds])

  const totalUsers = users.length
  const getNameColor = (rank) => {
    if (rank <= 3) {
      const golds = [
        'hsl(47, 95%, 55%)',
        'hsl(47, 85%, 50%)',
        'hsl(47, 75%, 45%)'
      ]
      return golds[rank - 1]
    }
    const hasAfter12 = totalUsers > 12
    if (!hasAfter12) {
      const t = (rank - 4) / Math.max(1, (totalUsers - 4))
      const light = 38 + t * 28
      const sat = 72 - t * 22
      return `hsl(140, ${sat}%, ${light}%)`
    }
    if (rank <= 12) {
      const t = (rank - 4) / 8
      const light = 40 + t * 22
      const sat = 70 - t * 20
      return `hsl(140, ${sat}%, ${light}%)`
    }
    const t = (rank - 13) / Math.max(1, (totalUsers - 13))
    const light = 60 - t * 30
    const sat = 65 + t * 25
    return `hsl(0, ${sat}%, ${light}%)`
  }

  const exportToCSV = () => {
    if (isScoredSnapshot) {
      const headers = [
        "Rank",
        "Username",
        "Real Name",
        "Solved Score",
        "Penalty Score",
        "Contests",
        "Demerits",
        ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
      ]

      const rows = users.map((u, idx) => {
        const base = [
          u.rank || idx + 1,
          u.username,
          u.realName,
          formatScore(u.displaySolvedScore ?? u.solvedScore ?? u.displayScore ?? u.score),
          formatScore(u.displayPenaltyScore ?? u.penaltyScore ?? u.effectiveTotalPenalty ?? u.effectivePenalty),
          u.totalContestsAttended,
          u.totalDemeritPoints || 0,
        ]
        const contestData = orderedContestIds.map((cid) => {
          const perf = u.contests?.[cid]
          return `Solved: ${Number(perf?.solved || 0)}, Penalty Score: ${formatScore(perf?.penalty, 2)}, Solved Score: ${formatScore(perf?.finalScore ?? perf?.rawScore, 2)}`
        })
        return [...base, ...contestData]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const filename = `report_${new Date().toISOString().slice(0, 10)}.csv`
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    if (solveOnly) {
      const headers = [
        "Rank",
        "Name",
        "Real Name",
        "Total Solves",
        "Contests",
        ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
      ]

      const rows = users.map((u, idx) => {
        const base = [
          idx + 1,
          u.username,
          u.realName,
          u.effectiveTotalSolved,
          u.totalContestsAttended,
        ]
        const contestData = orderedContestIds.map((cid) => {
          const perf = u.contests?.[cid]
          return optOutContests[cid] ? "Filtered" : Number(perf?.solved || 0)
        })
        return [...base, ...contestData]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const filename = `report_${new Date().toISOString().slice(0, 10)}.csv`
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    const headers = [
      "Rank",
      "Username",
      "Real Name",
      "Effective Score",
      "Effective Solved",
      "Effective Penalty",
      "Contests Attended",
      ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
    ]

    const rows = (solveOnly ? users : rankedUsers).map((u, idx) => {
      const base = [
        idx + 1,
        u.username,
        u.realName,
        u.effectiveTotalScore.toFixed(2),
        u.effectiveTotalSolved,
        u.effectiveTotalPenalty.toFixed(2),
        u.totalContestsAttended,
      ]
      const contestData = orderedContestIds.map((cid) => {
        const perf = u.contests[cid]
        const isWorst = u.worstContests.includes(cid)
        const isOptedOut = u.optedOutContests.includes(cid)
        if (!perf || isWorst || isOptedOut) {
          const status = isWorst ? "Worst (removed)" : isOptedOut ? "Opted out" : ""
          return `${status ? status + ": " : ""}Solved: 0, Penalty: 0.00, Score: 0.00`
        }
        let status = ""
        if (isWorst) status = "Worst (removed)"
        else if (isOptedOut) status = "Opted out"
        return `${status ? status + ": " : ""}Solved: ${perf.solved}, Penalty: ${perf.penalty.toFixed(2)}, Score: ${perf.finalScore.toFixed(2)}`
      })
      return [...base, ...contestData]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const filename = `report_${new Date().toISOString().slice(0, 10)}.csv`
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename)
    } else {
      const link = document.createElement("a")
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }

  const exportToPDF = async () => {
    // Dynamic import to reduce bundle size
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const headers = isScoredSnapshot
      ? [
        "Rank",
        "Username",
        "Real Name",
        "Solved Score",
        "Penalty Score",
        "Contests",
        "Demerits",
        ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
      ]
      : solveOnly
      ? [
        "Rank",
        "Name",
        "Real Name",
        "Total Solves",
        "Contests",
        ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
      ]
      : [
        "Rank",
        "Username",
        "Real Name",
        "Effective Score",
        "Effective Solved",
        "Effective Penalty",
        "Contests Attended",
        ...orderedContestIds.map((cid) => merged.contestIdToTitle[cid]),
      ]
    const rows = (solveOnly || isScoredSnapshot ? users : rankedUsers).map((u, idx) => {
      if (isScoredSnapshot) {
        const base = [
          u.rank || idx + 1,
          u.username,
          u.realName,
          formatScore(u.displaySolvedScore ?? u.solvedScore ?? u.displayScore ?? u.score),
          formatScore(u.displayPenaltyScore ?? u.penaltyScore ?? u.effectiveTotalPenalty ?? u.effectivePenalty),
          u.totalContestsAttended,
          u.totalDemeritPoints || 0,
        ]
        const contestData = orderedContestIds.map((cid) => {
          const perf = u.contests?.[cid]
          return `Solved: ${Number(perf?.solved || 0)}, Penalty Score: ${formatScore(perf?.penalty, 2)}, Solved Score: ${formatScore(perf?.finalScore ?? perf?.rawScore, 2)}`
        })
        return [...base, ...contestData]
      }

      if (solveOnly) {
        const base = [
          idx + 1,
          u.username,
          u.realName,
          u.effectiveTotalSolved,
          u.totalContestsAttended,
        ]
        const contestData = orderedContestIds.map((cid) => {
          const perf = u.contests?.[cid]
          return optOutContests[cid] ? "Filtered" : Number(perf?.solved || 0)
        })
        return [...base, ...contestData]
      }

      const base = [
        idx + 1,
        u.username,
        u.realName,
        u.effectiveTotalScore.toFixed(2),
        u.effectiveTotalSolved,
        u.effectiveTotalPenalty.toFixed(2),
        u.totalContestsAttended,
      ]
      const contestData = orderedContestIds.map((cid) => {
        const perf = u.contests[cid]
        const isWorst = u.worstContests.includes(cid)
        const isOptedOut = u.optedOutContests.includes(cid)
        if (!perf || isWorst || isOptedOut) {
          const status = isWorst ? "Worst (removed)" : isOptedOut ? "Opted out" : ""
          return `${status ? status + ": " : ""}Solved: 0, Penalty: 0.00, Score: 0.00`
        }
        let status = ""
        if (isWorst) status = "Worst (removed)"
        else if (isOptedOut) status = "Opted out"
        return `${status ? status + ": " : ""}Solved: ${perf.solved}, Penalty: ${perf.penalty.toFixed(2)}, Score: ${perf.finalScore.toFixed(2)}`
      })
      return [...base, ...contestData]
    })

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const fontSize = 10
    const margin = 30
    const rowHeight = 18
    const colWidth = 120
    let y = page.getHeight() - margin

    // Draw headers
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: margin + i * colWidth,
        y: y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0.7),
      })
    })
    y -= rowHeight

    // Draw rows
    rows.forEach((row) => {
      row.forEach((cell, i) => {
        page.drawText(String(cell), {
          x: margin + i * colWidth,
          y: y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      })
      y -= rowHeight
      if (y < margin) {
        y = page.getHeight() - margin
        page = pdfDoc.addPage()
      }
    })

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const filename = `report_${new Date().toISOString().slice(0, 10)}.pdf`
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename)
    } else {
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const liveReportData = useMemo(
    () => ({
      ...merged,
      contestIds: orderedContestIds,
      tscConfig: isTscCombined
        ? {
          ...(merged?.tscConfig || {}),
          tfcPercentage,
          tscPercentage,
        }
        : merged?.tscConfig,
      users: rankedUsers,
      name,
    }),
    [merged, orderedContestIds, rankedUsers, name, isTscCombined, tfcPercentage, tscPercentage],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-4">
        <div className="bg-card rounded-lg p-4 border shadow-sm">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold mb-4">Report Settings</h2>
            {!solveOnly && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 ml-2" title="How ranking & effective score are calculated">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{isScoredSnapshot ? "Scoring Rules" : "Ranking & Effective Score Calculation"}</DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-4 text-sm leading-relaxed mt-2">
                        {isScoredSnapshot ? (
                          <>
                            <div>
                              <h4 className="font-semibold mb-1">Solved score formula</h4>
                              <code className="block rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                                {merged?.scoring?.solvedScoreFormula || merged?.scoring?.formula || "sum(solved)"}
                              </code>
                              <h4 className="mb-1 mt-3 font-semibold">Penalty formula</h4>
                              <code className="block rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                                {merged?.scoring?.penaltyScoreFormula || "sum(penalty)"}
                              </code>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Rank Order</h4>
                              <ol className="list-decimal list-inside space-y-1">
                                {(merged?.scoring?.sortRules || []).map((rule, ruleIndex) => (
                                  <li key={`${rule.key}-${ruleIndex}`}>
                                    {rule.key} {rule.direction === "asc" ? "ascending" : "descending"}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Result Units</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {(merged?.scoring?.resultUnits || []).map((unit) => (
                                  <Badge key={unit.key} variant={unit.isComposite ? "secondary" : "outline"}>
                                    {unit.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                        <div>
                          <h4 className="font-semibold mb-1">Per-Contest Metrics</h4>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Solved</strong>: Number of accepted problems.</li>
                            <li><strong>Penalty</strong>: Base contest penalty (e.g., time + wrong submission penalties) plus any demerit penalties (100 per demerit point if user absent; or integrated into recorded penalty).</li>
                            <li><strong>Score</strong>: Weighted score for that contest (base finalScore × contest weight). Negative impact from demerits is already applied to the stored finalScore.</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Aggregated Totals (Raw)</h4>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Total Solved</strong>: Sum of solved across all contests (after weighting if applied inside finalScore logic).</li>
                            <li><strong>Total Penalty</strong>: Sum of penalty across contests (includes added penalty for demerits / absences).</li>
                            <li><strong>Total Score</strong>: Sum of each contest&apos;s finalScore x weight.</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Standard Deviation Adjustment</h4>
                          <p>To reward consistency, a standard deviation (SD) penalty is applied:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Score SD</strong>: SD of per-contest scores.</li>
                            <li><strong>Penalty SD</strong>: SD of per-contest penalties.</li>
                          </ul>
                          <p className="mt-1">Higher variability (larger SD) reduces effective performance.</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Effective Metrics</h4>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Effective Solved / Effective Score</strong>: totalScore - scoreSD.</li>
                            <li><strong>Effective Penalty</strong>: totalPenalty + penaltySD.</li>
                            <li><strong>Total Demerits</strong>: Sum of demerit points across contests (shown; each demerit may also affect score/penalty already).</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Ranking Order</h4>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Higher <strong>Effective Solved / Score</strong></li>
                            <li>Lower <strong>Effective Penalty</strong> (tie-breaker)</li>
                            <li>Higher <strong>Contests Attended</strong> (final tie-breaker)</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Removing Worst Contests / Opt-out</h4>
                          <p>Default is 0. Increase it only when this report should ignore each participant&apos;s weakest contests.</p>
                        </div>
                          </>
                        )}

                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Participants</label>
              <div className="relative">
                <Input
                  placeholder="Search username or real name"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {!solveOnly && !isScoredSnapshot && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Remove Worst Contests</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={removeWorstCount.toString()}
                    onValueChange={(value) => setRemoveWorstCount(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: orderedContestIds.length }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isTscCombined && !solveOnly && !isScoredSnapshot && (
              <div className="space-y-2">
                <label className="text-sm font-medium">TFC Percentage</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={tfcPercentageInput}
                  onChange={(e) => setTfcPercentageInput(e.target.value)}
                  onBlur={() =>
                    setTfcPercentageInput(String(clampPercentage(tfcPercentageInput, 0)))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  TSC share is auto-calculated from this TFC percentage.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex flex-wrap gap-2">
                {shareControl || (showLiveShare ? <LiveShareModal reportData={liveReportData} reportId={liveReportId} publishEndpoint={publishEndpoint} /> : null)}
                <Button size="sm" variant="outline" onClick={exportToCSV} className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportToPDF} className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isScoredSnapshot && (
      <div className="mb-4 bg-card rounded-lg p-4 border shadow-sm">
        <h3 className="text-sm font-medium mb-3">Exclude Specific Contests</h3>
        <div className="flex flex-wrap gap-2">
          {orderedContestIds.map((cid) => (
            <Button
              key={cid}
              variant={optOutContests[cid] ? "destructive" : "outline"}
              size="sm"
              onClick={() => toggleOptOut(cid)}
              className="flex items-center gap-1 transition-all"
            >
              {optOutContests[cid] ? (
                <X className="h-3 w-3 mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              <ProviderBadge provider={merged.contestMetaById?.[cid]?.provider || cid.split(":")[0]} />
              <span className="text-xs">{merged.contestIdToTitle[cid]}</span>
            </Button>
          ))}
        </div>
      </div>
      )}

      <div>
        <div className="flex items-center gap-2 bg-card p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Showing</span>
            <Badge variant="secondary" className="px-2 py-1 text-sm font-semibold">
              {users.length}
            </Badge>
            <span className="font-medium">participants</span>
          </div>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              {!solveOnly && !isScoredSnapshot && <TableHead>Progress</TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Contests</TableHead>
              {solveOnly ? (
                <TableHead>Total Solves</TableHead>
              ) : isScoredSnapshot ? (
                <>
                  <TableHead>Solved Score</TableHead>
                  <TableHead>Penalty Score</TableHead>
                  <TableHead>Demerits</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Effective Score</TableHead>
                  <TableHead>Standard Deviation</TableHead>
                  <TableHead>Total Demerits</TableHead>
                </>
              )}
              {orderedContestIds.map((cid) => (
                <TableHead key={cid} className={optOutContests[cid] ? "bg-destructive/10" : ""}>
                  <div className="flex max-w-[140px] items-center gap-1.5 truncate">
                    <ProviderBadge provider={merged.contestMetaById?.[cid]?.provider || cid.split(":")[0]} />
                    <span className="truncate">{merged.contestIdToTitle[cid]}</span>
                    {optOutContests[cid] && (
                      <span className="ml-1 text-destructive">
                        <AlertCircle className="inline h-3 w-3" />
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u, index) => {
              const isTop = index === 0
              const identity = rowIdentity(u)
              const profileKey = vjudgeLookupIdForUser(u)
              const hasResolvedLookup = Boolean(profileKey) && Object.prototype.hasOwnProperty.call(publicProfilesByVjudge, profileKey)
              const profile = hasResolvedLookup ? publicProfilesByVjudge[profileKey] : null
              const hasDbProfile = !!profile
              const shouldUseFallback = hasResolvedLookup && !hasDbProfile
              const isResolving = Boolean(profileKey) && isProfilesLoading && !hasResolvedLookup
              const mappedStudent = u.classroomMapping?.student || null
              const mappedGroup = u.classroomMapping?.group || null
              const dbAvatar = hasDbProfile ? resolveAvatarUrl(profile.profile_pic) : null
              const fallbackAvatar = resolveAvatarUrl(u.avatarUrl)
              const classroomMappingLabel = u.classroomMapping?.targetName || mappedStudent?.name || mappedGroup?.name || null
              const customAvatar = getCustomAvatar(classroomMappingLabel || u.realName || u.username)
              const hasFailedAvatar = failedAvatars.has(identity)
              const resolvedAvatar = hasFailedAvatar 
                ? customAvatar
                : (hasDbProfile && dbAvatar) 
                  ? dbAvatar 
                  : (shouldUseFallback && fallbackAvatar)
                    ? fallbackAvatar
                    : isResolving
                      ? null
                      : customAvatar
              const resolvedName = classroomMappingLabel
                || (hasDbProfile ? profile.full_name || u.realName || u.username : null)
                || (isResolving ? "Loading..." : u.realName || u.username || "—")
              const resolvedBatch = mappedStudent?.batchName || mappedStudent?.batch_name || (hasDbProfile ? profile.batch_name || null : null)
              const resolvedVjudgeId = mappedStudent?.vjudgeId
                || mappedStudent?.vjudge_id
                || (hasDbProfile ? profile.vjudge_id || null : null)
                || (hasProvider(u, "vjudge") ? profileKey || u.username : null)
              const codeforcesContest = Object.values(u.contests || {}).find((contest) => normalizeProvider(contest?.provider) === "codeforces")
              const resolvedCfId = mappedStudent?.cfId
                || mappedStudent?.cf_id
                || (hasDbProfile ? profile.cf_id || null : null)
                || (Array.isArray(codeforcesContest?.sourceHandles) ? codeforcesContest.sourceHandles[0] : null)
                || (hasProvider(u, "codeforces") ? sourceHandlesForUser(u)[0] : null)
              const resolvedMistId = mappedStudent?.mistId || mappedStudent?.mist_id || (hasDbProfile ? profile.mist_id || null : u.mist_id || u.mistId || null)
              const isClassroomParticipant = Boolean(u.isClassroomParticipant || u.classroomMapping?.isClassroomParticipant)
              const mappedStudentId = String(u.studentId || u.classroomMapping?.studentId || u.classroomMapping?.student?.id || "")
              const mappedGroupId = String(u.groupId || u.classroomMapping?.groupId || u.classroomMapping?.group?.id || "")
              const rowHandles = [
                ...sourceHandlesForUser(u),
                u.username,
                u.realName,
                resolvedVjudgeId,
                resolvedCfId,
                u.classroomMapping?.student?.vjudgeId,
                u.classroomMapping?.student?.vjudge_id,
                u.classroomMapping?.student?.cfId,
                u.classroomMapping?.student?.cf_id,
              ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
              const isHighlightedParticipant = Boolean(
                (normalizedHighlightStudentId && mappedStudentId === normalizedHighlightStudentId) ||
                (normalizedHighlightVjudgeId && rowHandles.includes(normalizedHighlightVjudgeId)) ||
                (mappedGroupId && highlightedGroupIdSet.has(mappedGroupId)),
              )
              return (
                <TableRow
                  key={identity || u.username}
                  className={cn(
                    isHighlightedParticipant
                      ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
                      : isClassroomParticipant
                        ? "bg-emerald-500/5"
                        : index % 2 === 0
                          ? "bg-muted/20"
                          : "",
                    isTop && 'top-rank-wrapper',
                  )}
                >
                  <TableCell>
                    <div className={cn('inline-flex items-center justify-center', isTop && 'crown-badge')}>
                      <Badge
                        variant="default"
                        className={`min-w-[32px] transition-all duration-200 ${index < 12
                            ? index < 3
                              ? "bg-yellow-500 text-white"
                              : index < 6
                                ? "bg-gray-500 text-white"
                                : index < 9
                                  ? "bg-orange-500 text-white"
                                  : "bg-blue-500 text-white"
                            : ""
                          } ${isTop ? 'bg-transparent text-[hsl(var(--alumni-gold))] font-bold shadow-none' : ''}`}
                      >
                        {u.rank || index + 1}
                      </Badge>
                    </div>
                  </TableCell>
                  {/* Progress */}
                  {!solveOnly && !isScoredSnapshot && (
                    <TableCell className="min-w-[90px]">
                      {(() => {
                        const p = progressByUser[identity] || { status: 'neutral', delta: 0 }
                        const hasComparison = p.lastRank !== undefined && p.prevRank !== undefined
                        const improvement = p.delta > 0
                        const decline = p.delta < 0
                        const Icon = improvement ? TrendingUp : decline ? TrendingDown : Minus
                        return (
                          <div className="flex items-center gap-1.5">
                            <Icon className={`${improvement ? 'text-green-600' : decline ? 'text-red-600' : 'text-muted-foreground'} h-4 w-4`} />
                            {hasComparison ? (
                              improvement ? (
                                <sup className="text-[10px] font-semibold text-green-600">+{p.delta}</sup>
                              ) : decline ? (
                                <sub className="text-[10px] font-semibold text-red-600">{p.delta}</sub>
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground">0</span>
                              )
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "relative w-16 h-16 flex items-center justify-center flex-shrink-0",
                          isTop && "rounded-md"
                        )}
                      >
                        {!resolvedAvatar || (resolvedAvatar && resolvedAvatar.length === 1) ? (
                          // Custom avatar - show character
                          <div
                            className={cn(
                              "rounded-md w-12 h-12 flex items-center justify-center text-2xl font-bold transition-all duration-200",
                              "bg-black text-white border border-gray-700",
                              isTop && "ring-2 ring-[hsl(var(--alumni-gold))]/70 shadow-md"
                            )}
                          >
                            {resolvedAvatar || "?"}
                          </div>
                        ) : (
                          // Image avatar
                          <Image
                            src={resolvedAvatar}
                            alt={resolvedName || u.username}
                            width={48}
                            height={48}
                            unoptimized
                            className={cn(
                              "rounded-md object-cover w-12 h-12 transition-all duration-200",
                              isTop && "ring-2 ring-[hsl(var(--alumni-gold))]/70 shadow-md"
                            )}
                            quality={20}
                            onError={() => {
                              setFailedAvatars(prev => new Set(prev).add(identity))
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn("font-bold truncate", isTop && "top-rank-name")}
                          style={!isTop ? { color: getNameColor(index + 1) } : undefined}
                        >
                          {resolvedName}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                          {isResolving
                            ? "Loading profile..."
                            : resolvedBatch
                              ? `${resolvedBatch}[${resolvedMistId || resolvedVjudgeId}]`
                              : resolvedMistId || resolvedVjudgeId}
                        </p>
                        {!isResolving && (
                          <div className="mt-1 flex items-center gap-2">
                            {isClassroomParticipant && (
                              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700">
                                {classroomMappingLabel || "Classroom"}
                              </Badge>
                            )}
                            {isHighlightedParticipant && (
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                                You
                              </Badge>
                            )}
                            {(Array.isArray(u.providers) && u.providers.length > 0 ? u.providers : Object.values(u.contests || {}).map((contest) => contest?.provider))
                              .map(normalizeProvider)
                              .filter((provider, providerIndex, providers) => provider && providers.indexOf(provider) === providerIndex)
                              .map((provider) => (
                                <ProviderBadge key={`${identity}-${provider}`} provider={provider} />
                              ))}
                            {resolvedVjudgeId ? (
                              <Link
                                href={`https://vjudge.net/user/${encodeURIComponent(resolvedVjudgeId)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center"
                                title={`VJudge: ${resolvedVjudgeId}`}
                              >
                                <Image
                                  src="/vj.jpg"
                                  alt="VJudge"
                                  width={16}
                                  height={16}
                                  className="h-4 w-4 rounded-sm object-cover"
                                />
                              </Link>
                            ) : null}

                            {resolvedCfId ? (
                              <Link
                                href={`https://codeforces.com/profile/${encodeURIComponent(resolvedCfId)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center"
                                title={`Codeforces: ${resolvedCfId}`}
                              >
                                <Image
                                  src="/cf.png"
                                  alt="Codeforces"
                                  width={16}
                                  height={16}
                                  className="h-4 w-4 rounded-sm object-cover"
                                />
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="tabular-nums">{u.totalContestsAttended}</TableCell>
                  {solveOnly ? (
                    <TableCell className="text-base font-semibold tabular-nums">{u.effectiveTotalSolved}</TableCell>
                  ) : isScoredSnapshot ? (
                    <>
                      <TableCell>
                        <p className="text-base font-semibold tabular-nums">
                          {formatScore(u.displaySolvedScore ?? u.solvedScore ?? u.displayScore ?? u.score)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          raw {formatScore(u.totalScore, 2)}
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatScore(u.displayPenaltyScore ?? u.penaltyScore ?? u.effectiveTotalPenalty ?? u.effectivePenalty)}
                      </TableCell>
                      <TableCell>
                        {Number(u.totalDemeritPoints || 0) > 0 ? (
                          <Badge variant="destructive">-{u.totalDemeritPoints}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <p>
                          Solved: {u.effectiveTotalSolved.toFixed(2)}
                          {u.effectiveTotalSolved !== u.totalSolved && (
                            <span className="text-xs text-muted-foreground ml-1">({u.totalSolved})</span>
                          )}
                        </p>
                        <p>
                          Penalty: {u.effectiveTotalPenalty.toFixed(2)}
                          {u.effectiveTotalPenalty !== u.totalPenalty && (
                            <span className="text-xs text-muted-foreground ml-1">({u.totalPenalty.toFixed(2)})</span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>Score: {u.stdDeviationScore.toFixed(2)}</p>
                        <p>Penalty: {u.stdDeviationPen.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        {u.totalDemeritPoints > 0 ? (
                          <div className="relative">
                            <Badge
                              variant="destructive"
                              className="cursor-help"
                              title={Object.values(u.demerits || {})
                                .flat()
                                .map((d) => `Contest ${d.contest_id}: -${d.demerit_point} points - ${d.reason}`)
                                .join("\n")}
                            >
                              -{u.totalDemeritPoints}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  {orderedContestIds.map((cid) => {
                    const perf = u.contests[cid]
                    const worstContests = Array.isArray(u.worstContests) ? u.worstContests : []
                    const optedOutContests = Array.isArray(u.optedOutContests) ? u.optedOutContests : []
                    const isWorst = worstContests.includes(cid)
                    const isOptedOut = optedOutContests.includes(cid)
                    if (solveOnly) {
                      const isManual = Boolean(perf?.manualSolveOverride)
                      return (
                        <TableCell
                          key={cid}
                          className={cn(
                            "text-center tabular-nums",
                            isOptedOut && "bg-destructive/10 text-muted-foreground",
                          )}
                        >
                          <div className="flex min-w-[72px] flex-col items-center gap-1">
                            <span className="text-base font-semibold">{isOptedOut ? 0 : Number(perf?.solved || 0)}</span>
                            {isManual && !isOptedOut && (
                              <Badge variant="outline" className="h-5 border-primary/25 bg-primary/10 px-1.5 text-[10px] text-primary">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )
                    }
                    if (isScoredSnapshot) {
                      const sourceBreakdown = perf?.sourceBreakdown && typeof perf.sourceBreakdown === "object"
                        ? Object.entries(perf.sourceBreakdown)
                        : []
                      return (
                        <TableCell key={cid} className={cn((perf?.excluded || perf?.dropped) && "bg-muted/50 text-muted-foreground")}>
                          <div className="min-w-[120px] space-y-1 text-sm">
                            <div className="flex items-center gap-1.5">
                              {perf?.isComposite && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Composite</Badge>
                              )}
                              {perf?.dropped && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Dropped</Badge>
                              )}
                              {perf?.excluded && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Excluded</Badge>
                              )}
                            </div>
                            <div>Solved: {Number(perf?.solved || 0)}</div>
                            <div>Penalty Score: {formatScore(perf?.penalty, 2)}</div>
                            <div>Solved Score: {formatScore(perf?.finalScore ?? perf?.rawScore, 2)}</div>
                            {sourceBreakdown.length > 1 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                    Breakdown
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>{merged.contestIdToTitle[cid]} Breakdown</DialogTitle>
                                    <DialogDescription>Source contest metrics used in this result unit.</DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                                    {sourceBreakdown.map(([sourceId, source]) => (
                                      <div key={sourceId} className="rounded-md border p-3 text-sm">
                                        <p className="font-medium">{source?.contestTitle || sourceId}</p>
                                        <p className="text-muted-foreground">
                                          Solved {Number(source?.solved || 0)} - Penalty {formatScore(source?.penalty, 2)} - Source score {formatScore(source?.finalScore ?? source?.rawScore, 2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      )
                    }
                    if (!perf || isWorst || isOptedOut) {
                      let cellClassName = ""
                      let statusText = null
                      let extraTextClass = ""
                      if (!perf) {
                        extraTextClass = "text-primary"
                      } else if (isWorst) {
                        cellClassName = "bg-muted"
                        statusText = "Worst (removed)"
                      } else if (isOptedOut) {
                        cellClassName = "bg-destructive/10"
                        statusText = "Opted out"
                      }
                      return (
                        <TableCell
                          key={cid}
                          className={cellClassName + " text-muted-foreground text-sm " + extraTextClass}
                        >
                          {statusText && (
                            <div className="text-xs font-medium mb-1 text-muted-foreground">{statusText}</div>
                          )}
                          <div>Solved: 0</div>
                          <div>Penalty: 0.00</div>
                          <div>Score: 0.00</div>
                        </TableCell>
                      )
                    }
                    let cellClassName = ""
                    let statusText = null
                    if (isWorst) {
                      cellClassName = "bg-muted"
                      statusText = "Worst (removed)"
                    } else if (isOptedOut) {
                      cellClassName = "bg-destructive/10"
                      statusText = "Opted out"
                    }
                    return (
                      <TableCell key={cid} className={cellClassName}>
                        <div className="text-sm">
                          {statusText && (
                            <div className="text-xs font-medium mb-1 text-muted-foreground">{statusText}</div>
                          )}
                          <div>Solved: {perf.solved}</div>
                          <div>Penalty: {perf.penalty.toFixed(2)}</div>
                          <div>Score: {perf.finalScore.toFixed(2)}</div>
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>)
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

export default ReportTable
