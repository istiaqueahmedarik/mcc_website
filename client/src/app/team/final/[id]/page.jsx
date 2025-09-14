import Link from "next/link"
import Image from "next/image"
import { publicTeamById, renameMyTeam } from "@/actions/team_collection"
import RenameTeamClient from "@/components/team/RenameTeamClient"
import CodeforcesSubmissionDashboard from "@/components/codeforces-submission-dashboard"
import PastPerformanceChart from "@/components/past-performance-chart"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

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

async function fetchMe() {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/auth/me`, { cache: "no-store", credentials: "include" })
    if (!res.ok) return null
    const data = await res.json()
    return data?.result || null
  } catch (e) {
    console.error(e)
    return null
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
  return unique
}

function deriveTeamBestRankAcrossReports(memberVjs, reports, roomId) {
  const rows = []
  for (const r of reports || []) {
    if (roomId && String(r.Shared_contest_id) !== String(roomId)) continue
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
      const participants = users.filter((u) => u.contests && u.contests[cid])
      if (participants.length === 0) continue
      const ranked = [...participants].sort((u1, u2) => comparePerf(u1.contests[cid], u2.contests[cid]))
      // compute best rank among team members for this contest
      let bestRank
      for (const mj of memberVjs) {
        const idx = ranked.findIndex((u) => String(u.username) === String(mj))
        if (idx >= 0) {
          const rnk = idx + 1
          if (bestRank === undefined || rnk < bestRank) bestRank = rnk
        }
      }
      if (bestRank !== undefined) {
        rows.push({
          roomName: merged.name || r.Shared_contest_id,
          contestId: cid,
          contestTitle: merged.contestIdToTitle?.[cid] || cid,
          bestRank,
          participants: ranked.length,
        })
      }
    }
  }
  // de-dup by (room, contest)
  const seen = new Set()
  const unique = []
  for (const row of rows) {
    const key = `${row.roomName}__${row.contestId}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(row)
  }
  return unique
}

