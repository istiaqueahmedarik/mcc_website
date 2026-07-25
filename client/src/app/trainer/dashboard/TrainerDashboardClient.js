"use client";

import { useEffect, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
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
  Layers,
  Plus,
  Radio,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
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

export default function TrainerDashboardClient() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
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
              <ProgressLink href="/trainer/forms">
                <Button variant="outline" className="gap-2 font-semibold">
                  <ClipboardList className="h-4 w-4" />
                  Form Creator
                </Button>
              </ProgressLink>

              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 font-semibold">
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

        {!loading && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 border-l pl-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 truncate text-2xl font-bold">{item.value}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center border-l ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {totalLive > 0 && (
          <section className="rounded-lg border border-red-500/30 bg-card">
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

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Classroom workspace</h2>
              <p className="text-sm text-muted-foreground">Open, prepare, or continue.</p>
            </div>
            <ProgressLink href="/classroom/list" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
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
              {classrooms.map((classroom) => {
                const isLive = !!classroom.live_url;
                return (
                  <article
                    key={classroom.id}
                    className={`group flex min-h-[238px] flex-col rounded-lg border bg-card p-5 transition hover:border-foreground/20 hover:shadow-sm ${
                      isLive ? "border-red-500/40" : "hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
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

                    <ProgressLink href={`/classroom/live/${classroom.id}`} className="mt-5">
                      <Button
                        className={`w-full justify-between gap-2 font-semibold ${
                          isLive ? "bg-red-600 text-white hover:bg-red-700" : ""
                        }`}
                      >
                          <span>{isLive ? "Manage live session" : "Enter classroom"}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </ProgressLink>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
