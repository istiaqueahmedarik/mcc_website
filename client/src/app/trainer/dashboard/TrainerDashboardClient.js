"use client";

import { useEffect, useState } from 'react';
import { get_with_token, post_with_token } from '@/lib/action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ProgressLink from '@/components/ProgressLink';
import { 
  Users, 
  Plus, 
  BookOpen, 
  AlertCircle, 
  Radio, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  UserCheck, 
  Compass, 
  Award,
  Video,
  ClipboardList
} from 'lucide-react';
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
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const userRes = await get_with_token('auth/user/profile');
    if (userRes && userRes.result && userRes.result[0]) {
      setProfile(userRes.result[0]);
    }

    const res = await get_with_token('classroom/list');
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
    setError('');
    if (!newClassName.trim()) {
      setError('Classroom name is required');
      return;
    }
    const res = await post_with_token('classroom/create', {
      name: newClassName,
      description: newClassDesc,
    });
    if (res && res.success) {
      setNewClassName('');
      setNewClassDesc('');
      setModalOpen(false);
      fetchData();
    } else {
      setError(res.error || 'Failed to create classroom');
    }
  };

  const liveClassrooms = classrooms.filter((c) => c.live_url);
  const totalLive = liveClassrooms.length;

  const initialsOf = (name) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  return (
    <div className="relative min-h-screen pb-16">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[hsl(var(--profile-accent-solid))]/15 blur-3xl" />
        <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-[hsl(var(--profile-accent-3))]/15 blur-3xl" />
      </div>

      <div className="relative container mx-auto py-10 px-4 max-w-7xl space-y-10">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[hsl(var(--profile-accent-solid))]/[0.15] via-card to-card p-8 md:p-10 shadow-lg">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[hsl(var(--profile-accent-2))]/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3.5 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                Trainer Command Center
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3">
                Trainer Dashboard
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-sm md:text-base">
                Manage your live classes, launch new training sessions, assign competitive programming problems, and track student performance in real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ProgressLink href="/trainer/forms">
                <Button variant="outline" className="font-semibold rounded-2xl gap-2 py-6">
                  <ClipboardList className="h-4 w-4" /> Form Creator
                </Button>
              </ProgressLink>

              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button className="font-semibold shadow-xl shadow-[hsl(var(--profile-accent-solid))]/25 flex items-center gap-2 rounded-2xl bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white px-5 py-6">
                    <Plus className="h-5 w-5" /> Create New Classroom
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Classroom</DialogTitle>
                    <DialogDescription>
                      Set up a new training classroom to invite students and run live CP problem sessions.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateClassroom} className="space-y-4 py-4">
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        <AlertCircle className="h-4 w-4" /> {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Classroom Name</label>
                      <Input
                        placeholder="e.g. Advanced Graph Theory & Segment Trees"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Description</label>
                      <Textarea
                        placeholder="Topics covered, schedule details, target audience..."
                        value={newClassDesc}
                        onChange={(e) => setNewClassDesc(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full font-semibold rounded-xl">
                        Create Classroom
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {profile?.admin && (
                <ProgressLink href="/admin/trainers">
                  <Button variant="outline" className="font-semibold rounded-2xl gap-2 py-6">
                    <UserCheck className="h-4 w-4" /> Manage Trainers
                  </Button>
                </ProgressLink>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border/50">
              <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classrooms</span>
                  <BookOpen className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                </div>
                <p className="text-2xl font-black mt-2">{classrooms.length}</p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Now</span>
                  <Radio className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-black mt-2 text-red-500">{totalLive}</p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Status</span>
                  <Award className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                </div>
                <p className="text-lg font-extrabold mt-2 capitalize">{profile?.admin ? "Admin & Trainer" : "Trainer"}</p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Hub</span>
                  <Compass className="h-4 w-4 text-muted-foreground" />
                </div>
                <ProgressLink href="/classroom/list" className="inline-block mt-2 text-xs font-bold text-[hsl(var(--profile-accent-solid))] hover:underline">
                  View All Hubs &rarr;
                </ProgressLink>
              </div>
            </div>
          )}
        </div>

        {/* Live Active Sessions Notice */}
        {totalLive > 0 && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-md">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
              </span>
              <h2 className="text-lg font-bold text-red-500">Active Live Sessions ({totalLive})</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You have active live sessions in progress. Click to join directly as instructor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {liveClassrooms.map((c) => (
                <div key={c.id} className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm line-clamp-1">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.trainer_name}</p>
                  </div>
                  <ProgressLink href={`/classroom/live/${c.id}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl gap-1.5">
                      <Video className="h-3.5 w-3.5" /> Join Live
                    </Button>
                  </ProgressLink>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Managed Classrooms List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Classrooms</h2>
              <p className="text-sm text-muted-foreground">Select a classroom to launch live sessions or manage student rosters.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-3xl border bg-card p-6 animate-pulse space-y-4">
                  <div className="h-4 w-20 rounded-full bg-muted" />
                  <div className="h-6 w-3/4 rounded-lg bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-10 w-full rounded-xl bg-muted mt-6" />
                </div>
              ))}
            </div>
          ) : classrooms.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed text-center p-14 bg-card">
              <div className="inline-flex p-4 bg-[hsl(var(--profile-accent-solid))]/10 rounded-2xl">
                <Layers className="h-9 w-9 text-[hsl(var(--profile-accent-solid))]" />
              </div>
              <h3 className="text-xl font-bold mt-5">No Classrooms Created Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                Start by creating your first interactive training classroom to onboard students.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="mt-6 rounded-2xl font-semibold bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white gap-2"
              >
                <Plus className="h-4 w-4" /> Create First Classroom
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((classroom) => {
                const isLive = !!classroom.live_url;
                return (
                  <div
                    key={classroom.id}
                    className={`group relative overflow-hidden rounded-3xl border bg-card p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      isLive ? 'border-red-500/40 shadow-lg shadow-red-500/5' : 'hover:border-[hsl(var(--profile-accent-solid))]/40'
                    }`}
                  >
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-500 border border-red-500/20">
                            <Radio className="h-3 w-3" /> Live Session
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <BookOpen className="h-3 w-3" /> Classroom
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold mt-4 line-clamp-1">{classroom.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mt-1.5">
                        {classroom.description || "No description provided."}
                      </p>
                    </div>

                    <div className="relative mt-5 flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
                      <span className="grid place-items-center h-9 w-9 rounded-full bg-[hsl(var(--profile-accent-solid))]/15 text-[hsl(var(--profile-accent-solid))] text-xs font-bold">
                        {initialsOf(classroom.trainer_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{classroom.trainer_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Created {new Date(classroom.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <ProgressLink href={`/classroom/live/${classroom.id}`} className="relative w-full mt-4">
                      <Button
                        className={`w-full font-semibold rounded-2xl flex items-center justify-center gap-2 group/btn ${
                          isLive
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white'
                        }`}
                      >
                        {isLive ? 'Manage Live Session' : 'Enter Classroom'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </ProgressLink>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
