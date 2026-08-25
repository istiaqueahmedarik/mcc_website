"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ApiClientError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressLink from "@/components/ProgressLink";
import CreateClassroomWizard from "@/components/CreateClassroomWizard";
import DiscordConnectionRequiredCard from "@/components/DiscordConnectionRequiredCard";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Layers,
  MoreHorizontal,
  Plus,
  Radio,
  ShieldCheck,
  UserCircle,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTour } from "@/hooks/useTour";

const trainerDashboardSteps = [
  {
    popover: {
      title: "👋 Welcome, Trainer!",
      description: "This is your Trainer Dashboard — your operations hub for managing classrooms, live sessions, forms, and students. Let's take a quick look around!",
      side: "center",
      align: "center",
    },
  },
  {
    element: "#trainer-tour-header",
    popover: {
      title: "🏠 Dashboard Overview",
      description: "The header area shows your role and gives you quick access to all trainer actions. Your top-level tools live right here.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-new-classroom-btn",
    popover: {
      title: "➕ Create a Classroom",
      description: "Click here to set up a new classroom. Give it a name and description — this becomes your space to add topics, assign problems, and manage students.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#trainer-tour-form-btn",
    popover: {
      title: "📋 Form Creator",
      description: "Build custom forms for registrations, surveys, or student submissions. Forms can be shared with students and have open/closed toggles.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-live-section",
    popover: {
      title: "🔴 Live Sessions Panel",
      description: "When a class session is running, it appears here with a live badge and a 'Join Live' button. You can jump directly into any active room.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#trainer-tour-classroom-grid",
    popover: {
      title: "📚 Classroom Workspace",
      description: "All your classrooms are shown as cards here. Each card shows the classroom name, description, trainer, and a status badge (Ready or Live).",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#trainer-tour-classroom-card",
    popover: {
      title: "🗂️ Classroom Card",
      description: "Each card shows trainer initials, topic status, and creation date. Click 'Enter Classroom' to open the live interactive room with all tabs and tools.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-all-classrooms",
    popover: {
      title: "📋 View All Classrooms",
      description: "Need to see more? Click here to browse the full classroom list page with search and filter options.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#trainer-tour-take-tour-btn",
    popover: {
      title: "❓ Take Tour Button",
      description: "This button is always here for you. Click it at any time to re-launch this tour from the beginning — no need to clear your history.",
      side: "top",
      align: "end",
    },
  },
  {
    popover: {
      title: "🎉 You're Ready to Teach!",
      description: "You now know the basics of your Trainer Dashboard. Start by creating a classroom, then open it to schedule sessions and assign topic modules to students.",
      side: "center",
      align: "center",
    },
  },
];

const dashboardQueryKeys = {
  profile: ["trainer", "profile"],
  classrooms: ["trainer", "classrooms"],
  allTrainers: ["trainer", "all-trainers"],
  substitutes: (classroomId) => ["trainer", "classrooms", classroomId, "substitutes"],
};

async function fetchTrainerProfile() {
  const res = await apiGet("auth/user/profile");
  return res?.result?.[0] || null;
}

async function fetchClassrooms() {
  const res = await apiGet("classroom/list");
  return res?.result || [];
}

async function fetchSubstitutes(classroomId) {
  const res = await apiGet(`classroom/${classroomId}/substitutes`);
  return res?.result || [];
}

async function fetchAllTrainers() {
  const res = await apiGet("classroom/admin/trainers-list");
  return res?.result || [];
}

export default function TrainerDashboardClient() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Substitute trainer management state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalClassroom, setSubModalClassroom] = useState(null);
  const [subSearch, setSubSearch] = useState("");
  const [subError, setSubError] = useState("");

  const profileQuery = useQuery({
    queryKey: dashboardQueryKeys.profile,
    queryFn: fetchTrainerProfile,
  });
  const classroomsQuery = useQuery({
    queryKey: dashboardQueryKeys.classrooms,
    queryFn: fetchClassrooms,
  });
  const substitutesQuery = useQuery({
    queryKey: dashboardQueryKeys.substitutes(subModalClassroom?.id),
    queryFn: () => fetchSubstitutes(subModalClassroom.id),
    enabled: subModalOpen && Boolean(subModalClassroom?.id),
  });
  const allTrainersQuery = useQuery({
    queryKey: dashboardQueryKeys.allTrainers,
    queryFn: fetchAllTrainers,
    enabled: subModalOpen,
  });

  const addSubstituteMutation = useMutation({
    mutationFn: async ({ classroomId, trainerId }) => {
      const res = await apiPost(`classroom/${classroomId}/substitutes`, { trainerId });
      if (!res?.message && !res?.success) {
        throw new Error(res?.error || "Failed to add substitute");
      }
      return res;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.substitutes(variables.classroomId),
      });
    },
  });

  const removeSubstituteMutation = useMutation({
    mutationFn: async ({ classroomId, trainerId }) => {
      const res = await apiDelete(`classroom/${classroomId}/substitutes/${trainerId}`);
      if (!res?.message && !res?.success) {
        throw new Error(res?.error || "Failed to remove substitute");
      }
      return res;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.substitutes(variables.classroomId),
      });
    },
  });

  const profile = profileQuery.data;
  const classrooms = classroomsQuery.data || [];
  const substitutes = substitutesQuery.data || [];
  const allTrainers = allTrainersQuery.data || [];
  const loading = profileQuery.isLoading || classroomsQuery.isLoading;
  const subLoading = substitutesQuery.isLoading || allTrainersQuery.isLoading;
  const discordLinkRequired = classroomsQuery.error instanceof ApiClientError
    && classroomsQuery.error.data?.code === "DISCORD_LINK_REQUIRED";

  const { startTour } = useTour({
    storageKey: "mcc_trainer_dashboard_toured",
    steps: trainerDashboardSteps,
    autoStart: !loading,
  });

  const openSubModal = (classroom) => {
    setSubModalClassroom(classroom);
    setSubError("");
    setSubSearch("");
    setSubModalOpen(true);
  };

  const handleAddSub = async (trainerId) => {
    setSubError("");
    try {
      await addSubstituteMutation.mutateAsync({
        classroomId: subModalClassroom.id,
        trainerId,
      });
    } catch (mutationError) {
      setSubError(mutationError?.message || "Failed to add substitute");
    }
  };

  const handleRemoveSub = async (trainerId) => {
    setSubError("");
    try {
      await removeSubstituteMutation.mutateAsync({
        classroomId: subModalClassroom.id,
        trainerId,
      });
    } catch (mutationError) {
      setSubError(mutationError?.message || "Failed to remove substitute");
    }
  };

  const liveClassrooms = classrooms.filter((c) => c.live_url);
  const totalLive = liveClassrooms.length;
  const quietClassrooms = classrooms.length - totalLive;
  const roleLabel = profile?.admin ? "Admin + Trainer" : "Trainer";
  const railActions = [
    ...(profile?.admin
      ? [
          {
            label: "Admin tools",
            icon: ShieldCheck,
            href: "/admin/trainers",
          },
        ]
      : []),
    {
      label: "New classroom",
      icon: Plus,
      onClick: () => setModalOpen(true),
      id: "trainer-tour-new-classroom-btn",
    },
    {
      label: "Forms",
      icon: ClipboardList,
      href: "/trainer/forms",
      id: "trainer-tour-form-btn",
    },
    {
      label: "All classrooms",
      icon: BookOpen,
      href: "/classroom/list",
      id: "trainer-tour-all-classrooms",
    },
    ...(!profile?.admin
      ? [
          {
            label: "Trainer profile",
            icon: UserCircle,
            href: "/trainer/profile",
          },
        ]
      : []),
  ];

  const summaryCards = [
    {
      label: "Classrooms",
      value: classrooms.length,
      detail: `${quietClassrooms} ready`,
      icon: BookOpen,
      tone: "text-sky-300",
    },
    {
      label: "Live now",
      value: totalLive,
      detail: totalLive ? "Instructor action" : "No live room",
      icon: Radio,
      tone: "text-red-300",
    },
    {
      label: "Role",
      value: roleLabel,
      detail: profile?.admin ? "Trainer controls unlocked" : "Trainer access",
      icon: ShieldCheck,
      tone: "text-emerald-300",
    },
    {
      label: "Forms",
      value: "Builder",
      detail: "Create and manage",
      icon: ClipboardList,
      tone: "text-cyan-300",
    },
  ];

  const initialsOf = (name) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");

  return (
    <div className="trainer-page trainer-dashboard-page relative">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section id="trainer-tour-header" className="space-y-4 pb-2">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Trainer dashboard</p>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
                Learning operations
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Open the right room, prepare the next class, or build a form.
              </p>
            </div>

            <div className="flex items-start justify-start lg:justify-end">
              <TrainerActionRail actions={railActions} />
              <CreateClassroomWizard
                open={modalOpen}
                onOpenChange={setModalOpen}
                onCreated={() => queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.classrooms })}
              />
            </div>
          </div>

          <div className="trainer-panel grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((item, index) => (
              <DashboardMetric key={item.label} item={item} index={index} />
            ))}
          </div>
        </section>

        {discordLinkRequired ? (
          <DiscordConnectionRequiredCard />
        ) : (
          <>
        {totalLive > 0 && (
          <section id="trainer-tour-live-section" className="trainer-panel overflow-hidden border-red-500/25">
            <div className="flex flex-col gap-2 border-b border-red-500/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-red-300">Live sessions</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {totalLive} active room{totalLive === 1 ? "" : "s"} ready to join
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-red-500/10">
              {liveClassrooms.map((c) => (
                <div key={c.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{c.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">{c.trainer_name || "Trainer"}</p>
                  </div>
                  <ProgressLink href={`/classroom/live/${c.id}`}>
                    <Button size="sm" className="w-full gap-2 bg-red-600 text-white hover:bg-red-700 sm:w-auto">
                      <Video className="h-4 w-4" />
                      Join live
                    </Button>
                  </ProgressLink>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="trainer-tour-classroom-grid" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Classrooms</h2>
              <p className="text-sm text-muted-foreground">Open a room or prep the next session.</p>
            </div>
            <ProgressLink
              id="trainer-tour-all-classrooms"
              href="/classroom/list"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              All classrooms
              <ArrowRight className="h-4 w-4" />
            </ProgressLink>
          </div>

          {loading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="trainer-panel p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-8 w-8 rounded bg-muted" />
                    </div>
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-9 w-full rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : classrooms.length === 0 ? (
            <div className="trainer-empty">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-muted">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-3 text-base font-semibold">No classrooms yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Create the first classroom to start trainer operations.
              </p>
              <Button onClick={() => setModalOpen(true)} size="sm" className="mt-4 gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create classroom
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {classrooms.map((classroom, idx) => {
                const isLive = !!classroom.live_url;
                const isOwner = classroom.is_owner;
                const isSubstitute = classroom.is_substitute;
                const canManageSubs = isOwner || profile?.admin;
                return (
                  <article
                    key={classroom.id}
                    id={idx === 0 ? "trainer-tour-classroom-card" : undefined}
                    className={`trainer-panel group p-4 hover:border-foreground/20 ${
                      isLive ? "border-red-500/40" : ""
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <StatusPill
                            icon={isLive ? Radio : BookOpen}
                            label={isLive ? "Live" : "Ready"}
                            live={isLive}
                          />
                          {isOwner && (
                            <StatusPill icon={ShieldCheck} label="Owner" tone="sky" />
                          )}
                          {isSubstitute && !isOwner && (
                            <StatusPill icon={UserCheck} label="Co-trainer" tone="amber" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">{classroom.name}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {classroom.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <span className="trainer-icon-tile hidden h-9 w-9 text-xs font-semibold sm:grid">
                        {initialsOf(classroom.trainer_name) || "?"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{classroom.trainer_name || "Trainer"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{new Date(classroom.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <ProgressLink href={`/classroom/live/${classroom.id}`} className="min-w-0 flex-1 sm:flex-none">
                          <Button
                            size="sm"
                            className={`w-full justify-between gap-2 font-semibold sm:w-auto ${
                              isLive ? "bg-red-600 text-white hover:bg-red-700" : ""
                            }`}
                          >
                            <span>{isLive ? "Manage live" : "Enter"}</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Button>
                        </ProgressLink>
                        {canManageSubs && (
                          <Button
                            variant="outline"
                            size="icon"
                            title="Manage substitute trainers"
                            aria-label={`Manage substitute trainers for ${classroom.name}`}
                            onClick={() => openSubModal(classroom)}
                            className="h-9 w-9 shrink-0"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}
      </main>

      <button
        id="trainer-tour-take-tour-btn"
        onClick={startTour}
        className="trainer-floating-help fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted"
        title="Re-launch onboarding tour"
        aria-label="Re-launch onboarding tour"
      >
        <HelpCircle className="h-4 w-4 text-primary" />
      </button>

      <Dialog
        open={subModalOpen}
        onOpenChange={(open) => {
          setSubModalOpen(open);
          if (!open) setSubError("");
        }}
      >
        <DialogContent className="trainer-command-bar gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle className="text-base tracking-normal">Substitute trainers</DialogTitle>
            <DialogDescription>{subModalClassroom?.name}</DialogDescription>
          </DialogHeader>

          <div className="p-5">
              {subError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {subError}
                </div>
              )}

              {subLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  {/* Current substitutes */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Current co-trainers</p>
                    {substitutes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No substitute trainers assigned yet.</p>
                    ) : (
                      <ul className="trainer-panel-soft divide-y">
                        {substitutes.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{s.full_name}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveSub(s.id)}
                              disabled={removeSubstituteMutation.isPending}
                              className="grid h-9 w-9 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
                              title="Remove substitute"
                              aria-label={`Remove ${s.full_name} as substitute trainer`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Add new substitute */}
                  <div>
                    <label htmlFor="substitute-trainer-search" className="mb-2 block text-xs font-semibold text-muted-foreground">Add substitute</label>
                    <Input
                      id="substitute-trainer-search"
                      placeholder="Search trainers by name or email…"
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      className="mb-2 h-10 text-base md:text-sm"
                    />
                    <ul className="trainer-panel-soft max-h-48 divide-y overflow-y-auto">
                      {allTrainers
                        .filter(
                          (t) =>
                            !substitutes.some((s) => s.id === t.id) &&
                            t.id !== subModalClassroom?.created_by &&
                            (subSearch === "" ||
                              t.full_name?.toLowerCase().includes(subSearch.toLowerCase()) ||
                              t.email?.toLowerCase().includes(subSearch.toLowerCase()))
                        )
                        .map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{t.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 shrink-0 gap-1 text-xs"
                              onClick={() => handleAddSub(t.id)}
                              disabled={addSubstituteMutation.isPending}
                            >
                              <UserPlus className="h-3 w-3" />
                              Add
                            </Button>
                          </li>
                        ))}
                      {allTrainers.filter(
                        (t) =>
                          !substitutes.some((s) => s.id === t.id) &&
                          t.id !== subModalClassroom?.created_by &&
                          (subSearch === "" ||
                            t.full_name?.toLowerCase().includes(subSearch.toLowerCase()) ||
                            t.email?.toLowerCase().includes(subSearch.toLowerCase()))
                      ).length === 0 && (
                        <li className="px-3 py-3 text-xs text-muted-foreground">No available trainers to add.</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardMetric({ item, index }) {
  const Icon = item.icon;
  const dividerClass = [
    index < 2 ? "border-b" : "",
    index % 2 === 0 ? "sm:border-r" : "",
    index < 3 ? "lg:border-r" : "lg:border-r-0",
    "lg:border-b-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex min-w-0 items-center gap-3 px-3 py-2.5 ${dividerClass}`}>
      <span className={`trainer-icon-tile ${item.tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {item.label}
        </p>
        <p className="truncate text-sm font-semibold tabular-nums">{item.value}</p>
        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
      </div>
    </div>
  );
}

function TrainerActionRail({ actions }) {
  const [open, setOpen] = useState(false);
  const midpoint = Math.ceil(actions.length / 2);
  const leftActions = actions.slice(0, midpoint);
  const rightActions = actions.slice(midpoint);
  const sideCount = Math.max(leftActions.length, rightActions.length);
  const openWidth = sideCount * 108 + 72;
  const shellScale = 64 / openWidth;

  const closeOnBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  };

  return (
    <TooltipProvider delayDuration={180}>
      <MotionConfig reducedMotion="user">
        <motion.nav
          aria-label="Trainer dashboard options"
          className="trainer-action-rail"
          initial={false}
          style={{ "--trainer-rail-width": `${openWidth}px` }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={closeOnBlur}
        >
          <motion.span
            className="trainer-action-rail-shell"
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: open ? 1 : 0,
              transform: open
                ? "translate3d(-50%, -50%, 0) scaleX(1)"
                : `translate3d(-50%, -50%, 0) scaleX(${shellScale})`,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
          <span
            className="trainer-action-rail-hitbox"
            aria-hidden="true"
            style={{ pointerEvents: open ? "auto" : "none" }}
          />
          <button
            type="button"
            className="trainer-rail-more"
            aria-label="Reveal dashboard options"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {leftActions.map((action, index) => (
            <RailAction
              key={action.label}
              action={action}
              open={open}
              side="left"
              distance={leftActions.length - index}
            />
          ))}
          {rightActions.map((action, index) => (
            <RailAction
              key={action.label}
              action={action}
              open={open}
              side="right"
              distance={index + 1}
            />
          ))}
        </motion.nav>
      </MotionConfig>
    </TooltipProvider>
  );
}

function RailAction({ action, open, side, distance }) {
  const Icon = action.icon;
  const direction = side === "left" ? -1 : 1;
  const x = direction * distance * 52;
  const y = distance === 1 ? 0 : distance === 2 ? -4 : -9;
  const transformOpen = `translate3d(${x}px, calc(-50% + ${y}px), 0) scale(1)`;
  const transformClosed = "translate3d(0px, -50%, 0) scale(0.95)";
  const commonProps = {
    id: action.id,
    className: "trainer-rail-button",
    "aria-label": action.label,
    tabIndex: open ? 0 : -1,
  };

  const control = action.href ? (
    <ProgressLink href={action.href} {...commonProps}>
      <Icon className="h-4 w-4" />
    </ProgressLink>
  ) : (
    <button
      type="button"
      {...commonProps}
      onClick={action.onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <motion.div
      className="trainer-rail-action"
      aria-hidden={!open}
      initial={false}
      animate={{
        opacity: open ? 1 : 0,
        transform: open ? transformOpen : transformClosed,
      }}
      transition={{
        type: "spring",
        stiffness: 520,
        damping: 36,
        delay: open ? distance * 0.025 : 0,
      }}
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <Tooltip>
        <TooltipTrigger asChild>{control}</TooltipTrigger>
        <TooltipContent side="bottom">{action.label}</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

function StatusPill({ icon: Icon, label, live = false, tone = "muted" }) {
  const toneClass =
    live
      ? "trainer-status-danger"
      : tone === "sky"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
        : tone === "amber"
          ? "trainer-status-warning"
          : "";

  return (
    <span className={`trainer-chip ${toneClass}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
