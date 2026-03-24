import {
  adminFinalizeTeamCollection,
  adminGetCollectionDetail,
  adminListTeamRequests,
  adminPreviewCollection,
  adminProcessTeamRequest,
  adminSetPhase1Deadline,
  adminStartPhase2,
  adminUnfinalizeTeamCollection,
  publicFinalizedTeamsByContest,
} from "@/actions/team_collection";
import ManualTeamCreateFloatingButton from "@/components/ManualTeamCreateFloatingButton";
import ProgressLink from "@/components/ProgressLink";
import { TeamActionForm } from "@/components/TeamActionForm";
import TeamCardActionsInline from "@/components/TeamCardActionsInline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { get_with_token } from "@/lib/action";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FastForward,
  LinkIcon,
  Settings
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function fetchPublicProfile(vjudge) {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const response = await fetch(
      `${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`,
      { cache: "no-store" }
    );
    return await response.json();
  } catch {
    return { error: "failed" };
  }
}

async function fetchLatestRoomUserScores(roomId) {
  if (!roomId) return new Map();
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const res = await fetch(`${base}/public-contest-report/all`, {
      cache: "no-store",
    });
    const data = await res.json();
    const reports = Array.isArray(data?.result) ? data.result : [];
    const roomReports = reports.filter(
      (r) => String(r?.Shared_contest_id) === String(roomId)
    );
    if (!roomReports.length) return new Map();

    const latest = roomReports.sort((a, b) => {
      const aTs = new Date(a?.created_at || a?.Updated_at || 0).getTime();
      const bTs = new Date(b?.created_at || b?.Updated_at || 0).getTime();
      return bTs - aTs;
    })[0];

    let parsed = {};
    try {
      parsed = JSON.parse(latest?.JSON_string || "{}");
    } catch {
      parsed = {};
    }

    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    const scoreMap = new Map();
    for (const u of users) {
      const username = String(u?.username || "").trim();
      if (!username) continue;
      const score =
        typeof u?.effectiveSolved === "number"
          ? u.effectiveSolved
          : typeof u?.totalSolved === "number"
            ? u.totalSolved
            : typeof u?.solved === "number"
              ? u.solved
              : null;
      if (typeof score === "number") scoreMap.set(username, score);
    }
    return scoreMap;
  } catch {
    return new Map();
  }
}

