import {
  getAllContestRoomContests,
  getAllContestRooms,
} from "@/actions/contest_details";
import {
  adminCopyTeamCollection,
  adminDeleteTeamCollection,
  adminFinalizeTeamCollection,
  adminGetCollectionDetail,
  adminListTeamCollections,
  adminRenameTeamCollection,
  adminReopenTeamCollection,
  adminSetPhase1Deadline,
  adminStartPhase2,
  adminStartTeamCollection,
  adminStopTeamCollection,
  adminUnfinalizeTeamCollection,
} from "@/actions/team_collection";
import { CollectionCopyButton } from "@/components/CollectionCopyButton";
import { CollectionNameEditor } from "@/components/CollectionNameEditor";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { TeamActionForm } from "@/components/TeamActionForm";
import { TeamCollectionTabPanels } from "@/components/TeamCollectionTabPanels";
import TransitionButton from "@/components/TransitionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { get_with_token } from "@/lib/action";
import {
  CheckCircle,
  Clock,
  Eye,
  FastForward,
  Play,
  Square,
  Trash2,
  Unlock,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
  // Admin guard (server-side)
  const cookieStore = await cookies();
  if (!cookieStore.get("token")) redirect("/login");
  const user = await get_with_token("auth/user/profile");
  if (user?.result?.length === 0) redirect("/login");
  if (user?.result?.[0]?.admin === false) redirect("/");

  const resolvedSearchParams = await searchParams;
  const initialTab = ["collecting", "finalized", "start"].includes(
    resolvedSearchParams?.tab
  )
    ? resolvedSearchParams?.tab
    : "collecting";

  const [roomsRes, collectionsRes, roomContestsRes] = await Promise.all([
    getAllContestRooms(),
    adminListTeamCollections(),
    getAllContestRoomContests(),
  ]);
  const rooms = roomsRes?.result || [];
  const collections = collectionsRes?.result || [];
  const roomContests = roomContestsRes?.result || [];

  const collectingCollections = collections.filter((col) => !col.finalized);
  const finalizedCollections = collections.filter((col) => col.finalized);

  const safeRoomId = (obj) =>
    obj?.room_id ??
    obj?.roomId ??
    obj?.room ??
    obj?.roomID ??
    obj?.id ??
    obj?.["Room ID"];

  const latestCollectionByRoom = collections.reduce((acc, col) => {
    const setLatest = (key) => {
      if (!key) return;
      const current = acc.get(key);
      const currentTime = current
        ? new Date(
            current.updated_at || current.updatedAt || current.created_at || 0
          ).getTime()
        : -1;
      const nextTime = new Date(
        col.updated_at || col.updatedAt || col.created_at || 0
      ).getTime();
      if (!current || nextTime >= currentTime) {
        acc.set(key, col);
      }
    };

    const rid = safeRoomId(col);
    if (rid != null) setLatest(`id:${String(rid)}`);
    setLatest(`name:${String(col?.room_name || "")}`);
    return acc;
  }, new Map());

  const contestsPerRoom = roomContests.reduce((acc, contest) => {
    const rid = safeRoomId(contest);
    if (rid != null) {
      acc.set(String(rid), (acc.get(String(rid)) || 0) + 1);
    }
    return acc;
  }, new Map());

  const latestCollectionIds = Array.from(
    new Set(
      Array.from(latestCollectionByRoom.values())
        .map((c) => c?.id)
        .filter(Boolean)
        .map(String)
    )
  );

  const participantCountByCollectionId = new Map();
  const missingParticipantCountCollectionIds = [];

  for (const collectionId of latestCollectionIds) {
    const col = collections.find((c) => String(c?.id) === collectionId);
    const countFromCollection =
      col?.participant_count ??
      col?.participants_count ??
      col?.total_participants ??
      col?.participants ??
      col?.users_count;

    if (Number.isFinite(countFromCollection)) {
      participantCountByCollectionId.set(collectionId, countFromCollection);
    } else {
      missingParticipantCountCollectionIds.push(collectionId);
    }
  }

  await Promise.all(
    missingParticipantCountCollectionIds.map(async (collectionId) => {
      try {
        const detail = await adminGetCollectionDetail(collectionId);
        const rankOrder = detail?.result?.rankOrder;
        const choices = detail?.result?.choices;

        if (Array.isArray(rankOrder) && rankOrder.length > 0) {
          participantCountByCollectionId.set(collectionId, rankOrder.length);
          return;
        }

        if (Array.isArray(choices) && choices.length > 0) {
          const uniqueParticipants = new Set(
            choices
              .map((ch) => String(ch?.vjudge_id || ch?.user_vjudge_id || ""))
              .filter(Boolean)
          );
          participantCountByCollectionId.set(
            collectionId,
            uniqueParticipants.size
          );
          return;
        }

        participantCountByCollectionId.set(collectionId, null);
      } catch {
        participantCountByCollectionId.set(collectionId, null);
      }
    })
  );

  async function start(formData) {
    "use server";
    const room_id = formData.get("room_id");
    const title = formData.get("title");
    await adminStartTeamCollection(room_id, title || "");
    revalidatePath("/admin/team-collection");
  }
  async function stop(formData) {
    "use server";
    const id = formData.get("id");
    await adminStopTeamCollection(id);
    revalidatePath("/admin/team-collection");
  }
  async function reopen(formData) {
    "use server";
    const id = formData.get("id");
    await adminReopenTeamCollection(id);
    revalidatePath("/admin/team-collection");
  }
  async function finalize(formData) {
    "use server";
    const id = formData.get("id");
    await adminFinalizeTeamCollection(id);
    revalidatePath("/admin/team-collection");
  }
  async function unfinalize(formData) {
    "use server";
    const id = formData.get("id");
    await adminUnfinalizeTeamCollection(id);
    revalidatePath("/admin/team-collection");
  }
  async function del(formData) {
    "use server";
    const id = formData.get("id");
    await adminDeleteTeamCollection(id);
    revalidatePath("/admin/team-collection");
  }
  async function setDeadline(formData) {
    "use server";
    const id = formData.get("id");
    const deadline = formData.get("phase1_deadline");
    await adminSetPhase1Deadline(id, deadline || null);
    revalidatePath("/admin/team-collection");
  }
  async function startPhase2(formData) {
    "use server";
    const id = formData.get("id");
    await adminStartPhase2(id);
    revalidatePath("/admin/team-collection");
  }
  async function renameCollection(formData) {
    "use server";
    const id = formData.get("id");
    const title = formData.get("title") || "";
    await adminRenameTeamCollection(id, String(title));
    revalidatePath("/admin/team-collection");
  }
  async function copyCollection(formData) {
    "use server";
    const id = formData.get("collection_id") || formData.get("id");
    const title = formData.get("title") || "";
    const res = await adminCopyTeamCollection(id, String(title));
    if (res?.error) {
      throw new Error(res.error || "Copy failed");
    }
    revalidatePath("/admin/team-collection");
  }

  function renderCollectionsPanel(panelTab, panelCollections) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-muted-foreground p-2 font-medium text-center">
            {panelTab === "collecting"
              ? "Manage team collections in progress"
              : "Review completed team collections"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {panelCollections.map((col) => (
            <div
              key={col.id}
              className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-lg transition-all duration-300 ease-out"
            >
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
                      href={`/admin/team-collection/${col.id}`}
                    >
                      {col.title || col.collection_name || "Untitled Collection"}
                    </Link>
                    <div className="flex items-center gap-2">
                      <CollectionNameEditor
                        id={col.id}
                        name={col.title ?? col.collection_name ?? ""}
                        renameAction={renameCollection}
                      />
                      <CollectionCopyButton
                        id={col.id}
                        defaultName={col.title ?? col.collection_name ?? ""}
                        copyAction={copyCollection}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">
                      Room:
                    </span>
                    <span className="text-sm text-foreground font-semibold">
                      {col.room_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border/60 font-mono">
                      Phase {col.phase || 1}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          col.finalized
                            ? "bg-chart-2"
                            : col.is_open
                            ? "bg-chart-1"
                            : "bg-muted-foreground"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-foreground">
                        {col.finalized
                          ? "Finalized"
                          : col.is_open
                          ? "Collecting"
                          : "Closed"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        Share:
                      </span>
                      <Link
                        className="text-sm text-primary hover:text-primary/80 font-mono bg-muted px-3 py-1 rounded-lg hover:bg-muted/80 transition-colors duration-200"
                        href={`/team/${col.token}`}
                      >
                        /team/{col.token}
                      </Link>
                    </div>
                  </div>

                  {!col.finalized && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {col.phase === 1 && (
                          <>
                            <span className="font-medium">
                              Participation Deadline:
                            </span>
                            {col.phase1_deadline ? (
                              <DeadlineCountdown iso={col.phase1_deadline} />
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </>
                        )}
                        {col.phase === 2 && (
                          <span className="text-green-600 font-medium">
                            Phase 2 (Team Selection) Active
                          </span>
                        )}
                      </div>

                      {col.phase === 1 && (
                        <div className="flex flex-col gap-3">
                          <TeamActionForm
                            action={setDeadline}
                            pending="Saving..."
                            success="Deadline set"
                            error="Failed"
                          >
                            <input type="hidden" name="id" value={col.id} />
                            <div className="flex items-center gap-2">
                              <input
                                type="datetime-local"
                                name="phase1_deadline"
                                defaultValue={
                                  col.phase1_deadline
                                    ? formatLocalDateTime(col.phase1_deadline)
                                    : ""
                                }
                                className="px-3 py-2 rounded-md border border-border bg-background/60 text-sm w-full"
                              />
                              <button className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80 text-xs font-semibold whitespace-nowrap">
                                Set / Update
                              </button>
                            </div>
                          </TeamActionForm>
                          <TeamActionForm
                            action={startPhase2}
                            pending="Starting..."
                            success="Phase 2 started"
                            error="Failed to start"
                          >
                            <input type="hidden" name="id" value={col.id} />
                            <button className="px-4 py-2 rounded-md bg-accent hover:bg-accent/30 text-foreground text-xs font-semibold flex items-center gap-1 w-fit">
                              <FastForward className="w-4 h-4" /> Start Phase 2
                              Now
                            </button>
                          </TeamActionForm>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/70">
                  <TransitionButton
                    href={`/admin/team-collection/${col.id}`}
                    idleText="Details"
                    pendingText="Opening details..."
                    icon={<Eye className="w-4 h-4" />}
                    className="px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold transition-colors duration-200"
                  />

                  {!col.finalized &&
                    (col.is_open ? (
                      <TeamActionForm
                        action={stop}
                        pending="Stopping..."
                        success="Collection stopped"
                        error="Failed to stop"
                      >
                        <input type="hidden" name="id" value={col.id} />
                        <button className="px-4 py-2 rounded-md bg-chart-5/20 hover:bg-chart-5/30 text-chart-5 text-sm font-semibold transition-colors duration-200 flex items-center gap-2">
                          <Square className="w-4 h-4" />
                          Stop
                        </button>
                      </TeamActionForm>
                    ) : (
                      <TeamActionForm
                        action={reopen}
                        pending="Reopening..."
                        success="Collection reopened"
                        error="Failed to reopen"
                      >
                        <input type="hidden" name="id" value={col.id} />
                        <button className="px-4 py-2 rounded-md bg-chart-1/20 hover:bg-chart-1/30 text-chart-1 text-sm font-semibold transition-colors duration-200 flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Reopen
                        </button>
                      </TeamActionForm>
                    ))}

                  {!col.finalized && (
                    <TeamActionForm
                      action={finalize}
                      pending="Finalizing..."
                      success="Collection finalized"
                      error="Failed to finalize"
                    >
                      <input type="hidden" name="id" value={col.id} />
                      <button className="px-4 py-2 rounded-md bg-chart-2/20 hover:bg-chart-2/30 text-chart-2 text-sm font-semibold transition-colors duration-200 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Finalize
                      </button>
                    </TeamActionForm>
                  )}

                  {col.finalized && (
                    <TeamActionForm
                      action={unfinalize}
                      pending="Unfinalizing..."
                      success="Collection unfinalized"
                      error="Failed to unfinalize"
                    >
                      <input type="hidden" name="id" value={col.id} />
                      <button className="px-4 py-2 rounded-md bg-chart-5/20 hover:bg-chart-5/30 text-chart-5 text-sm font-semibold transition-colors duration-200 flex items-center gap-2">
                        <Unlock className="w-4 h-4" />
                        Unfinalize
                      </button>
                    </TeamActionForm>
                  )}

                  <TeamActionForm
                    action={del}
                    pending="Deleting..."
                    success="Collection deleted"
                    error="Failed to delete"
                    confirmConfig={{
                      title: "Delete collection?",
                      description:
                        "This will permanently remove the collection and cannot be undone.",
                      confirmText: "Yes, delete",
                      cancelText: "Cancel",
                      confirmVariant: "destructive",
                    }}
                  >
                    <input type="hidden" name="id" value={col.id} />
                    <button className="px-4 py-2 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-semibold transition-colors duration-200 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </TeamActionForm>
                </div>
              </div>
            </div>
          ))}

          {panelCollections.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-16 text-center md:col-span-2">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {panelTab === "collecting"
                    ? "No collecting collections"
                    : "No finalized collections"}
                </h3>
                <p className="text-muted-foreground font-medium">
                  {panelTab === "collecting"
                    ? "Start a new collection from the Start tab"
                    : "Finalize a collection to see it here"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const startPanel = (
    <div className="space-y-2">
      <div>
        <p className="text-muted-foreground p-2 font-medium text-center">
          Begin collecting teams for contest rooms
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No contest rooms available
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full rounded-md border">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {rooms.map((r) => {
              const rid = safeRoomId(r);
              const roomKey =
                rid != null
                  ? `id:${String(rid)}`
                  : `name:${r?.room_name || r?.["Room Name"] || ""}`;
              const latestCol = latestCollectionByRoom.get(roomKey);
              const contestsFromMap =
                rid != null ? contestsPerRoom.get(String(rid)) : undefined;
              const contestsFromRoom =
                r?.contest_count ?? r?.contests_count ?? r?.contests;
              const totalContests = contestsFromMap ?? contestsFromRoom ?? null;

              const participantsFromCollection =
                (latestCol?.id
                  ? participantCountByCollectionId.get(String(latestCol.id))
                  : null) ??
                latestCol?.participant_count ??
                latestCol?.participants_count ??
                latestCol?.total_participants ??
                latestCol?.participants ??
                latestCol?.users_count;
              const participantsFromRoom =
                r?.participant_count ??
                r?.participants_count ??
                r?.participants ??
                r?.users_count;
              const totalParticipants =
                participantsFromCollection ?? participantsFromRoom ?? null;

              const lastUpdatedRaw =
                latestCol?.updated_at ??
                latestCol?.updatedAt ??
                latestCol?.created_at ??
                r?.updated_at ??
                r?.Updated_at ??
                r?.created_at;
              const lastUpdated = lastUpdatedRaw
                ? new Date(lastUpdatedRaw).toLocaleString()
                : "N/A";

              return (
                <TeamActionForm
                  action={start}
                  key={r.id}
                  pending="Transitioning..."
                  success="Moved to In Progress"
                  error="Failed to start"
                  redirectTo="/admin/team-collection?tab=collecting"
                >
                  <input type="hidden" name="room_id" value={r.id} />
                  <input type="hidden" name="title" value={r["Room Name"]} />

                  <Card className="flex h-full flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 leading-snug">
                        {r["Room Name"]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">
                          Total Contests: {totalContests ?? "N/A"}
                        </Badge>
                        <Badge variant="outline">
                          Total Participants: {totalParticipants ?? "N/A"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last Updated: {lastUpdated}
                      </div>
                      <div className="mt-auto">
                        <Button type="submit" className="w-full">
                          <Play className="w-4 h-4" />
                          Start collection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TeamActionForm>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl text-center mx-auto px-8 py-2">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Team Collection Admin
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage team collections and contest rooms
          </p>
        </div>
      </div>

      <div className="mx-auto px-12 lg:px-16 py-2 space-y-8">
        <section className="item-center">
          <TeamCollectionTabPanels
            initialTab={initialTab}
            collectingCount={collectingCollections.length}
            finalizedCount={finalizedCollections.length}
            startCount={rooms.length}
            collectingPanel={renderCollectionsPanel(
              "collecting",
              collectingCollections
            )}
            finalizedPanel={renderCollectionsPanel("finalized", finalizedCollections)}
            startPanel={startPanel}
          />
        </section>
      </div>
    </div>
  );
}

// Format to local datetime-local input value (YYYY-MM-DDTHH:MM) without timezone shift
function formatLocalDateTime(isoOrDate) {
  try {
    const d = new Date(isoOrDate);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}
