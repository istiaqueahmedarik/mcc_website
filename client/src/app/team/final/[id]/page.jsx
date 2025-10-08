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

        {/* Main Team Card - Team Info + Coach on Left, Members on Right */}
        <div className="bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/40 dark:border-border/20 overflow-hidden hover:shadow-3xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left Side - Team Name + Coach */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-br from-accent/8 via-accent/4 to-background dark:from-accent/12 dark:via-accent/6 dark:to-background/95 border-b lg:border-b-0 lg:border-r border-border/40 dark:border-border/25">
              {/* Team Info */}
              <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-start gap-4 mb-5">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-br from-brand via-brand/50 to-brand/30 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-brand to-brand/80 dark:from-brand dark:to-brand/90 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                      <span className="text-white text-2xl sm:text-3xl font-bold drop-shadow-lg">
                        {team.team_title.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground/95 mb-2 tracking-tight">
                      {team.team_title}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-foreground/70 dark:text-foreground/60">
                      <svg
                        className="w-4 h-4 text-brand"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">
                        {team.collection_title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member Tags */}
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {members.map((m, idx) => (
                    <Link
                      key={m}
                      href={`/profile/${encodeURIComponent(m)}`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="inline-flex items-center gap-2 bg-brand/15 hover:bg-brand/25 dark:bg-brand/25 dark:hover:bg-brand/35 text-brand dark:text-brand/95 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in fade-in zoom-in-95"
                    >
                      <span className="w-1.5 h-1.5 bg-brand rounded-full shadow-[0_0_6px_rgba(var(--brand),0.8)]" />
                      {m}
                    </Link>
                  ))}
                </div>

                {canRename && (
                  <div className="pt-5 border-t border-border/40 dark:border-border/25 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                    <RenameTeamClient serverAction={doRename} />
                  </div>
                )}
              </div>

              {/* TEAM COACH Section Header */}
              {coach && coachProfile && (
                <div className="mb-6 animate-in fade-in slide-in-from-left-5 duration-600 delay-200">
                  <div className="flex items-center gap-4">
                    <div className="relative group/header">
                      <div className="absolute -inset-1 bg-accent/30 rounded-xl blur-md group-hover/header:blur-lg transition duration-300"></div>
                      <div className="relative w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/10 dark:from-accent/30 dark:to-accent/20 rounded-xl flex items-center justify-center ring-2 ring-accent/30 group-hover/header:ring-accent/50 transition-all duration-300">
                        <svg
                          className="w-7 h-7 text-accent"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground dark:text-foreground/95">
                        Team Coach
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Coach Card */}
              {coach &&
                coachProfile &&
                (() => {
                  const u = coachProfile?.result;
                  return (
                    <div className="relative group animate-in fade-in slide-in-from-left-6 duration-700 delay-300">
                      {/* Subtle glow effect */}
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-accent via-accent/50 to-accent/30 rounded-3xl blur-lg opacity-60 group-hover:opacity-80 transition duration-700"></div>

                      <div className="relative bg-gradient-to-br from-accent/25 via-accent/15 to-accent/5 dark:from-accent/35 dark:via-accent/25 dark:to-accent/10 backdrop-blur-md rounded-3xl p-6 border-2 border-accent/40 dark:border-accent/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
                        {/* Profile Section */}
                        <div className="flex flex-col items-center text-center mb-5">
                          <div className="relative mb-4 group/img">
                            {/* Animated ring */}
                            <div className="absolute -inset-2 bg-gradient-to-br from-accent via-brand to-accent rounded-3xl blur-md opacity-75 group-hover/img:opacity-100 group-hover/img:blur-xl transition duration-500 animate-pulse"></div>
                            <div className="absolute -inset-1 bg-gradient-to-br from-accent to-brand rounded-3xl opacity-50"></div>

                            <Image
                              src={
                                u?.profile_pic ||
                                "/placeholder.svg?height=96&width=96"
                              }
                              alt={u?.full_name || coach}
                              width={96}
                              height={96}
                              className="relative rounded-3xl ring-4 ring-accent/30 dark:ring-accent/40 shadow-2xl group-hover/img:ring-accent/60 dark:group-hover/img:ring-accent/70 group-hover/img:scale-105 transition-all duration-500 brightness-105 dark:brightness-110"
                            />
                          </div>

                          <h3 className="text-xl font-bold text-foreground dark:text-foreground/95 mb-1.5 tracking-tight">
                            {u?.full_name || coach}
                          </h3>
                          <p className="text-sm font-medium text-foreground/60 dark:text-foreground/50 mb-1">
                            @{coach}
                          </p>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2.5 mb-5">
                          {u?.email && (
                            <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/70 dark:text-foreground/65 bg-background/60 dark:bg-background/40 rounded-xl px-3.5 py-2.5 hover:bg-background/80 dark:hover:bg-background/60 transition-all duration-300 group/email">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover/email:shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          )}
                          {u?.phone && (
                            <div className="flex items-center gap-2.5 text-xs font-medium text-foreground/70 dark:text-foreground/65 bg-background/60 dark:bg-background/40 rounded-xl px-3.5 py-2.5 hover:bg-background/80 dark:hover:bg-background/60 transition-all duration-300 group/phone">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)] group-hover/phone:shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Platform Badges */}
                        <div className="flex flex-wrap justify-center gap-2 mb-5">
                          {u?.cf_id && (
                            <Link
                              href={`https://codeforces.com/profile/${encodeURIComponent(
                                u.cf_id
                              )}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              CF: {u.cf_id}
                            </Link>
                          )}
                          {u?.codechef_id && (
                            <Link
                              href={`https://www.codechef.com/users/${encodeURIComponent(
                                u.codechef_id
                              )}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              CC: {u.codechef_id}
                            </Link>
                          )}
                        </div>

                        {/* View Profile Button */}
                        <Link
                          href={`/profile/${encodeURIComponent(coach)}`}
                          className="block w-full text-center bg-accent/30 hover:bg-accent/40 dark:bg-accent/40 dark:hover:bg-accent/50 text-accent-foreground dark:text-foreground/90 font-bold py-3 rounded-xl transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105 ring-2 ring-accent/20 hover:ring-accent/40"
                        >
                          View Full Profile →
                        </Link>
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* Right Side - Team Members */}
            <div className="lg:col-span-7 p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-brand/30 rounded-xl blur-md group-hover:blur-lg transition duration-300"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-brand/20 to-brand/10 dark:from-brand/30 dark:to-brand/20 rounded-xl flex items-center justify-center ring-2 ring-brand/30 group-hover:ring-brand/50 transition-all duration-300">
                    <svg
                      className="w-7 h-7 text-brand"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground dark:text-foreground/95">
                    Team Members
                  </h3>
                  <p className="text-base font-semibold text-foreground/65 dark:text-foreground/60">
                    {members.length}{" "}
                    {members.length === 1 ? "Member" : "Members"}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                {profiles.map((p, idx) => {
                  const u = p.data?.result;
                  return (
                    <div
                      key={p.vj}
                      style={{ animationDelay: `${idx * 100}ms` }}
                      className="group relative animate-in fade-in zoom-in-95 duration-500"
                    >
                      {/* Card glow on hover */}
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-brand/20 via-accent/20 to-brand/20 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>

                      <div className="relative bg-background/60 hover:bg-background/90 dark:bg-background/40 dark:hover:bg-background/70 backdrop-blur-sm rounded-3xl p-4 sm:p-5 lg:p-6 border border-border/40 hover:border-brand/50 dark:border-border/25 dark:hover:border-brand/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1 h-full">
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 h-full">
                          {/* Profile Picture with enhanced visibility */}
                          <div className="relative flex-shrink-0 self-center sm:self-start group/avatar">
                            <div className="absolute -inset-2 bg-gradient-to-br from-brand/40 via-accent/40 to-brand/40 rounded-3xl blur-lg opacity-60 group-hover/avatar:opacity-100 group-hover/avatar:blur-xl transition duration-500"></div>
                            <Image
                              src={
                                u?.profile_pic ||
                                "/placeholder.svg?height=120&width=120"
                              }
                              alt={u?.full_name || p.vj}
                              width={120}
                              height={120}
                              className="relative rounded-3xl ring-4 ring-border/50 dark:ring-border/40 group-hover/avatar:ring-brand/60 dark:group-hover/avatar:ring-brand/70 shadow-2xl group-hover/avatar:shadow-3xl group-hover/avatar:scale-105 transition-all duration-500 brightness-105 dark:brightness-120 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-cover"
                            />
                          </div>

                          {/* Member Info */}
                          <div className="flex-1 min-w-0 flex flex-col text-center sm:text-left">
                            <h4 className="text-base sm:text-lg md:text-xl font-bold text-foreground dark:text-foreground/95 mb-1 sm:mb-1.5 md:mb-2 break-words line-clamp-2 group-hover:text-brand dark:group-hover:text-brand/90 transition-colors duration-300">
                              {u?.full_name || p.vj}
                            </h4>
                            <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground/65 dark:text-foreground/60 mb-2 sm:mb-3 md:mb-4 break-words">
                              @{p.vj}
                            </p>

                            {/* Contact Info - Phone Only */}
                            {u?.phone && (
                              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 md:gap-3 text-xs sm:text-sm md:text-base font-medium text-foreground/70 dark:text-foreground/65 mb-3 sm:mb-4 md:mb-5">
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.7)]" />
                                <span className="truncate">{u.phone}</span>
                              </div>
                            )}

                            {/* Platform Badges */}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 md:gap-2.5 mb-3 sm:mb-4 md:mb-5">
                              {u?.cf_id && (
                                <Link
                                  href={`https://codeforces.com/profile/${encodeURIComponent(
                                    u.cf_id
                                  )}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-red-500/95 hover:bg-red-500 text-white rounded-lg sm:rounded-xl px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                                >
                                  <svg
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                  CF
                                </Link>
                              )}
                              {u?.codechef_id && (
                                <Link
                                  href={`https://www.codechef.com/users/${encodeURIComponent(
                                    u.codechef_id
                                  )}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-amber-500/95 hover:bg-amber-500 text-white rounded-lg sm:rounded-xl px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                                >
                                  <svg
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                  CC
                                </Link>
                              )}
                              {u?.atcoder_id && (
                                <Link
                                  href={`https://atcoder.jp/users/${encodeURIComponent(
                                    u.atcoder_id
                                  )}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-gray-600/95 hover:bg-gray-600 text-white rounded-lg sm:rounded-xl px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                                >
                                  <svg
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                  AC
                                </Link>
                              )}
                              {!u?.cf_id &&
                                !u?.codechef_id &&
                                !u?.atcoder_id && (
                                  <span className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-muted/60 dark:bg-muted/40 text-foreground/75 dark:text-foreground/70 rounded-lg sm:rounded-xl px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-bold shadow-sm">
                                    <svg
                                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                    VJudge
                                  </span>
                                )}
                            </div>

                            {/* View Profile Link */}
                            <Link
                              href={`/profile/${encodeURIComponent(p.vj)}`}
                              className="inline-flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-brand dark:text-brand/90 hover:text-brand/80 dark:hover:text-brand/70 font-bold group/link transition-all duration-300 mt-auto"
                            >
                              View Profile
                              <svg
                                className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Section */}
        <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 dark:from-card/90 dark:via-card/85 dark:to-card/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/20 dark:border-border/10 mb-8 hover:shadow-3xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 group-hover:blur-lg transition duration-500" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <svg
                  className="w-7 h-7 text-white drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground/95 mb-1">
                Team Performance
              </h3>
              <p className="text-foreground/60 dark:text-foreground/55 font-medium">
                Historical contest rankings and achievements
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
                    member in each contest. This represents the team's peak
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

        {/* Codeforces Activity Section */}
        {cfUsers.length > 0 && (
          <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 dark:from-card/90 dark:via-card/85 dark:to-card/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/20 dark:border-border/10 hover:shadow-3xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 delay-200">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 group-hover:blur-lg transition duration-500" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <svg
                    className="w-7 h-7 text-white font-bold drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <text
                      x="50%"
                      y="50%"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      CF
                    </text>
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground/95 mb-1">
                  Codeforces Activity
                </h3>
                <p className="text-foreground/60 dark:text-foreground/55 font-medium">
                  Live submission tracking and coding statistics
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-red-500/15 dark:bg-red-500/20 border border-red-500/40 dark:border-red-500/30 rounded-full px-4 py-2 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors duration-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                  {cfUsers.length} {cfUsers.length === 1 ? "Member" : "Members"}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-background/60 to-red-500/10 dark:from-background/40 dark:to-red-500/15 rounded-2xl p-6 border border-border/40 dark:border-border/25 shadow-inner hover:shadow-lg transition-shadow duration-500 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
              <CodeforcesSubmissionDashboard users={cfUsers} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
