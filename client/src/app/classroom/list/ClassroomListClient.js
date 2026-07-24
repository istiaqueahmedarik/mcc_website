"use client";

import { useEffect, useState } from 'react';
import { get_with_token, post_with_token } from '@/lib/action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ProgressLink from '@/components/ProgressLink';
import { Users, Plus, BookOpen, AlertCircle, Radio, ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ClassroomListClient() {
  const [classrooms, setClassrooms] = useState([]);
  const [isTrainer, setIsTrainer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    // Fetch user profile to check if trainer/admin
    const profile = await get_with_token('auth/user/profile');
    if (profile && profile.result && profile.result[0]) {
      const user = profile.result[0];
      setIsTrainer(user.trainer || user.admin);
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

  const liveCount = classrooms.filter((c) => c.live_url).length;

  const initialsOf = (name) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  return (
    <div className="relative min-h-screen">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-1))]/20 blur-3xl" />
        <div className="absolute -top-16 right-0 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-3))]/20 blur-3xl" />
      </div>

      <div className="relative container mx-auto py-10 px-4 max-w-6xl">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[hsl(var(--profile-accent-solid))]/[0.12] via-card to-card p-8 shadow-sm mb-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--profile-accent-2))]/20 blur-2xl" />
          <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--profile-accent-solid))]" />
                Training Hub
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-[hsl(var(--profile-accent-solid))] text-white shadow-lg shadow-[hsl(var(--profile-accent-solid))]/30">
                  <GraduationCap className="h-7 w-7" />
                </span>
                Classrooms
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Access your active training classrooms and jump into live practice sessions the moment your trainer goes live.
              </p>
            </div>

            {isTrainer && (
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button className="font-semibold shadow-lg shadow-[hsl(var(--profile-accent-solid))]/25 flex items-center gap-2 rounded-2xl bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white">
                    <Plus className="h-5 w-5" /> Create Classroom
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Classroom</DialogTitle>
                    <DialogDescription>
                      Start a new class, add students, and manage interactive CP problems.
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
                        placeholder="e.g., Advanced DP & Graphs"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Description</label>
                      <Textarea
                        placeholder="Provide description of this training classroom..."
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
            )}
          </div>

          {/* Quick stats */}
          {!loading && classrooms.length > 0 && (
            <div className="relative mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-2 backdrop-blur">
                <BookOpen className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                <span className="text-sm font-bold">{classrooms.length}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-2 backdrop-blur">
                <span className="flex h-2.5 w-2.5 relative">
                  {liveCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveCount > 0 ? 'bg-red-600' : 'bg-muted-foreground/40'}`} />
                </span>
                <span className="text-sm font-bold">{liveCount}</span>
                <span className="text-xs text-muted-foreground">Live now</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-3xl border bg-card p-6 animate-pulse space-y-4">
                <div className="h-4 w-20 rounded-full bg-muted" />
                <div className="h-6 w-3/4 rounded-lg bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-10 w-full rounded-xl bg-muted mt-6" />
              </div>
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed text-center p-14 bg-card">
            <div className="inline-flex p-4 bg-[hsl(var(--profile-accent-solid))]/10 rounded-2xl">
              <Users className="h-9 w-9 text-[hsl(var(--profile-accent-solid))]" />
            </div>
            <h3 className="text-xl font-bold mt-5">No Classrooms Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
              {isTrainer
                ? "You haven't created any classrooms yet. Get started by creating your first classroom."
                : "You are not enrolled in any classrooms yet. Contact your trainer to add you by email."}
            </p>
            {isTrainer && (
              <Button
                onClick={() => setModalOpen(true)}
                className="mt-6 rounded-2xl font-semibold bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white gap-2"
              >
                <Plus className="h-4 w-4" /> Create your first classroom
              </Button>
            )}
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
                  {/* Accent glow on hover */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[hsl(var(--profile-accent-2))]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

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
                      {isLive && (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
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
                      {isLive ? 'Join Live Session' : 'Enter Classroom'}
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
  );
}