export default async function Page({ params, searchParams }) {
  // Admin guard (server-side)
  const cookieStore = await cookies();
  if (!cookieStore.get("token")) redirect("/login");
  const user = await get_with_token("auth/user/profile");
  if (user?.result?.length === 0) redirect("/login");
  if (user?.result?.[0]?.admin === false) redirect("/");
  const { id } = await params;
  const detail = await adminGetCollectionDetail(id);
  const finalizedRes = await publicFinalizedTeamsByContest();
  if (detail?.error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Collection Not Found
              </h3>
              <p className="text-muted-foreground">
                The requested collection could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );

  const { collection, rankOrder, choices, teams } = detail.result || {};
  const roomUserScores = await fetchLatestRoomUserScores(collection?.room_id);
  const normalizeTitle = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const finalizedBlock = (finalizedRes?.result || []).find(
    (b) => String(b?.collection_id) === String(id)
  );
  const finalizedScoreById = new Map();
  const finalizedScoreByTitle = new Map();
  for (const t of finalizedBlock?.teams || []) {
    const score =
      typeof t?.combined_score === "number"
        ? t.combined_score / 3
        : null;
    if (score !== null && t?.id != null)
      finalizedScoreById.set(String(t.id), score);
    if (score !== null && t?.team_title)
      finalizedScoreByTitle.set(normalizeTitle(t.team_title), score);
  }
  const getTeamScore = (team) => {
    const byId = team?.id != null ? finalizedScoreById.get(String(team.id)) : null;
    if (typeof byId === "number") return byId;
    if (!team?.team_title) return null;
    const byTitle = finalizedScoreByTitle.get(normalizeTitle(team.team_title));
    return typeof byTitle === "number" ? byTitle : null;
  };

  const getSubmissionAvgScore = (ch) => {
    const submitterVj = String(ch?.user_vjudge_id || ch?.vjudge_id || "").trim();
    const memberIds = (Array.isArray(ch?.ordered_choices) ? ch.ordered_choices : [])
      .map((m) => String(m || "").trim())
      .filter(Boolean)
      .slice(0, 2);

    const usersForAverage = [submitterVj, ...memberIds].filter(Boolean);
    const scores = usersForAverage
      .map((vj) => roomUserScores.get(vj))
      .filter((s) => typeof s === "number");

    if (!scores.length) return null;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return sum / scores.length;
  };

  const sortedChoices = [...(choices || [])]
    .map((ch) => ({
      ...ch,
      _score: getSubmissionAvgScore(ch),
    }))
    .sort((a, b) => {
      const aScore = a?._score;
      const bScore = b?._score;

      if (typeof aScore === "number" && typeof bScore === "number") {
        if (bScore !== aScore) return bScore - aScore;
        return String(a?.team_title || "").localeCompare(
          String(b?.team_title || ""),
          undefined,
          { sensitivity: "base" }
        );
      }

      if (typeof aScore === "number") return -1;
      if (typeof bScore === "number") return 1;

      return String(a?.team_title || "").localeCompare(
        String(b?.team_title || ""),
        undefined,
        { sensitivity: "base" }
      );
    });
  const sortedTeams = [...(teams || [])].sort((a, b) => {
    const aScore = getTeamScore(a);
    const bScore = getTeamScore(b);

    if (typeof aScore === "number" && typeof bScore === "number") {
      if (bScore !== aScore) return bScore - aScore;
      return String(a?.team_title || "").localeCompare(
        String(b?.team_title || ""),
        undefined,
        { sensitivity: "base" }
      );
    }

    if (typeof aScore === "number") return -1;
    if (typeof bScore === "number") return 1;

    return String(a?.team_title || "").localeCompare(
      String(b?.team_title || ""),
      undefined,
      { sensitivity: "base" }
    );
  });
  // Load manual team requests
  let teamRequests = [];
  try {
    const reqRes = await adminListTeamRequests(id);
    if (reqRes?.success) teamRequests = reqRes.result || [];
  } catch { }
  const preview = await adminPreviewCollection(id);
  const manualTeams = preview?.result?.manualTeams || [];
  const autoTeams = preview?.result?.autoTeams || [];
  const resolvedSearchParams = await searchParams;
  const tabOptions = [
    "current-teams",
    "submissions",
    "auto-preview",
    "manual-requests",
    "participants",
  ];
  const activeSection = tabOptions.includes(resolvedSearchParams?.section)
    ? resolvedSearchParams?.section
    : "current-teams";
  const allTeamUserIds = new Set();
  for (const t of teams || []) {
    for (const m of t?.member_vjudge_ids || []) allTeamUserIds.add(String(m));
    if (t?.coach_vjudge_id) allTeamUserIds.add(String(t.coach_vjudge_id));
  }
  for (const ch of choices || []) {
    const submitter = ch?.user_vjudge_id || ch?.vjudge_id;
    if (submitter) allTeamUserIds.add(String(submitter));
    const ordered = Array.isArray(ch?.ordered_choices) ? ch.ordered_choices : [];
    for (const m of ordered) {
      if (m) allTeamUserIds.add(String(m));
    }
  }
  for (const vj of rankOrder || []) {
    if (vj) allTeamUserIds.add(String(vj));
  }
  for (const req of teamRequests || []) {
    if (req?.vjudge_id) allTeamUserIds.add(String(req.vjudge_id));
    const requestedMembers = Array.isArray(req?.desired_member_vjudge_ids)
      ? req.desired_member_vjudge_ids
      : [];
    for (const m of requestedMembers) {
      if (m) allTeamUserIds.add(String(m));
    }
  }
  const teamProfilesArr = await Promise.all(
    Array.from(allTeamUserIds).map(async (vj) => ({
      vj,
      data: await fetchPublicProfile(vj),
    }))
  );
  const teamProfileMap = new Map(
    teamProfilesArr.map((p) => [p.vj, p.data?.result || {}])
  );
  const tabCounts = {
    currentTeams: teams?.length || 0,
    submissions: choices?.length || 0,
    autoPreview: autoTeams?.length || 0,
    manualRequests: teamRequests?.length || 0,
    participants: rankOrder?.length || 0,
  };

  async function finalize() {
    "use server";
    await adminFinalizeTeamCollection(id);
    revalidatePath(`/admin/team-collection/${id}`);
  }
  async function unfinalize() {
    "use server";
    await adminUnfinalizeTeamCollection(id);
    revalidatePath(`/admin/team-collection/${id}`);
  }

  async function setDeadline(formData) {
    "use server";
    const deadline = formData.get("phase1_deadline");
    await adminSetPhase1Deadline(id, deadline || null);
    revalidatePath(`/admin/team-collection/${id}`);
  }
  async function startPhase2() {
    "use server";
    await adminStartPhase2(id);
    revalidatePath(`/admin/team-collection/${id}`);
  }
  function formatLocalDateTime(isoOrDate) {
    try {
      const d = new Date(isoOrDate);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl items-center mx-auto px-6 py-1">
          <div className="flex flex-col items-center justify-center gap-x-6 text-center">
            <div className="space-y-1 flex flex-col items-center">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-balance">
                Collection Management
              </h1>
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="flex gap-2 items-center">
                  <span className="font-medium">{collection?.title ?? collection?.collection_name}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="flex items-center">
                    <Settings className="h-4 w-4" />
                    Contest: {collection?.room_name}
                  </span>
                </div>
              </div>
              {/* Copy Links */}
              {collection?.token && (
                <div className="flex flex-col items-center text-[12px] font-mono text-muted-foreground leading-tight">
                  <div className="flex flex-col md:flex-row gap-2">
                    <ProgressLink
                      href={`/team/${collection.token}`}
                      className="underline break-all text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      Team Choices
                      <LinkIcon className="inline-block w-3 h-3 mb-0.5" />
                    </ProgressLink>
                    <Separator orientation="vertical" className="h-4" />
                    <ProgressLink
                      href={`/team/manual-request/${collection.token}`}
                      className="underline break-all text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      Manual Requests
                      <LinkIcon className="inline-block w-3 h-3 mb-0.5" />
                    </ProgressLink>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Phase:</span>
                  <span className="px-2 py-0.5 rounded-md bg-muted border text-xs font-mono">
                    {collection?.phase || 1}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                {collection?.finalized ? (
                  <div className="flex justify-center">
                    <TeamActionForm
                      action={unfinalize}
                      pending="Unfinalizing..."
                      success="Collection unfinalized"
                      error="Failed to unfinalize"
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2 bg-transparent"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Unfinalize
                      </Button>
                    </TeamActionForm>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <TeamActionForm
                      action={finalize}
                      pending="Finalizing..."
                      success="Collection finalized"
                      error="Failed to finalize"
                    >
                      <Button
                        size="lg"
                        className="gap-2 bg-green-400 hover:bg-green-300"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalize Collection
                      </Button>
                    </TeamActionForm>
                  </div>
                )}

              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col lg:flex-row gap-4 items-start">
            {collection?.phase === 1 && !collection?.finalized && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <TeamActionForm
                  action={setDeadline}
                  pending="Saving..."
                  success="Deadline set"
                  error="Failed"
                >
                  <input type="hidden" name="id" value={collection?.id} />
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      name="phase1_deadline"
                      defaultValue={
                        collection?.phase1_deadline
                          ? formatLocalDateTime(collection.phase1_deadline)
                          : ""
                      }
                      className="px-2 py-1 rounded border bg-background/70"
                    />
                    <Button variant="outline" size="sm">
                      Set Deadline
                    </Button>
                  </div>
                </TeamActionForm>
                <form action={startPhase2}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="gap-1 bg-accent hover:bg-accent/90  text-primary/90"
                  >
                    <FastForward className="w-3 h-3" /> Start Phase 2
                  </Button>
                </form>
                {collection?.phase1_deadline && (
                  <span className="font-mono text-muted-foreground">
                    Ends:{" "}
                    {new Date(collection.phase1_deadline).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {collection?.phase === 2 && (
              <span className="text-xs font-semibold text-green-600">
                Phase 2 Active (Team Selection)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-6 py-8 space-y-8">
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap justify-center rounded-2xl border border-border bg-card p-1 shadow-sm gap-1">
            <Link
              href={`/admin/team-collection/${id}?section=current-teams`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "current-teams"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Current Teams{tabCounts.currentTeams ? ` (${tabCounts.currentTeams})` : ""}
            </Link>
            <Link
              href={`/admin/team-collection/${id}?section=submissions`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "submissions"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Team submissions{tabCounts.submissions ? ` (${tabCounts.submissions})` : ""}
            </Link>
            <Link
              href={`/admin/team-collection/${id}?section=auto-preview`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "auto-preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Automatic preview{tabCounts.autoPreview ? ` (${tabCounts.autoPreview})` : ""}
            </Link>
            <Link
              href={`/admin/team-collection/${id}?section=manual-requests`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "manual-requests"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Team requests{tabCounts.manualRequests ? ` (${tabCounts.manualRequests})` : ""}
            </Link>
            <Link
              href={`/admin/team-collection/${id}?section=participants`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "participants"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              All participants{tabCounts.participants ? ` (${tabCounts.participants})` : ""}
            </Link>
          </div>
        </div>

        {activeSection === "current-teams" && (
          <Card className="w-full lg:w-full border-0">
            <CardHeader className="bg-muted/30 items-center">
              <h2 className="flex text-center items-center text-xl">
                Preview of finalized teams
              </h2>
            </CardHeader>
            <CardContent className="w-full">
              <div className="space-y-2">
                <Card className="w-full border-t border-border/50 ">
                  {/* <CardHeader className="pb-3">
                  <CardTitle className="text-base">Team Members & Coaches Info</CardTitle>
                </CardHeader> */}
                  <CardContent className="space-y-4 border-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedTeams?.map((t) => {
                      const members = Array.isArray(t?.member_vjudge_ids)
                        ? t.member_vjudge_ids.map(String)
                        : [];
                      const coachVj = t?.coach_vjudge_id ? String(t.coach_vjudge_id) : null;
                      const coachProfile = coachVj
                        ? teamProfileMap.get(coachVj) || {}
                        : null;

                      return (
                        <div
                          key={`info_${t.id}`}
                          className="relative rounded-xl border border-border/50 p-3 bg-transparent"
                        >
                          <div className="absolute top-3 right-3 z-10">
                            <TeamCardActionsInline
                              collectionId={id}
                              teamTitle={t.team_title}
                              members={members}
                              coachVjudgeId={coachVj || ""}
                            />
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            <div className="p-3 bg-background/60 space-y-3 flex flex-col items-center border-b-2 lg:border-r-2 border-border/80 justify-evenly">
                              <div className="flex items-center w-full gap-2 flex-col border-b justify-between border-border/80 pb-2">
                                <span className="text-lg font-semibold text-foreground">
                                  {t.team_title}
                                </span>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {typeof getTeamScore(t) === "number" ? getTeamScore(t).toFixed(2) : "-"}
                                  </Badge>
                                  {t.approved_by ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      Approved
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Automated</Badge>
                                  )}
                                </div>
                              </div>

                              {coachVj ? (
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                                    {coachProfile?.profile_pic ? (
                                      <Image
                                        src={coachProfile.profile_pic}
                                        alt={coachProfile?.full_name || coachVj}
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">N/A</span>
                                    )}
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <div>{coachProfile?.full_name || "-"}</div>
                                    <div>{coachProfile?.batch_name || "-"}</div>

                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No coach assigned.
                                </div>
                              )}
                            </div>

                            <div className="rounded-lg p-3 bg-background/60">
                              {members.length > 0 ? (
                                <div className="space-y-1">
                                  {members.map((vj, idx) => {
                                    const p = teamProfileMap.get(String(vj)) || {};

                                    return (
                                      <div
                                        key={`${t.id}_${vj}_${idx}`}
                                        className="rounded-md border-b border-border/60 p-1 bg-muted/20"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                                            {p?.profile_pic ? (
                                              <Image
                                                src={p.profile_pic}
                                                alt={p?.full_name || vj}
                                                width={40}
                                                height={40}
                                                className="w-10 h-10 object-cover"
                                              />
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground">N/A</span>
                                            )}
                                          </div>
                                          <div className="text-sm space-y-1">
                                            <div>{p?.full_name || "-"}</div>
                                            <div>{p?.batch_name || "-"}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No members assigned.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!teams?.length && (
                      <div className="text-sm text-muted-foreground">
                        No teams available.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!teams?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No teams created yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "submissions" && (
          <Card className="overflow-hidden border-0">
            <CardHeader className="bg-muted/30 border-0 items-center">
              <h2 className="flex text-center items-center text-xl">
                Team choice submissions by participants
              </h2>
            </CardHeader>
            <CardContent className="">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedChoices?.map((ch) => {
                  const submitterVj = String(ch?.user_vjudge_id || ch?.vjudge_id || "");
                  const submitterProfile = submitterVj
                    ? teamProfileMap.get(submitterVj) || {}
                    : {};
                  const submitterScore = submitterVj
                    ? roomUserScores.get(submitterVj)
                    : null;
                  const memberIds = (Array.isArray(ch?.ordered_choices) ? ch.ordered_choices : [])
                    .map((m) => String(m || "").trim())
                    .filter(Boolean)
                    .slice(0, 5);

                  return (
                    <div
                      key={ch.id}
                      className="rounded-xl border border-border/50 p-3 bg-muted/10 space-y-3"
                    >
                      <div className="rounded-lg bg-background/60 space-y-2">
                        <div className="flex items-center gap-2 flex-col">
                          <span className="text-base font-semibold text-foreground">
                            {ch?.team_title || "Untitled Team"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Score: {typeof ch?._score === "number" ? ch._score.toFixed(2) : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      <div className="border-b-2 flex flex-col justify-center items-center border-border/80 bg-background/60 space-y-2 p-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Submitted By
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                            {submitterProfile?.profile_pic ? (
                              <Image
                                src={submitterProfile.profile_pic}
                                alt={submitterProfile?.full_name || submitterVj || "Submitter"}
                                width={44}
                                height={44}
                                className="w-11 h-11 object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </div>
                          <div className="text-sm space-y-0.5">
                            <div>{submitterProfile?.full_name || ch?.full_name || "-"} </div>
                            <div className="text-xs text-muted-foreground">{submitterProfile?.batch_name || "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              Score: {typeof submitterScore === "number" ? submitterScore.toFixed(2) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg p-1 bg-background/60 space-y-2">
                        <div className="text-xs text-center uppercase tracking-wide text-muted-foreground">
                          Other Members
                        </div>
                        {memberIds.length > 0 ? (
                          <div className="space-y-1.5">
                            {memberIds.map((vj, idx) => {
                              const p = teamProfileMap.get(vj) || {};
                              const memberScore = roomUserScores.get(vj);
                              return (
                                <div
                                  key={`${ch.id}_${vj}_${idx}`}
                                  className="rounded-md border-b border-border/40 p-1.5 bg-muted/20"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                                      {p?.profile_pic ? (
                                        <Image
                                          src={p.profile_pic}
                                          alt={p?.full_name || vj}
                                          width={36}
                                          height={36}
                                          className="w-9 h-9 object-cover"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground">N/A</span>
                                      )}
                                    </div>
                                    <div className="text-sm leading-tight">
                                      <div>{p?.full_name || vj}</div>
                                      <div className="text-xs text-muted-foreground">{p?.batch_name || "-"}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Score: {typeof memberScore === "number" ? memberScore.toFixed(2) : "-"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No members found.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!choices?.length && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No submissions received yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "auto-preview" && (
          <Card className="overflow-hidden border-0">
              <CardHeader className="bg-muted/30 border-0 items-center">
                <h2 className="flex text-center items-center text-xl">
                  Auto generated team preview
                </h2>
              </CardHeader>
            <CardContent className="">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {autoTeams.map((t, idx) => {
                  const memberIds = (Array.isArray(t?.members) ? t.members : [])
                    .map((m) => String(m || "").trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  const scoreValues = memberIds
                    .map((vj) => roomUserScores.get(vj))
                    .filter((s) => typeof s === "number");
                  const teamScore = scoreValues.length
                    ? scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length
                    : null;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/50 p-3 bg-muted/10 space-y-3"
                    >
                      <div className="rounded-lg bg-background/60 space-y-2">
                        <div className="flex items-center gap-2 flex-col">
                          <span className="text-base font-semibold text-foreground text-center">
                            {t?.title || "Untitled Team"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Score: {typeof teamScore === "number" ? teamScore.toFixed(2) : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-lg p-1 bg-background/60 space-y-2">
                        {memberIds.length > 0 ? (
                          <div className="space-y-1.5">
                            {memberIds.map((vj, memberIdx) => {
                              const p = teamProfileMap.get(vj) || {};
                              const memberScore = roomUserScores.get(vj);
                              return (
                                <div
                                  key={`${idx}_${vj}_${memberIdx}`}
                                  className="rounded-md border-b border-border/40 p-1.5 bg-muted/20"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                                      {p?.profile_pic ? (
                                        <Image
                                          src={p.profile_pic}
                                          alt={p?.full_name || vj}
                                          width={36}
                                          height={36}
                                          className="w-9 h-9 object-cover"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground">N/A</span>
                                      )}
                                    </div>
                                    <div className="text-sm leading-tight">
                                      <div>{p?.full_name || vj}</div>
                                      <div className="text-xs text-muted-foreground">{p?.batch_name || "-"}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Score: {typeof memberScore === "number" ? memberScore.toFixed(2) : "-"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No members found.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!autoTeams.length && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No auto teams can be formed with current submissions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "manual-requests" && (
          <Card className="overflow-hidden border-0">
            <CardHeader className="bg-muted/30 border-0 items-center">
              <h2 className="flex items-center gap-2 text-xl">
                Manual Team Requests
              </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teamRequests.map((req) => (
                (() => {
                  const requestedMembers = Array.isArray(req?.desired_member_vjudge_ids)
                    ? req.desired_member_vjudge_ids.map((m) => String(m))
                    : [];
                  const memberProfiles = requestedMembers.map((vj) => ({
                    vjudge_id: vj,
                    ...(teamProfileMap.get(vj) || {}),
                  }));
                  return (
                    <ManualRequestItem
                      key={req.id}
                      request={req}
                      collectionId={id}
                      profile={teamProfileMap.get(String(req?.vjudge_id || "")) || {}}
                      memberProfiles={memberProfiles}
                    />
                  );
                })()
              ))}
              {!teamRequests.length && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No manual requests submitted.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "participants" && (
          <Card className="overflow-hidden border-0">
            <CardHeader className="bg-muted/30 border-0 items-center">
              <h2 className="flex items-center gap-2 text-xl">
                Participants
              </h2>
            </CardHeader>
            <CardContent className="">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {rankOrder?.map((u, i) => {
                  const p = teamProfileMap.get(String(u)) || {};
                  const participantScore = roomUserScores.get(String(u));
                  return (
                    <div
                      key={u}
                      className="rounded-xl border border-border/50 p-3 bg-muted/10 space-y-3"
                    >
                      {/* <div className="flex items-center justify-between">
                        <Badge variant="outline">Rank #{i + 1}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          Score: {typeof participantScore === "number" ? participantScore.toFixed(2) : "-"}
                        </Badge>
                      </div> */}

                      <div className="rounded-lg bg-background/60">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden  bg-muted flex items-center justify-center">
                            {p?.profile_pic ? (
                              <Image
                                src={p.profile_pic}
                                alt={p?.full_name || String(u)}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </div>
                          <div className="text-sm space-y-0.5 min-w-0">
                            <div className="font-medium truncate">{p?.full_name || String(u)}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p?.batch_name || "-"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              Score: {typeof participantScore === "number" ? participantScore.toFixed(2) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!rankOrder?.length && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No participants registered yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ManualTeamCreateFloatingButton collectionId={id} />
    </div>
  );
}

function AddMemberForm({ collectionId, teamTitle, rankOrder, existing }) {
  async function add(formData) {
    "use server";
    const { adminApproveManualTeam } = await import(
      "@/actions/team_collection"
    );
    const title = formData.get("team_title");
    const member = formData.get("member");
    const existingCsv = formData.get("existing") || "";
    const current = String(existingCsv).split(",").filter(Boolean);
    const members = [...current, member].filter(Boolean);
    await adminApproveManualTeam(collectionId, title, members);
  }
  const options = (rankOrder || []).filter((u) => !existing.includes(u));

  if (!options.length) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/20 text-muted-foreground">
        <div className="p-2 rounded-lg bg-muted/40">
          <UserPlus className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">No available members to add</span>
      </div>
    );
  }

  return (
    <TeamActionForm
      action={add}
      pending="Adding member..."
      success="Member added"
      error="Failed to add member"
    >
      <input type="hidden" name="team_title" value={teamTitle} />
      <input type="hidden" name="existing" value={(existing || []).join(",")} />
      <div className="flex-1 space-y-2">
        <label className="text-xs font-medium text-foreground/70 tracking-wide uppercase">
          Add Member
        </label>
        <Select name="member">
          <SelectTrigger className="h-11 rounded-xl border-2 border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-200 hover:border-border/60 focus:border-accent/50">
            <SelectValue placeholder="Select member to add" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2 border-border bg-background backdrop-blur-md">
            {options.map((u) => (
              <SelectItem key={u} value={u} className="rounded-lg">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-11 px-4 rounded-xl border-2 border-accent/80 text-foreground hover:text-accent-foreground hover:bg-accent hover:border-accent transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 gap-2 bg-transparent"
      >
        <UserPlus className="h-4 w-4" />
        Add
      </Button>
    </TeamActionForm>
  );
}

function ManualRequestItem({ request, collectionId, profile, memberProfiles = [] }) {
  async function toggleProcessed() {
    "use server";
    await adminProcessTeamRequest(request.id, !request.processed);
    revalidatePath(`/admin/team-collection/${collectionId}`);
  }
  async function approveDirect() {
    "use server";
    await adminProcessTeamRequest(request.id, true, true);
    revalidatePath(`/admin/team-collection/${collectionId}`);
  }

  const otherMembers = (memberProfiles || [])
    .filter((m) => String(m?.vjudge_id || "") !== String(request?.vjudge_id || ""))
    .slice(0, 2);

  return (
    <div className="rounded-xl  border border-border/50 p-2 bg-muted/10 space-y-3">
      <div className="rounded-lg p-3 bg-background/60 space-y-2">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-center text-xl font-bold">{request.proposed_team_title || "—"}</h2>
          <span className="text-xs text-muted-foreground truncate">{new Date(request.created_at).toLocaleString()}</span>
          <Badge
            variant={request?.processed ? "default" : "outline"}
            className={request?.processed ? "bg-green-100 text-green-800 border-green-200" : ""}
          >
            {request?.processed ? "Approved" : "Not Approved"}
          </Badge>
        </div>

        <div className="pt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
              {profile?.profile_pic ? (
                <Image
                  src={profile.profile_pic}
                  alt={profile?.full_name || request.vjudge_id || "Requester"}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">N/A</span>
              )}
            </div>
            <div className="text-sm leading-tight min-w-0">
              <div className="font-medium truncate">{profile?.full_name || request.vjudge_id || "unknown"}</div>
              <div className="text-xs text-muted-foreground truncate">{profile?.batch_name || "-"}</div>
            </div>
          </div>
        </div>

        <div className="pt-1 border-t-2 border-border/50">
          {otherMembers.length > 0 ? (
            <div className="space-y-2">
              {otherMembers.map((m, idx) => (
                <div
                  key={`${request.id}_${m.vjudge_id || idx}`}
                  className="rounded-md border-b border-border/40 p-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                      {m?.profile_pic ? (
                        <Image
                          src={m.profile_pic}
                          alt={m?.full_name || m?.vjudge_id || "Member"}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">N/A</span>
                      )}
                    </div>
                    <div className="text-sm leading-tight min-w-0">
                      <div className="font-medium truncate">{m?.full_name || m?.vjudge_id || "-"}</div>
                      <div className="text-xs text-muted-foreground truncate">{m?.batch_name || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No other members listed.</div>
          )}
        </div>

        <div className="pt-1 border-t border-border/40 text-sm text-muted-foreground whitespace-pre-line">
          {/* <span className="text-foreground/80">Reason:</span>{" "} */}
          {request.note || "No reason provided."}
        </div>
      </div>

      <div className="flex gap-2 pt-1 items-center justify-center">
        <form action={toggleProcessed}>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg text-xs font-medium border border-black bg-black text-white hover:bg-black/90 transition-colors"
          >
            {request.processed ? "Mark Unprocessed" : "Mark Processed"}
          </button>
        </form>
        <form action={approveDirect}>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg text-xs font-medium border border-black bg-black text-white hover:bg-black/90 transition-colors"
          >
            Approve Team
          </button>
        </form>
      </div>
    </div>
  );
}
