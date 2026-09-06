"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import TrainerDashboardWorkspace from "./TrainerDashboardWorkspace";
import { ApiClientError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressLink from "@/components/ProgressLink";
import CreateClassroomWizard from "@/components/CreateClassroomWizard";
import DiscordConnectionRequiredCard from "@/components/DiscordConnectionRequiredCard";
import {
  AlertCircle,
  ClipboardList,
  HelpCircle,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTour } from "@/hooks/useTour";

const trainerDashboardSteps = [
  {
    popover: {
      title: "👋 Welcome, Trainer!",
      description:
        "This is your Trainer Dashboard — your operations hub for managing classrooms, live sessions, forms, and students. Let's take a quick look around!",
      side: "center",
      align: "center",
    },
  },
  {
    element: "#trainer-tour-header",
    popover: {
      title: "🏠 Dashboard Overview",
      description:
        "The header area shows your role and gives you quick access to all trainer actions. Your top-level tools live right here.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-new-classroom-btn",
    popover: {
      title: "➕ Create a Classroom",
      description:
        "Click here to set up a new classroom. Give it a name and description — this becomes your space to add topics, assign problems, and manage students.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#trainer-tour-form-btn",
    popover: {
      title: "📋 Form Creator",
      description:
        "Build custom forms for registrations, surveys, or student submissions. Forms can be shared with students and have open/closed toggles.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-classroom-grid",
    popover: {
      title: "📚 Classroom Workspace",
      description:
        "Search and filter classrooms, pin frequently used rooms, or switch between cards and a compact list.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#trainer-tour-classroom-card",
    popover: {
      title: "🗂️ Classroom Card",
      description:
        "Each classroom shows its latest topic, students and session timing. Open it directly or use the menu for People, Schedule and co-trainers.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#trainer-tour-all-classrooms",
    popover: {
      title: "📋 View All Classrooms",
      description:
        "Need to see more? Click here to browse the full classroom list page with search and filter options.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#trainer-tour-take-tour-btn",
    popover: {
      title: "❓ Take Tour Button",
      description:
        "This button is always here for you. Click it at any time to re-launch this tour from the beginning — no need to clear your history.",
      side: "top",
      align: "end",
    },
  },
  {
    popover: {
      title: "🎉 You're Ready to Teach!",
      description:
        "You now know the basics of your Trainer Dashboard. Start by creating a classroom, then open it to schedule sessions and assign topic modules to students.",
      side: "center",
      align: "center",
    },
  },
];

const dashboardQueryKeys = {
  profile: ["trainer", "profile"],
  classrooms: ["trainer", "classrooms", "dashboard"],
  allTrainers: ["trainer", "all-trainers"],
  substitutes: (classroomId) => [
    "trainer",
    "classrooms",
    classroomId,
    "substitutes",
  ],
};

async function fetchTrainerProfile() {
  const res = await apiGet("auth/user/profile");
  return res?.result?.[0] || null;
}

async function fetchClassrooms() {
  const res = await apiGet("classroom/list?dashboard=true");
  if (
    !Array.isArray(res?.result) ||
    res.result.some((room) => !room.dashboard)
  ) {
    throw new Error("Dashboard details are unavailable. Please try again.");
  }
  return res.result;
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
    refetchInterval: 60_000,
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
      const res = await apiPost(`classroom/${classroomId}/substitutes`, {
        trainerId,
      });
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
      const res = await apiDelete(
        `classroom/${classroomId}/substitutes/${trainerId}`,
      );
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
  const discordLinkRequired =
    classroomsQuery.error instanceof ApiClientError &&
    classroomsQuery.error.data?.code === "DISCORD_LINK_REQUIRED";

  const { startTour } = useTour({
    storageKey: "mcc_trainer_dashboard_toured",
    steps: trainerDashboardSteps,
    autoStart: !loading && !classroomsQuery.isError && !profileQuery.isError,
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

  const roleLabel = profile?.admin ? "Admin + Trainer" : "Trainer";

  return (
    <div className="trainer-page trainer-dashboard-page relative">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section
          id="trainer-tour-header"
          className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {roleLabel}
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Trainer dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your classrooms and work needing attention.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="min-h-11 gap-2">
              <ProgressLink id="trainer-tour-form-btn" href="/trainer/forms">
                <ClipboardList className="h-4 w-4" />
                Forms
              </ProgressLink>
            </Button>
            <Button
              id="trainer-tour-new-classroom-btn"
              onClick={() => setModalOpen(true)}
              className="min-h-11 gap-2"
            >
              <Plus className="h-4 w-4" />
              New classroom
            </Button>
          </div>
        </section>
        <CreateClassroomWizard
          open={modalOpen}
          onOpenChange={setModalOpen}
          onCreated={() =>
            queryClient.invalidateQueries({
              queryKey: dashboardQueryKeys.classrooms,
            })
          }
        />
        {discordLinkRequired ? (
          <DiscordConnectionRequiredCard />
        ) : (
          <TrainerDashboardWorkspace
            rooms={classrooms}
            profile={profile}
            loading={loading}
            error={classroomsQuery.isError || profileQuery.isError}
            refreshing={classroomsQuery.isFetching || profileQuery.isFetching}
            onRetry={() => {
              classroomsQuery.refetch();
              profileQuery.refetch();
            }}
            onCreate={() => setModalOpen(true)}
            onSubstitutes={openSubModal}
          />
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
            <DialogTitle className="text-base tracking-normal">
              Substitute trainers
            </DialogTitle>
            <DialogDescription>{subModalClassroom?.name}</DialogDescription>
          </DialogHeader>

          <div className="p-5">
            {(subError ||
              substitutesQuery.isError ||
              allTrainersQuery.isError) && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {subError ||
                  "Could not load co-trainers. Close this dialog and try again."}
              </div>
            )}

            {subLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : (
              <>
                {/* Current substitutes */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Current co-trainers
                  </p>
                  {substitutes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No substitute trainers assigned yet.
                    </p>
                  ) : (
                    <ul className="trainer-panel-soft divide-y">
                      {substitutes.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.email}
                            </p>
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
                  <label
                    htmlFor="substitute-trainer-search"
                    className="mb-2 block text-xs font-semibold text-muted-foreground"
                  >
                    Add substitute
                  </label>
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
                            t.full_name
                              ?.toLowerCase()
                              .includes(subSearch.toLowerCase()) ||
                            t.email
                              ?.toLowerCase()
                              .includes(subSearch.toLowerCase())),
                      )
                      .map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {t.full_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {t.email}
                            </p>
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
                          t.full_name
                            ?.toLowerCase()
                            .includes(subSearch.toLowerCase()) ||
                          t.email
                            ?.toLowerCase()
                            .includes(subSearch.toLowerCase())),
                    ).length === 0 && (
                      <li className="px-3 py-3 text-xs text-muted-foreground">
                        No available trainers to add.
                      </li>
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