export default async function TeamFinalPage({ params }) {
  const { id } = params
  const teamRes = await publicTeamById(id)
  if (teamRes?.error || !teamRes?.result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent)/0.35)] flex items-center justify-center p-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-border/20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[hsl(var(--destructive)/0.15)] to-[hsl(var(--destructive)/0.35)] rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-[hsl(var(--destructive))] text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Team Not Found</h2>
            <p className="text-muted-foreground">The team you’re looking for doesn’t exist or has been removed.</p>
          </div>
        </div>
      </div>
    )
  }

  const team = teamRes.result
  const members = Array.isArray(team.member_vjudge_ids) ? team.member_vjudge_ids : []
  const coach = team.coach_vjudge_id || null
  const me = await fetchMe()
  const myVjudge = me?.vjudge_id || me?.cf_id || null
  const canRename = !!myVjudge && (members.map(String).includes(String(myVjudge)) || (coach && String(coach) === String(myVjudge)))
  const allReports = await fetchAllSharedReports()
  const teamRows = deriveTeamBestRankAcrossReports(members, allReports?.result || [], team.room_id)


  async function doRename(formDataOrPrev, maybeFormData) {
    "use server"
    // Extra server-side guard: only allow rename if caller is member or coach
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    let currentUser = null
    try {
      const meRes = await fetch(`${base}/auth/me`, { cache: "no-store", credentials: "include" })
      if (meRes.ok) {
        const meJson = await meRes.json()
        currentUser = meJson?.result || null
      }
    } catch (e) {
      console.error("Failed to re-fetch current user in rename action", e)
    }
    const currentVj = currentUser?.vjudge_id || currentUser?.cf_id || null
    const memberList = Array.isArray(team.member_vjudge_ids) ? team.member_vjudge_ids.map(String) : []
    const isCoach = coach && String(coach) === String(currentVj)
    const isMember = currentVj && memberList.includes(String(currentVj))
    if (!isCoach && !isMember) {
      // Silently ignore unauthorized attempt
      return
    }
    const formData = maybeFormData instanceof FormData ? maybeFormData : formDataOrPrev
    const new_title = formData?.get("new_title")
    if (typeof new_title === "string" && new_title.trim()) {
      await renameMyTeam(id, new_title.trim())
    }
    revalidatePath(`/team/${id}`)  
  }

  const profiles = await Promise.all(members.map(async (vj) => ({ vj, data: await fetchPublicProfile(vj) })))
  const coachProfile = coach ? await fetchPublicProfile(coach) : null
  const cfUsers = profiles
    .map((p) => ({
      id: p.data?.result?.id,
      full_name: p.data?.result?.full_name || p.vj,
      cf_id: p.data?.result?.cf_id,
    }))
    .filter((u) => u.cf_id)

  return (
    <div className="min-h-screen bg-background">
      
      <div className="inline-flex items-center gap-3 bg-card/60 backdrop-blur-xl rounded-full px-6 py-3 mb-6 shadow-lg border border-border/20">
        <div className="w-3 h-3 bg-[hsl(var(--brand))] rounded-full animate-pulse" />
        <span className="text-sm font-medium text-muted-foreground">Team Dashboard</span>
      </div>

      <div className="container mx-auto px-6 pb-16 space-y-8">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/20 hover:shadow-3xl transition-all duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[hsl(var(--brand))] rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">{team.team_title.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{team.team_title}</h2>
                  <p className="text-muted-foreground">Competition: {team.collection_title}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                
                {members.map((m) => (
                  <Link
                    key={m}
                    href={`/profile/${encodeURIComponent(m)}`}
                    className="inline-flex items-center gap-2 bg-[hsl(var(--brand))] text-white rounded-full px-4 py-2 text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                  >
                    <span className="w-2 h-2 bg-white/30 rounded-full" />
                    {m}
                  </Link>
                ))}
                {coach && (
                  <Link
                    href={`/profile/${encodeURIComponent(coach)}`}
                    className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-medium border border-border/40 hover:shadow-lg hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                  >
                    {coach}
                  </Link>
                )}
              </div>
            </div>

            {canRename ? (
              <RenameTeamClient serverAction={doRename} />
            ) : (
              <div className="text-sm text-muted-foreground italic">Only team members or the coach can rename this team.</div>
            )}
          </div>
        </div>


        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/20 hover:shadow-3xl transition-all duration-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[hsl(var(--accent))] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">👥</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">Team Members</h3>
              <p className="text-muted-foreground">Profiles and competitive programming accounts</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {profiles.map((p) => {
              const u = p.data?.result
                return (
                <div
                  key={p.vj}
                  className="group bg-card rounded-2xl p-6 border border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                  <div className="relative">
                    <Image
                    src={u?.profile_pic || "/placeholder.svg?height=64&width=64&query=user avatar"}
                    alt={(u?.full_name || p.vj || "").slice(0, 5)}
                    width={64}
                    height={64}
                    className="rounded-2xl border-2 border-white shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-foreground truncate">{u?.full_name || p.vj}</h4>
                    <p className="text-sm text-muted-foreground mb-3">VJudge: {p.vj}</p>

                    <div className="space-y-2">
                    {u?.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-2 h-2 bg-blue-400 rounded-full" />
                      {u.email}
                      </div>
                    )}
                    {u?.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      {u.phone}
                      </div>
                    )}
                    {u?.mist_id_card && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <Link
                          href={u.mist_id_card}
                          target="_blank"
                          className="underline hover:text-foreground"
                        >
                          ID Card
                        </Link>
                      </div>
                    )}
                    {u?.tshirt_size && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-2 h-2 bg-pink-400 rounded-full" />
                        T-Shirt: {u.tshirt_size}
                      </div>
                    )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                    {u?.cf_id && (
                      <Link
                      href={`https://codeforces.com/profile/${encodeURIComponent(u.cf_id)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-[hsl(var(--destructive))] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                      CF: {u.cf_id}
                      </Link>
                    )}
                    {u?.codechef_id && (
                      <Link
                      href={`https://www.codechef.com/users/${encodeURIComponent(u.codechef_id)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-[hsl(var(--highlight))] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                      CC: {u.codechef_id}
                      </Link>
                    )}
                    {u?.atcoder_id && (
                      <Link
                      href={`https://atcoder.jp/users/${encodeURIComponent(u.atcoder_id)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-[hsl(var(--foreground)/0.65)] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                      AC: {u.atcoder_id}
                      </Link>
                    )}
                    </div>
                  </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40">
                  <Link
                    href={`/profile/${encodeURIComponent(p.vj)}`}
                    className="inline-flex items-center gap-2 text-accent-foreground hover:text-accent-foreground/80 font-medium text-sm group-hover:gap-3 transition-all duration-300"
                  >
                    View Full Profile
                    <span className="text-lg">→</span>
                  </Link>
                  </div>
                </div>
                )
            })}
            {coach && coachProfile && (
              (() => {
                const u = coachProfile?.result
                console.log(u);
                return (
                  <div
                    key={`coach-${coach}`}
                    className="group bg-accent/20 rounded-2xl p-6 border border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Image
                          src={u?.profile_pic || "/placeholder.svg?height=64&width=64&query=coach avatar"}
                          alt={(u?.full_name || coach || "").slice(0, 5)}
                          width={64}
                          height={64}
                          className="rounded-2xl border-2 border-accent shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-400 to-fuchsia-500 rounded-full border-2 border-white shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg text-foreground truncate">{u?.full_name || coach}</h4>
                          <span className="inline-flex text-[10px] uppercase tracking-wide font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full border border-border/40">Coach</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">VJudge: {coach}</p>
                        <div className="space-y-2">
                          {u?.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="w-2 h-2 bg-blue-400 rounded-full" />
                              {u.email}
                            </div>
                          )}
                          {u?.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="w-2 h-2 bg-green-400 rounded-full" />
                              {u.phone}
                            </div>
                          )}
                          {u?.mist_id_card && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                              <Link
                                href={u.mist_id_card}
                                target="_blank"
                                className="underline hover:text-foreground"
                              >
                                ID Card
                              </Link>
                            </div>
                          )}
                          {u?.tshirt_size && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="w-2 h-2 bg-pink-400 rounded-full" />
                              T-Shirt: {u.tshirt_size}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {u?.cf_id && (
                            <Link
                              href={`https://codeforces.com/profile/${encodeURIComponent(u.cf_id)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 bg-[hsl(var(--destructive))] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                            >
                              CF: {u.cf_id}
                            </Link>
                          )}
                          {u?.codechef_id && (
                            <Link
                              href={`https://www.codechef.com/users/${encodeURIComponent(u.codechef_id)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 bg-[hsl(var(--highlight))] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                            >
                              CC: {u.codechef_id}
                            </Link>
                          )}
                          {u?.atcoder_id && (
                            <Link
                              href={`https://atcoder.jp/users/${encodeURIComponent(u.atcoder_id)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 bg-[hsl(var(--foreground)/0.65)] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                            >
                              AC: {u.atcoder_id}
                            </Link>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/40">
                          <Link
                            href={`/profile/${encodeURIComponent(coach)}`}
                            className="inline-flex items-center gap-2 text-accent-foreground hover:text-accent font-medium text-sm group-hover:gap-3 transition-all duration-300"
                          >
                            View Coach Profile
                            <span className="text-lg">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/20 hover:shadow-3xl transition-all duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[hsl(var(--greenAC))] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">Team Performance</h3>
              <p className="text-muted-foreground">Best rank across all contests</p>
            </div>
          </div>

          {teamRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-[hsl(var(--accent)/0.4)] to-[hsl(var(--accent)/0.2)] rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-muted-foreground text-2xl">📈</span>
              </div>
              <p className="text-muted-foreground text-lg">No contest data available yet</p>
              <p className="text-muted-foreground/70 text-sm mt-2">
                Performance metrics will appear here once team members participate in contests
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 border border-border/40 bg-accent/30">
                <p className="text-sm text-foreground font-medium">
                  📍 Showing best (lowest) rank among team members per contest
                </p>
              </div>
              <div className="bg-accent/20 rounded-2xl p-6">
                <PastPerformanceChart
                  rows={teamRows.map((r, idx) => ({
                    roomName: r.roomName,
                    contestId: r.contestId,
                    contestTitle: r.contestTitle,
                    rank: r.bestRank,
                    participants: r.participants,
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {cfUsers.length > 0 && (
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/20 hover:shadow-3xl transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[hsl(var(--destructive))] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">CF</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Codeforces Activity</h3>
                <p className="text-muted-foreground">Recent submissions and progress</p>
              </div>
            </div>
            <div className="bg-[hsl(var(--destructive)/0.15)] rounded-2xl p-6">
              <CodeforcesSubmissionDashboard users={cfUsers} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
