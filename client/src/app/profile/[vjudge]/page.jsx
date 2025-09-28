import Image from "next/image"
import Link from "next/link"
import CodeforcesSubmissionDashboard from "@/components/codeforces-submission-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PastPerformanceChart from "@/components/past-performance-chart"

async function fetchAllSharedReports() {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/public-contest-report/all`, { cache: "no-store" })
    return await res.json()
  } catch (e) {
    console.error(e)
    return { result: [] }
  }
}

function deriveUserPerformanceAcrossReports(vjudge, reports) {
  const rows = []
  for (const r of reports || []) {
    let merged
    try {
      merged = JSON.parse(r.JSON_string)
    } catch (e) {
      continue
    }
    if (!merged || !Array.isArray(merged.users) || !Array.isArray(merged.contestIds)) continue
    const users = merged.users
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
    for (const cid of merged.contestIds) {
      const me = users.find((u) => String(u.username) === String(vjudge) && u.contests && u.contests[cid])
      if (!me) continue
      const perf = me.contests[cid]
      const participants = users.filter((u) => u.contests && u.contests[cid])
      const ranked = [...participants].sort((u1, u2) => comparePerf(u1.contests[cid], u2.contests[cid]))
      const rankIdx = ranked.findIndex((u) => String(u.username) === String(vjudge))
      const rank = rankIdx >= 0 ? rankIdx + 1 : undefined
      rows.push({
        roomName: merged.name || r.Shared_contest_id,
        contestId: cid,
        contestTitle: merged.contestIdToTitle?.[cid] || cid,
        solved: perf?.solved ?? 0,
        penalty: typeof perf?.penalty === "number" ? perf.penalty : 0,
        score: typeof perf?.finalScore === "number" ? perf.finalScore : 0,
        rank,
        participants: ranked.length,
      })
    }
  }
  const seen = new Set()
  const unique = []
  for (const row of rows) {
    const key = `${row.roomName}__${row.contestId}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(row)
  }
  // Summary
  const totalContests = unique.length
  const totalSolved = unique.reduce((s, r) => s + (r.solved || 0), 0)
  const bestRank = unique.reduce((best, r) => (r.rank && (!best || r.rank < best) ? r.rank : best), undefined)
  const avgRank =
    unique.length > 0 ? unique.reduce((s, r) => s + (r.rank || 0), 0) / unique.filter((r) => r.rank).length || 0 : 0
  return {
    rows: unique,
    summary: {
      totalContests,
      totalSolved,
      bestRank,
      avgRank: Number.isFinite(avgRank) ? Number(avgRank.toFixed(2)) : 0,
    },
  }
}

export const dynamic = "force-dynamic"

