import {
  adminApproveManualTeam,
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
import ProgressLink from "@/components/ProgressLink";
import { TeamActionForm } from "@/components/TeamActionForm";
import TeamCardActionsInline from "@/components/TeamCardActionsInline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { get_with_token } from "@/lib/action";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FastForward,
  FileText,
  LinkIcon,
  Plus,
  Settings,
  Users,
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
      finalizedScoreByTitle.set(String(t.team_title).toLowerCase(), score);
  }
  const getTeamScore = (team) => {
    const byId = team?.id != null ? finalizedScoreById.get(String(team.id)) : null;
    if (typeof byId === "number") return byId;
    if (!team?.team_title) return null;
    const byTitle = finalizedScoreByTitle.get(String(team.team_title).toLowerCase());
    return typeof byTitle === "number" ? byTitle : null;
  };
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
    "manual-creation",
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
    manualCreation: manualTeams?.length || 0,
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

  async function approve(formData) {
    "use server";
    const title = formData.get("team_title");
    const members = (formData.get("members") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await adminApproveManualTeam(id, title, members);
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
              href={`/admin/team-collection/${id}?section=manual-creation`}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeSection === "manual-creation"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Team creation(Admin){tabCounts.manualCreation ? ` (${tabCounts.manualCreation})` : ""}
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
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-accent" />
                Submissions
                <Badge variant="secondary" className="ml-auto">
                  {choices?.length || 0} submissions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {choices?.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-4 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-foreground">
                        {ch.full_name || ch.vjudge_id}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ch.team_title}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Choices:</span>{" "}
                      {Array.isArray(ch.ordered_choices)
                        ? ch.ordered_choices.join(", ")
                        : "None"}
                    </div>
                  </div>
                ))}
                {!choices?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions received yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "auto-preview" && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-5 w-5 text-accent" />
                Auto-Generated Preview
                <Badge variant="secondary" className="ml-auto">
                  {autoTeams.length} teams
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {autoTeams.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-muted/20 border border-border/50"
                  >
                    <h3 className="font-semibold mb-2">{t.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {t.members.map((member) => (
                        <Badge
                          key={member}
                          variant="outline"
                          className="px-3 py-1"
                        >
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {!autoTeams.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No auto teams can be formed with current submissions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "manual-requests" && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-accent" />
                Manual Team Requests
                <Badge variant="secondary" className="ml-auto">
                  {teamRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {teamRequests.map((req) => (
                <ManualRequestItem key={req.id} request={req} collectionId={id} />
              ))}
              {!teamRequests.length && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No manual requests submitted.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "manual-creation" && (
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                Create Team Manually
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <TeamActionForm
                action={approve}
                pending="Creating team..."
                success="Team created"
                error="Failed to create team"
                resetOnSuccess={true}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80 tracking-wide">
                      Team Name
                    </label>
                    <Input
                      name="team_title"
                      placeholder="Enter team name"
                      className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-accent/50 focus:shadow-lg focus:shadow-accent/10 hover:border-border/70 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80 tracking-wide">
                      Team Members
                    </label>
                    <Input
                      name="members"
                      placeholder="Comma-separated member IDs"
                      className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-accent/50 focus:shadow-lg focus:shadow-accent/10 hover:border-border/70 text-base"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    className="h-12 px-8 rounded-2xl bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 shadow-lg shadow-accent/20 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] gap-3 text-base font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Create Team
                  </Button>
                </div>
              </TeamActionForm>
            </CardContent>
          </Card>
        )}

        {activeSection === "participants" && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-accent" />
                Participants
                <Badge variant="secondary" className="ml-auto">
                  {rankOrder?.length || 0} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {rankOrder?.map((u, i) => (
                  <div
                    key={u}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-sm font-mono font-semibold text-accent">
                        {i + 1}
                      </span>
                    </div>
                    <span className="truncate font-medium" title={u}>
                      {u}
                    </span>
                  </div>
                ))}
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

function ManualRequestItem({ request, collectionId }) {
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
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-accent/10 text-accent">
              {new Date(request.created_at).toLocaleString()}
            </span>
            {request.processed && (
              <span className="px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700 border border-green-300">
                Processed
              </span>
            )}
          </div>
          <div className="text-sm font-medium">
            From: {request.vjudge_id || "unknown"}
          </div>
          <div className="text-sm">
            Proposed Title:{" "}
            <span className="font-semibold">
              {request.proposed_team_title || "—"}
            </span>
          </div>
          <div className="text-sm">
            Members:{" "}
            {Array.isArray(request.desired_member_vjudge_ids)
              ? request.desired_member_vjudge_ids.join(", ")
              : ""}
          </div>
          {request.note && (
            <div className="text-xs text-muted-foreground whitespace-pre-line border-l-2 border-accent/40 pl-3">
              {request.note}
            </div>
          )}
        </div>
        <div className="flex gap-2 md:flex-col">
          <form action={toggleProcessed}>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-xs font-medium border bg-background hover:bg-muted/40"
            >
              {request.processed ? "Mark Unprocessed" : "Mark Processed"}
            </button>
          </form>
          <form action={approveDirect}>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-xs font-medium border bg-accent text-accent-foreground hover:opacity-90"
            >
              Approve & Create Team
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
