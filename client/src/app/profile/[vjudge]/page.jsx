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
    <div className="min-h-screen w-full" style={{ background: 'hsl(var(--profile-bg))' }}>
      <div className="max-w-[1400px] mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Sidebar */}
          <aside className="space-y-6">
            {/* Profile Card */}
            <div className="profile-card profile-sidebar-sticky">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2" style={{ borderColor: u.vjudge_verified ? 'hsl(var(--profile-primary))' : 'hsl(var(--profile-border))' }}>
                    <Image
                      src={u.profile_pic || "/vercel.svg"}
                      alt={u.full_name || u.vjudge_id}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {u.vjudge_verified && (
                    <div className="absolute -bottom-2 -right-2 rounded-full p-2 shadow-lg" style={{ background: 'hsl(var(--profile-success))' }}>
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                  )}
                </div>

                {/* Name & Badges */}
                <div className="w-full">
                  <h1 className="text-2xl font-bold mb-3 break-words" style={{ color: 'hsl(var(--profile-text))' }}>
                    {u.full_name || u.vjudge_id}
                  </h1>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {u.vjudge_verified && (
                      <span className="profile-badge text-xs" style={{ background: 'hsl(var(--profile-primary))', color: 'white' }}>
                        VJudge Verified
                      </span>
                    )}
                    {u.cf_verified && (
                      <span className="profile-badge text-xs" style={{ background: 'hsl(var(--profile-danger))', color: 'white' }}>
                        CF Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="w-full space-y-2 text-sm" style={{ color: 'hsl(var(--profile-text-secondary))' }}>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--profile-primary))' }}></div>
                    <span>Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  {u.email && (
                    <div className="flex items-center gap-2 justify-center break-all">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'hsl(var(--profile-success))' }}></div>
                      <span className="text-xs">{u.email}</span>
                    </div>
                  )}
                  {u.phone && (
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--profile-warning))' }}></div>
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CP Profiles Card */}
            <div className="profile-card">
              <h3 className="text-sm font-semibold mb-4 px-1" style={{ color: 'hsl(var(--profile-text-secondary))' }}>
                Competitive Programming Profiles
              </h3>
              <div className="space-y-3">
                {u.vjudge_id && (
                  <Link
                    href={`https://vjudge.net/user/${encodeURIComponent(u.vjudge_id)}`}
                    target="_blank"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all profile-focus-ring hover:-translate-y-0.5"
                    style={{
                      background: 'hsl(var(--profile-primary) / 0.1)',
                      color: 'hsl(var(--profile-primary))'
                    }}
                  >
                    <span className="text-sm flex-1">VJudge</span>
                    <span className="text-xs">→</span>
                  </Link>
                )}
                {u.cf_id && (
                  <Link
                    href={`https://codeforces.com/profile/${encodeURIComponent(u.cf_id)}`}
                    target="_blank"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all profile-focus-ring hover:-translate-y-0.5"
                    style={{
                      background: 'hsl(var(--profile-danger) / 0.1)',
                      color: 'hsl(var(--profile-danger))'
                    }}
                  >
                    <span className="text-sm flex-1">Codeforces</span>
                    <span className="text-xs">→</span>
                  </Link>
                )}
                {u.codechef_id && (
                  <Link
                    href={`https://www.codechef.com/users/${encodeURIComponent(u.codechef_id)}`}
                    target="_blank"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all profile-focus-ring hover:-translate-y-0.5"
                    style={{
                      background: 'hsl(var(--profile-warning) / 0.1)',
                      color: 'hsl(var(--profile-warning))'
                    }}
                  >
                    <span className="text-sm flex-1">CodeChef</span>
                    <span className="text-xs">→</span>
                  </Link>
                )}
                {u.atcoder_id && (
                  <Link
                    href={`https://atcoder.jp/users/${encodeURIComponent(u.atcoder_id)}`}
                    target="_blank"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all profile-focus-ring hover:-translate-y-0.5"
                    style={{
                      background: 'hsl(var(--profile-text-muted) / 0.1)',
                      color: 'hsl(var(--profile-text))'
                    }}
                  >
                    <span className="text-sm flex-1">AtCoder</span>
                    <span className="text-xs">→</span>
                  </Link>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">

            {teams.length > 0 && (
              <div className="profile-card mb-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'hsl(var(--profile-text))' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--profile-primary) / 0.1)' }}>
                      <span className="text-xl">👥</span>
                    </div>
                    Teams
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {teams.map((t) => (
                    <Link
                      key={t.id}
                      href={`/team/final/${t.id}`}
                      className="group block p-5 border rounded-xl transition-all profile-focus-ring hover:-translate-y-0.5"
                      style={{
                        background: 'hsl(var(--profile-surface-1))',
                        borderColor: 'hsl(var(--profile-border))'
                      }}
                    >
                      <div className="font-bold text-lg mb-2 text-balance group-hover:underline" style={{ color: 'hsl(var(--profile-text))' }}>
                        {t.team_title}
                      </div>
                      <div className="text-sm" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                        <span className="font-medium">Members:</span>{" "}
                        {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(", ") : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {coachedTeams.length > 0 && (
              <div className="profile-card mb-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'hsl(var(--profile-text))' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--profile-warning) / 0.1)' }}>
                      <span className="text-xl">🎯</span>
                    </div>
                    Teams Coached
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {coachedTeams.map((t) => (
                    <Link
                      key={`coached-${t.id}`}
                      href={`/team/final/${t.id}`}
                      className="group block p-5 border rounded-xl transition-all profile-focus-ring hover:-translate-y-0.5"
                      style={{
                        background: 'hsl(var(--profile-surface-1))',
                        borderColor: 'hsl(var(--profile-border))'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="profile-badge text-xs" style={{ background: 'hsl(var(--profile-warning) / 0.2)', color: 'hsl(var(--profile-warning))' }}>
                          Coach
                        </span>
                      </div>
                      <div className="font-bold text-lg mb-2 text-balance group-hover:underline" style={{ color: 'hsl(var(--profile-text))' }}>
                        {t.team_title}
                      </div>
                      <div className="text-sm" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                        <span className="font-medium">Members:</span>{" "}
                        {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(", ") : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="profile-card mb-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'hsl(var(--profile-text))' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--profile-primary) / 0.1)' }}>
                    <span className="text-xl">📊</span>
                  </div>
                  Contest Performance
                </h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="profile-stat-tile text-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--profile-primary))' }}>
                      {perf.summary.totalContests}
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                      Contests
                    </div>
                  </div>
                  <div className="profile-stat-tile text-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--profile-success))' }}>
                      {perf.summary.totalSolved}
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                      Problems Solved
                    </div>
                  </div>
                  {perf.summary.bestRank && (
                    <div className="profile-stat-tile text-center">
                      <div className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--profile-warning))' }}>
                        {perf.summary.bestRank}
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                        Best Rank
                      </div>
                    </div>
                  )}
                  {perf.summary.avgRank > 0 && (
                    <div className="profile-stat-tile text-center">
                      <div className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--profile-text))' }}>
                        {perf.summary.avgRank}
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                        Avg Rank
                      </div>
                    </div>
                  )}
                </div>

                <Tabs defaultValue="graph" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 rounded-xl" style={{ background: 'hsl(var(--profile-surface-2))' }}>
                    <TabsTrigger
                      value="table"
                      className="rounded-lg data-[state=active]:shadow-sm transition-all profile-focus-ring"
                      style={{ color: 'hsl(var(--profile-text-secondary))' }}
                    >
                      Table View
                    </TabsTrigger>
                    <TabsTrigger
                      value="graph"
                      className="rounded-lg data-[state=active]:shadow-sm transition-all profile-focus-ring"
                      style={{ color: 'hsl(var(--profile-text-secondary))' }}
                    >
                      Chart View
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-6">
                    <div className="rounded-xl border overflow-hidden" style={{
                      background: 'hsl(var(--profile-surface-1))',
                      borderColor: 'hsl(var(--profile-border))'
                    }}>
                      <ScrollArea className="w-full h-[60vh]">
                        <Table>
                          <TableHeader>
                            <TableRow style={{ borderColor: 'hsl(var(--profile-border))' }}>
                              <TableHead className="font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Room</TableHead>
                              <TableHead className="font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Contest</TableHead>
                              <TableHead className="text-right font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Rank</TableHead>
                              <TableHead className="text-right font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Participants</TableHead>
                              <TableHead className="text-right font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Solved</TableHead>
                              <TableHead className="text-right font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Penalty</TableHead>
                              <TableHead className="text-right font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {perf.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-12" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                                  No contest data available
                                </TableCell>
                              </TableRow>
                            ) : (
                              perf.rows.map((r, idx) => (
                                <TableRow
                                  key={`${r.roomName}-${r.contestId}-${idx}`}
                                  className="transition-colors"
                                  style={{ borderColor: 'hsl(var(--profile-border))' }}
                                >
                                  <TableCell className="font-medium" style={{ color: 'hsl(var(--profile-text))' }}>{r.roomName}</TableCell>
                                  <TableCell style={{ color: 'hsl(var(--profile-text-secondary))' }}>{r.contestTitle}</TableCell>
                                  <TableCell className="text-right font-mono" style={{ color: 'hsl(var(--profile-text-secondary))' }}>{r.rank ?? "—"}</TableCell>
                                  <TableCell className="text-right font-mono" style={{ color: 'hsl(var(--profile-text-secondary))' }}>{r.participants}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold" style={{ color: 'hsl(var(--profile-success))' }}>
                                    {r.solved}
                                  </TableCell>
                                  <TableCell className="text-right font-mono" style={{ color: 'hsl(var(--profile-text-muted))' }}>
                                    {typeof r.penalty === "number" ? r.penalty.toFixed(2) : r.penalty}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold" style={{ color: 'hsl(var(--profile-primary))' }}>
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
                    <div className="rounded-xl border p-6" style={{
                      background: 'hsl(var(--profile-surface-1))',
                      borderColor: 'hsl(var(--profile-border))'
                    }}>
                      <PastPerformanceChart rows={perf.rows} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {u.cf_id && (
              <div className="profile-card">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'hsl(var(--profile-text))' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--profile-danger) / 0.1)' }}>
                      <span className="text-xl">🔥</span>
                    </div>
                    Codeforces Activity
                  </h2>
                </div>
                <div className="rounded-xl border p-6" style={{
                  background: 'hsl(var(--profile-surface-1))',
                  borderColor: 'hsl(var(--profile-border))'
                }}>
                  <CodeforcesSubmissionDashboard
                    users={[{ id: u.id, full_name: u.full_name || u.vjudge_id, cf_id: u.cf_id }]}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