async function fetchPublicProfile(vjudge) {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`, { cache: "no-store" })
    return await res.json()
  } catch (e) {
    console.error(e)
    return { error: "Failed" }
  }
}

export default async function PublicProfilePage({ params }) {
  const { vjudge } = params
  const [data, allReports] = await Promise.all([fetchPublicProfile(vjudge), fetchAllSharedReports()])

  if (data?.error || !data?.result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto py-16 px-6">
          <Card className="apple-card max-w-md mx-auto text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl text-muted-foreground">?</span>
              </div>
              <h1 className="text-2xl font-bold mb-3 text-balance">Profile Not Found</h1>
              <p className="text-muted-foreground text-pretty">No user linked to VJudge ID: {vjudge}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const u = data.result

  // Fetch approved teams for this vjudge
  async function loadTeams() {
    try {
      const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
      const res = await fetch(`${base}/team-collection/public/teams/by-vjudge`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vjudge_id: vjudge }),
      })
      return await res.json()
    } catch (e) {
      console.error(e)
      return { result: [] }
    }
  }
  async function loadCoachedTeams() {
    try {
      const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
      const res = await fetch(`${base}/team-collection/public/teams/coached-by-vjudge`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vjudge_id: vjudge }),
      })
      return await res.json()
    } catch (e) {
      console.error(e)
      return { result: [] }
    }
  }
  const teamsRes = await loadTeams()
  const teams = teamsRes?.result || []
  const coachedRes = await loadCoachedTeams()
  const coachedTeams = coachedRes?.result || []
  const perf = deriveUserPerformanceAcrossReports(vjudge, allReports?.result || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto py-12 px-6 space-y-8 max-w-6xl">
        <Card className="apple-card overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl shadow-black/20 ring-4 ring-white/50">
                    <Image
                      src={u.profile_pic || "/vercel.svg"}
                      alt={u.full_name || u.vjudge_id}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>

                <div className="flex-1 text-center lg:text-left space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {u.full_name || u.vjudge_id}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      {u.vjudge_verified && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 rounded-full px-4 py-1 shadow-lg">
                          VJudge Verified
                        </Badge>
                      )}
                      {u.cf_verified && (
                        <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 rounded-full px-4 py-1 shadow-lg">
                          CF Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground justify-center lg:justify-start">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                    {u.email && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        <span>{u.email}</span>
                      </div>
                    )}
                    {u.phone && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    {u.vjudge_id && (
                      <Link
                        href={`https://vjudge.net/user/${encodeURIComponent(u.vjudge_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-600 rounded-xl hover:bg-purple-500/20 transition-all duration-300 font-medium"
                      >
                        VJudge Profile →
                      </Link>
                    )}
                    {u.cf_id && (
                      <Link
                        href={`https://codeforces.com/profile/${encodeURIComponent(u.cf_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500/20 transition-all duration-300 font-medium"
                      >
                        Codeforces Profile →
                      </Link>
                    )}
                    {u.codechef_id && (
                      <Link
                        href={`https://www.codechef.com/users/${encodeURIComponent(u.codechef_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl hover:bg-amber-500/20 transition-all duration-300 font-medium"
                      >
                        CodeChef Profile →
                      </Link>
                    )}
                    {u.atcoder_id && (
                      <Link
                        href={`https://atcoder.jp/users/${encodeURIComponent(u.atcoder_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/10 text-gray-600 rounded-xl hover:bg-gray-500/20 transition-all duration-300 font-medium"
                      >
                        AtCoder Profile →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {teams.length > 0 && (
          <Card className="apple-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-primary font-bold">👥</span>
                </div>
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {teams.map((t) => (
                  <Link
                    key={t.id}
                    href={`/team/final/${t.id}`}
                    className="group block p-6 bg-gradient-to-br from-card to-muted/30 border border-border/50 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="font-bold text-lg text-primary group-hover:text-primary/80 transition-colors mb-2 text-balance">
                      {t.team_title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Members:</span>{" "}
                      {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(", ") : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {coachedTeams.length > 0 && (
          <Card className="apple-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center">
                  <span className="text-accent font-bold">🎯</span>
                </div>
                Teams Coached
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {coachedTeams.map((t) => (
                  <Link
                    key={`coached-${t.id}`}
                    href={`/team/final/${t.id}`}
                    className="group block p-6 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-accent/20 text-accent border-0 text-xs px-2 py-1 rounded-lg">Coach</Badge>
                    </div>
                    <div className="font-bold text-lg text-accent group-hover:text-accent/80 transition-colors mb-2 text-balance">
                      {t.team_title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Members:</span>{" "}
                      {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(", ") : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="apple-card">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-8 h-8 bg-chart-1/10 rounded-xl flex items-center justify-center">
                <span className="text-chart-1 font-bold">📊</span>
              </div>
              Contest Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl">
                <div className="text-2xl font-bold text-primary">{perf.summary.totalContests}</div>
                <div className="text-sm text-muted-foreground font-medium">Contests</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-chart-2/5 to-chart-2/10 rounded-2xl">
                <div className="text-2xl font-bold text-chart-2">{perf.summary.totalSolved}</div>
                <div className="text-sm text-muted-foreground font-medium">Problems Solved</div>
              </div>
              {perf.summary.bestRank && (
                <div className="text-center p-4 bg-gradient-to-br from-chart-4/5 to-chart-4/10 rounded-2xl">
                  <div className="text-2xl font-bold text-chart-4">{perf.summary.bestRank}</div>
                  <div className="text-sm text-muted-foreground font-medium">Best Rank</div>
                </div>
              )}
              {perf.summary.avgRank > 0 && (
                <div className="text-center p-4 bg-gradient-to-br from-chart-5/5 to-chart-5/10 rounded-2xl">
                  <div className="text-2xl font-bold text-chart-5">{perf.summary.avgRank}</div>
                  <div className="text-sm text-muted-foreground font-medium">Avg Rank</div>
                </div>
              )}
            </div>

            <Tabs defaultValue="graph" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl">
                <TabsTrigger
                  value="table"
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Table View
                </TabsTrigger>
                <TabsTrigger
                  value="graph"
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Chart View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-6">
                <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/50">
                  <ScrollArea className="w-full h-[60vh]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="font-semibold">Room</TableHead>
                          <TableHead className="font-semibold">Contest</TableHead>
                          <TableHead className="text-right font-semibold">Rank</TableHead>
                          <TableHead className="text-right font-semibold">Participants</TableHead>
                          <TableHead className="text-right font-semibold">Solved</TableHead>
                          <TableHead className="text-right font-semibold">Penalty</TableHead>
                          <TableHead className="text-right font-semibold">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perf.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                              No contest data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          perf.rows.map((r, idx) => (
                            <TableRow
                              key={`${r.roomName}-${r.contestId}-${idx}`}
                              className="border-border/30 hover:bg-muted/30"
                            >
                              <TableCell className="font-medium">{r.roomName}</TableCell>
                              <TableCell>{r.contestTitle}</TableCell>
                              <TableCell className="text-right font-mono">{r.rank ?? "—"}</TableCell>
                              <TableCell className="text-right font-mono">{r.participants}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-chart-2">
                                {r.solved}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {typeof r.penalty === "number" ? r.penalty.toFixed(2) : r.penalty}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-primary">
                                {typeof r.score === "number" ? r.score.toFixed(2) : r.score}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="graph" className="mt-6">
                <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 p-6">
                  <PastPerformanceChart rows={perf.rows} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {u.cf_id && (
          <Card className="apple-card">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <span className="text-red-500 font-bold">🔥</span>
                </div>
                Codeforces Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 p-6">
                <CodeforcesSubmissionDashboard
                  users={[{ id: u.id, full_name: u.full_name || u.vjudge_id, cf_id: u.cf_id }]}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
