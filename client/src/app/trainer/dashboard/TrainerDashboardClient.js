"use client";

import { useEffect, useState } from "react";
import { get_with_token, post_with_token, delete_with_token } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProgressLink from "@/components/ProgressLink";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Layers,
  Plus,
  Radio,
  ShieldCheck,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function TrainerDashboardClient() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  // Substitute trainer management state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalClassroom, setSubModalClassroom] = useState(null);
  const [substitutes, setSubstitutes] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]);
  const [subSearch, setSubSearch] = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  const { startTour } = useTour({
    storageKey: "mcc_trainer_dashboard_toured",
    steps: trainerDashboardSteps,
    autoStart: !loading,
  });


  const fetchData = async () => {
    setLoading(true);
    const userRes = await get_with_token("auth/user/profile");
    if (userRes && userRes.result && userRes.result[0]) {
      setProfile(userRes.result[0]);
    }

    const res = await get_with_token("classroom/list");
    if (res && res.result) {
      setClassrooms(res.result);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSubModal = async (classroom) => {
    setSubModalClassroom(classroom);
    setSubError("");
    setSubSearch("");
    setSubModalOpen(true);
    setSubLoading(true);
    const [subRes, trainerRes] = await Promise.all([
      get_with_token(`classroom/${classroom.id}/substitutes`),
      get_with_token("classroom/admin/trainers-list"),
    ]);
    setSubstitutes(subRes?.result || []);
    setAllTrainers(trainerRes?.result || []);
    setSubLoading(false);
  };

  const handleAddSub = async (trainerId) => {
    setSubError("");
    const res = await post_with_token(`classroom/${subModalClassroom.id}/substitutes`, { trainerId });
    if (res?.message) {
      const subRes = await get_with_token(`classroom/${subModalClassroom.id}/substitutes`);
      setSubstitutes(subRes?.result || []);
    } else {
      setSubError(res?.error || "Failed to add substitute");
    }
  };

  const handleRemoveSub = async (trainerId) => {
    setSubError("");
    const res = await delete_with_token(`classroom/${subModalClassroom.id}/substitutes/${trainerId}`);
    if (res?.message) {
      setSubstitutes((prev) => prev.filter((s) => s.id !== trainerId));
    } else {
      setSubError(res?.error || "Failed to remove substitute");
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    setError("");
    if (!newClassName.trim()) {
      setError("Classroom name is required");
      return;
    }
    const res = await post_with_token("classroom/create", {
      name: newClassName,
      description: newClassDesc,
    });
    if (res && res.success) {
      setNewClassName("");
      setNewClassDesc("");
      setModalOpen(false);
      fetchData();
    } else {
      setError(res.error || "Failed to create classroom");
    }
  };

  const liveClassrooms = classrooms.filter((c) => c.live_url);
  const totalLive = liveClassrooms.length;
  const quietClassrooms = classrooms.length - totalLive;
  const roleLabel = profile?.admin ? "Admin + Trainer" : "Trainer";

  const summaryCards = [
    {
      label: "Classrooms",
      value: classrooms.length,
      detail: `${quietClassrooms} ready`,
      icon: BookOpen,
      tone: "border-sky-600 text-sky-600",
    },
    {
      label: "Live now",
      value: totalLive,
      detail: totalLive ? "Instructor action" : "No live room",
      icon: Radio,
      tone: "border-red-600 text-red-600",
    },
    {
      label: "Role",
      value: roleLabel,
      detail: profile?.admin ? "Trainer controls unlocked" : "Trainer access",
      icon: ShieldCheck,
      tone: "border-emerald-600 text-emerald-600",
    },
    {
      label: "Forms",
      value: "Builder",
      detail: "Create and manage",
      icon: ClipboardList,
      tone: "border-violet-600 text-violet-600",
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
    <div className="min-h-screen bg-background relative">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section id="trainer-tour-header" className="grid gap-6 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Trainer dashboard</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                Learning operations
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Live rooms, classroom setup, and form tools without the noise.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile?.admin && (
                <ProgressLink href="/admin/trainers">
                  <Button variant="default" className="gap-2 font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                </ProgressLink>
              )}

              <ProgressLink href="/trainer/forms" id="trainer-tour-form-btn">
                <Button variant="outline" className="gap-2 font-semibold">
                  <ClipboardList className="h-4 w-4" />
                  Form Creator
                </Button>
              </ProgressLink>

              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button id="trainer-tour-new-classroom-btn" className="gap-2 font-semibold">
                    <Plus className="h-4 w-4" />
                    New classroom
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>Create classroom</DialogTitle>
                    <DialogDescription>
                      Set a clear name and short description for students.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateClassroom} className="space-y-4 py-2">
                    {error && (
                      <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Classroom name</label>
                        <Input
                          placeholder="Advanced Graph Theory"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Description</label>
                        <Textarea
                          placeholder="Topics, schedule, audience, outcomes"
                          value={newClassDesc}
                          onChange={(e) => setNewClassDesc(e.target.value)}
                          className="min-h-24"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit" className="w-full font-semibold sm:w-auto">
                        Create Classroom
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {profile?.admin && (
                <ProgressLink href="/admin/trainers">
                  <Button variant="outline" className="gap-2 font-semibold">
                    <UserCheck className="h-4 w-4" />
                    Manage Trainers
                  </Button>
                </ProgressLink>
              )}
            </div>
        </section>



        {totalLive > 0 && (
          <section id="trainer-tour-live-section" className="rounded-lg border border-red-500/30 bg-card">
            <div className="flex flex-col gap-3 border-b border-red-500/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>
                <div>
                    <h2 className="text-base font-bold text-red-700 dark:text-red-300">
                      Live sessions
                    </h2>
                  <p className="text-sm text-muted-foreground">{totalLive} active room{totalLive === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-red-500/10">
              {liveClassrooms.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold">{c.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">{c.trainer_name}</p>
                  </div>
                  <ProgressLink href={`/classroom/live/${c.id}`}>
                    <Button size="sm" className="w-full gap-2 bg-red-600 text-white hover:bg-red-700 sm:w-auto">
                      <Video className="h-4 w-4" />
                      Join Live
                    </Button>
                  </ProgressLink>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="trainer-tour-classroom-grid" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Classroom workspace</h2>
              <p className="text-sm text-muted-foreground">Open, prepare, or continue.</p>
            </div>
            <ProgressLink id="trainer-tour-all-classrooms" href="/classroom/list" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              All classrooms
              <ArrowRight className="h-4 w-4" />
            </ProgressLink>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-5">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-7 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-10 w-full rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : classrooms.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-muted">
                <Layers className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-bold">No classrooms yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Create the first classroom to start trainer operations.
              </p>
              <Button onClick={() => setModalOpen(true)} className="mt-5 gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create Classroom
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classrooms.map((classroom, idx) => {
                const isLive = !!classroom.live_url;
                const isOwner = classroom.is_owner;
                const isSubstitute = classroom.is_substitute;
                const canManageSubs = isOwner || profile?.admin;
                return (
                  <article
                    key={classroom.id}
                    id={idx === 0 ? "trainer-tour-classroom-card" : undefined}
                    className={`group flex min-h-[238px] flex-col rounded-lg border bg-card p-5 transition hover:border-foreground/20 hover:shadow-sm ${
                      isLive ? "border-red-500/40" : "hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 border-l-2 pl-2 text-xs font-semibold uppercase ${
                            isLive
                              ? "border-red-600 text-red-600"
                              : "border-muted-foreground/40 text-muted-foreground"
                          }`}
                        >
                          {isLive ? <Radio className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                          {isLive ? "Live" : "Ready"}
                        </span>
                        {isSubstitute && !isOwner && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600">
                            <UserCheck className="h-3 w-3" />
                            Co-Trainer
                          </span>
                        )}
                        {isOwner && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-600">
                            <ShieldCheck className="h-3 w-3" />
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-bold">
                        {initialsOf(classroom.trainer_name) || "?"}
                      </span>
                    </div>

                    <div className="mt-4 min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-lg font-bold">{classroom.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {classroom.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-2 border-t pt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="truncate">{classroom.trainer_name || "Trainer"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>Created {new Date(classroom.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <ProgressLink href={`/classroom/live/${classroom.id}`} className="flex-1">
                        <Button
                          className={`w-full justify-between gap-2 font-semibold ${
                            isLive ? "bg-red-600 text-white hover:bg-red-700" : ""
                          }`}
                        >
                          <span>{isLive ? "Manage live session" : "Enter classroom"}</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </ProgressLink>
                      {canManageSubs && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Manage substitute trainers"
                          onClick={() => openSubModal(classroom)}
                          className="shrink-0"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <button
        id="trainer-tour-take-tour-btn"
        onClick={startTour}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg hover:bg-muted transition-all active:scale-95"
        title="Re-launch onboarding tour"
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        <span>Take Tour</span>
      </button>

      {/* Substitute Trainer Management Modal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-bold">Substitute Trainers</h2>
                <p className="text-xs text-muted-foreground">{subModalClassroom?.name}</p>
              </div>
              <button
                onClick={() => { setSubModalOpen(false); setSubError(""); }}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Current Co-Trainers</p>
                    {substitutes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No substitute trainers assigned yet.</p>
                    ) : (
                      <ul className="divide-y rounded-md border">
                        {substitutes.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{s.full_name}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveSub(s.id)}
                              className="grid h-7 w-7 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
                              title="Remove substitute"
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
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Add Substitute</p>
                    <Input
                      placeholder="Search trainers by name or email…"
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      className="mb-2 h-8 text-sm"
                    />
                    <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
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
                              className="shrink-0 h-7 text-xs gap-1"
                              onClick={() => handleAddSub(t.id)}
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
          </div>
        </div>
      )}
    </div>
  );
}

