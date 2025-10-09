import Link from "next/link";
import Image from "next/image";
import { publicTeamById, renameMyTeam } from "@/actions/team_collection";
import RenameTeamClient from "@/components/team/RenameTeamClient";
import CodeforcesSubmissionDashboard from "@/components/codeforces-submission-dashboard";
import PastPerformanceChart from "@/components/past-performance-chart";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function fetchAllSharedReports() {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const res = await fetch(`${base}/public-contest-report/all`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (e) {
    console.error(e);
    return { result: [] };
  }
}

async function fetchPublicProfile(vjudge) {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const res = await fetch(
      `${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`,
      { cache: "no-store" }
    );
    return await res.json();
  } catch (e) {
    console.error(e);
    return { error: "Failed" };
  }
}

async function fetchMe() {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const res = await fetch(`${base}/auth/me`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result || null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function deriveUserPerformanceAcrossReports(vjudge, reports) {
  const rows = [];
  for (const r of reports || []) {
    let merged;
    try {
      merged = JSON.parse(r.JSON_string);
    } catch (e) {
      continue;
    }
    if (
      !merged ||
      !Array.isArray(merged.users) ||
      !Array.isArray(merged.contestIds)
    )
      continue;
    const users = merged.users;
    const comparePerf = (aPerf, bPerf) => {
      const aScore = aPerf?.finalScore ?? 0;
      const bScore = bPerf?.finalScore ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      const aSolved = aPerf?.solved ?? 0;
      const bSolved = bPerf?.solved ?? 0;
      if (aSolved !== bSolved) return bSolved - aSolved;
      const aPen = aPerf?.penalty ?? Number.POSITIVE_INFINITY;
      const bPen = bPerf?.penalty ?? Number.POSITIVE_INFINITY;
      return aPen - bPen;
    };
    for (const cid of merged.contestIds) {
      const me = users.find(
        (u) =>
          String(u.username) === String(vjudge) && u.contests && u.contests[cid]
      );
      if (!me) continue;
      const perf = me.contests[cid];
      const participants = users.filter((u) => u.contests && u.contests[cid]);
      const ranked = [...participants].sort((u1, u2) =>
        comparePerf(u1.contests[cid], u2.contests[cid])
      );
      const rankIdx = ranked.findIndex(
        (u) => String(u.username) === String(vjudge)
      );
      const rank = rankIdx >= 0 ? rankIdx + 1 : undefined;
      rows.push({
        roomName: merged.name || r.Shared_contest_id,
        contestId: cid,
        contestTitle: merged.contestIdToTitle?.[cid] || cid,
        solved: perf?.solved ?? 0,
        penalty: typeof perf?.penalty === "number" ? perf.penalty : 0,
        score: typeof perf?.finalScore === "number" ? perf.finalScore : 0,
        rank,
        participants: ranked.length,
      });
    }
  }
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.roomName}__${row.contestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function deriveTeamBestRankAcrossReports(memberVjs, reports, roomId) {
  const rows = [];
  for (const r of reports || []) {
    if (roomId && String(r.Shared_contest_id) !== String(roomId)) continue;
    let merged;
    try {
      merged = JSON.parse(r.JSON_string);
    } catch (e) {
      continue;
    }
    if (
      !merged ||
      !Array.isArray(merged.users) ||
      !Array.isArray(merged.contestIds)
    )
      continue;
    const users = merged.users;
    const comparePerf = (aPerf, bPerf) => {
      const aScore = aPerf?.finalScore ?? 0;
      const bScore = bPerf?.finalScore ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      const aSolved = aPerf?.solved ?? 0;
      const bSolved = bPerf?.solved ?? 0;
      if (aSolved !== bSolved) return bSolved - aSolved;
      const aPen = aPerf?.penalty ?? Number.POSITIVE_INFINITY;
      const bPen = bPerf?.penalty ?? Number.POSITIVE_INFINITY;
      return aPen - bPen;
    };
    for (const cid of merged.contestIds) {
      const participants = users.filter((u) => u.contests && u.contests[cid]);
      if (participants.length === 0) continue;
      const ranked = [...participants].sort((u1, u2) =>
        comparePerf(u1.contests[cid], u2.contests[cid])
      );
      // compute best rank among team members for this contest
      let bestRank;
      for (const mj of memberVjs) {
        const idx = ranked.findIndex((u) => String(u.username) === String(mj));
        if (idx >= 0) {
          const rnk = idx + 1;
          if (bestRank === undefined || rnk < bestRank) bestRank = rnk;
        }
      }
      if (bestRank !== undefined) {
        rows.push({
          roomName: merged.name || r.Shared_contest_id,
          contestId: cid,
          contestTitle: merged.contestIdToTitle?.[cid] || cid,
          bestRank,
          participants: ranked.length,
        });
      }
    }
  }
  // de-dup by (room, contest)
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.roomName}__${row.contestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export default async function TeamFinalPage({ params }) {
  const { id } = await params;
  const teamRes = await publicTeamById(id);
  if (teamRes?.error || !teamRes?.result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent)/0.35)] flex items-center justify-center p-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-border/20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[hsl(var(--destructive)/0.15)] to-[hsl(var(--destructive)/0.35)] rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-[hsl(var(--destructive))] text-2xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Team Not Found
            </h2>
            <p className="text-muted-foreground">
              The team you’re looking for doesn’t exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const team = teamRes.result;
  const members = Array.isArray(team.member_vjudge_ids)
    ? team.member_vjudge_ids
    : [];
  const coach = team.coach_vjudge_id || null;
  const me = await fetchMe();
  const myVjudge = me?.vjudge_id || me?.cf_id || null;
  const canRename =
    !!myVjudge &&
    (members.map(String).includes(String(myVjudge)) ||
      (coach && String(coach) === String(myVjudge)));
  const allReports = await fetchAllSharedReports();
  const teamRows = deriveTeamBestRankAcrossReports(
    members,
    allReports?.result || [],
    team.room_id
  );

  async function doRename(formDataOrPrev, maybeFormData) {
    "use server";
    // Extra server-side guard: only allow rename if caller is member or coach
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    let currentUser = null;
    try {
      const meRes = await fetch(`${base}/auth/me`, {
        cache: "no-store",
        credentials: "include",
      });
      if (meRes.ok) {
        const meJson = await meRes.json();
        currentUser = meJson?.result || null;
      }
    } catch (e) {
      console.error("Failed to re-fetch current user in rename action", e);
    }
    const currentVj = currentUser?.vjudge_id || currentUser?.cf_id || null;
    const memberList = Array.isArray(team.member_vjudge_ids)
      ? team.member_vjudge_ids.map(String)
      : [];
    const isCoach = coach && String(coach) === String(currentVj);
    const isMember = currentVj && memberList.includes(String(currentVj));
    if (!isCoach && !isMember) {
      // Silently ignore unauthorized attempt
      return;
    }
    const formData =
      maybeFormData instanceof FormData ? maybeFormData : formDataOrPrev;
    const new_title = formData?.get("new_title");
    if (typeof new_title === "string" && new_title.trim()) {
      await renameMyTeam(id, new_title.trim());
    }
    revalidatePath(`/team/${id}`);
  }

  const profiles = await Promise.all(
    members.map(async (vj) => ({ vj, data: await fetchPublicProfile(vj) }))
  );
  const coachProfile = coach ? await fetchPublicProfile(coach) : null;
  const cfUsers = profiles
    .map((p) => ({
      id: p.data?.result?.id,
      full_name: p.data?.result?.full_name || p.vj,
      cf_id: p.data?.result?.cf_id,
    }))
    .filter((u) => u.cf_id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="inline-flex items-center gap-2 bg-card/90 dark:bg-card/70 backdrop-blur-md rounded-full px-5 py-2.5 mb-6 shadow-lg border border-border/40 dark:border-border/20 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--brand),0.6)]" />
          <span className="text-sm font-semibold text-foreground dark:text-foreground/90 group-hover:text-brand transition-colors">
            Team Dashboard
          </span>
        </div>

        {/* New Team Layout */}
        <div className="space-y-12">
          {/* Team Header */}
          <div className="relative text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-foreground dark:text-foreground/95 tracking-tight mb-2">
                {team.team_title}
              </h1>
              <p className="text-lg text-foreground/70 dark:text-foreground/60 font-medium">
                {team.collection_title}
              </p>
            </div>
            {canRename && (
              <div className="max-w-sm mx-auto mt-4">
                <RenameTeamClient serverAction={doRename} />
              </div>
            )}
          </div>

          {/* Team Members & Coach Section */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Team Member Cards */}
              {profiles.map((p, idx) => {
                const u = p.data?.result;
                return (
                  <div key={p.vj} style={{ animationDelay: `${idx * 100}ms` }} className="profile-card animate-in fade-in zoom-in-95 duration-500 relative">
                    {/* Hover Glow Effect */}
                    <div className="profile-card-glow" />

                    {/* Member Number Badge - Top Right Corner */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        {idx + 1}
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center pt-2">
                      <div className="w-32 h-32 mb-4 overflow-hidden rounded-2xl border-[3px] border-purple-500/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <Image
                          src={u?.profile_pic || "/placeholder.svg?height=128&width=128"}
                          alt={u?.full_name || p.vj}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-lg font-bold text-[hsl(var(--profile-text))] mb-3">{u?.full_name || p.vj}</h4>

                      <div className="w-full space-y-2 mb-4">
                        {u?.email && (
                          <div className="profile-info-chip text-xs w-full justify-center">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{u.email}</span>
                          </div>
                        )}
                        {u?.phone && (
                          <div className="profile-info-chip text-xs w-full justify-center">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/profile/${encodeURIComponent(p.vj)}`}
                        className="w-full mt-auto px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-sm font-medium rounded-lg border border-purple-500/30 transition-all duration-200 hover:border-purple-500/50 flex items-center justify-center gap-2"
                      >
                        View Profile
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Coach Card */}
              {coach && coachProfile && (() => {
                const u = coachProfile.result;
                return (
                  <div key={coach} style={{ animationDelay: `${profiles.length * 100}ms` }} className="profile-card animate-in fade-in zoom-in-95 duration-500 relative">
                    {/* Hover Glow Effect */}
                    <div className="profile-card-glow" />

                    {/* Coach Badge - Top Right Corner */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                        </svg>
                        <span>Coach</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center pt-2">
                      <div className="w-32 h-32 mb-4 overflow-hidden rounded-2xl border-[3px] border-purple-500/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <Image
                          src={u?.profile_pic || "/placeholder.svg?height=128&width=128"}
                          alt={u?.full_name || coach}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-lg font-bold text-[hsl(var(--profile-text))] mb-3">{u?.full_name || coach}</h4>

                      <div className="w-full space-y-2 mb-4">
                        {u?.email && (
                          <div className="profile-info-chip text-xs w-full justify-center">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{u.email}</span>
                          </div>
                        )}
                        {u?.phone && (
                          <div className="profile-info-chip text-xs w-full justify-center">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/profile/${encodeURIComponent(coach)}`}
                        className="w-full mt-auto px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-sm font-medium rounded-lg border border-purple-500/30 transition-all duration-200 hover:border-purple-500/50 flex items-center justify-center gap-2"
                      >
                        View Profile
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Team Performance Section */}
        <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 dark:from-card/90 dark:via-card/85 dark:to-card/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/20 dark:border-border/10 mb-8 hover:shadow-3xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="text-4xl">📊</div>
            <div className="flex-1">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground/95 mb-1">
                Contest Performance
              </h3>
              <p className="text-foreground/60 dark:text-foreground/55 font-medium">
                Team&apos;s competitive programming track record
              </p>
            </div>
            {teamRows.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 dark:border-emerald-500/30 rounded-full px-4 py-2 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors duration-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {teamRows.length} Contests
                </span>
              </div>
            )}
          </div>

          {teamRows.length === 0 ? (
            <div className="text-center py-16 px-4 animate-in fade-in zoom-in-95 duration-700">
              <div className="relative inline-block mb-6 group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-brand/30 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition duration-500" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-accent/25 to-brand/25 dark:from-accent/35 dark:to-brand/35 rounded-full flex items-center justify-center border border-border/40 dark:border-border/30 group-hover:scale-110 transition-transform duration-500">
                  <svg
                    className="w-12 h-12 text-foreground/50 dark:text-foreground/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <h4 className="text-xl font-bold text-foreground dark:text-foreground/95 mb-2">
                No Performance Data Yet
              </h4>
              <p className="text-foreground/60 dark:text-foreground/55 font-medium max-w-md mx-auto">
                Performance metrics and contest rankings will appear here once
                team members start participating in competitive programming
                contests
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex items-start gap-3 rounded-2xl p-4 border border-emerald-500/40 dark:border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/10 dark:to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 dark:hover:from-emerald-500/15 dark:hover:to-teal-500/15 transition-colors duration-300">
                <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Best Team Performance
                  </p>
                  <p className="text-xs text-foreground/65 dark:text-foreground/60 font-medium leading-relaxed">
                    Displaying the best (lowest) rank achieved by any team
                    member in each contest. This represents the team&apos;s peak
                    performance across all participants.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-background/60 to-accent/10 dark:from-background/40 dark:to-accent/15 rounded-2xl p-6 border border-border/40 dark:border-border/25 shadow-inner hover:shadow-lg transition-shadow duration-500">
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
      </div>
    </div>
  );
}
