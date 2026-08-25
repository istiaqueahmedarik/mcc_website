"use client";

import { useEffect, useState } from 'react';
import { get_with_token } from '@/lib/action';
import { Button } from '@/components/ui/button';
import ProgressLink from '@/components/ProgressLink';
import CreateClassroomWizard from '@/components/CreateClassroomWizard';
import DiscordConnectionRequiredCard from '@/components/DiscordConnectionRequiredCard';
import { Users, Plus, BookOpen, Radio, ArrowRight, CalendarDays, ShieldCheck } from 'lucide-react';

export default function ClassroomListClient() {
  const [classrooms, setClassrooms] = useState([]);
  const [isTrainer, setIsTrainer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [discordRequired, setDiscordRequired] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setDiscordRequired(false);
    // Fetch user profile to check if trainer/admin
    const profile = await get_with_token('auth/user/profile');
    if (profile && profile.result && profile.result[0]) {
      const user = profile.result[0];
      setIsTrainer(user.trainer || user.admin);
    }

    const res = await get_with_token('classroom/list');
    if (res && res.result) {
      setClassrooms(res.result);
    } else if (res?.code === 'DISCORD_LINK_REQUIRED') {
      setClassrooms([]);
      setDiscordRequired(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const liveCount = classrooms.filter((c) => c.live_url).length;

  const initialsOf = (name) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  return (
    <div className="trainer-page trainer-dashboard-page relative">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-4 pb-2">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Classrooms</p>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span className="text-xs font-medium text-muted-foreground">
                {loading ? 'Loading' : `${classrooms.length} room${classrooms.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
              Classroom directory
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open a classroom, continue prep, or join an active room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {isTrainer && (
              <CreateClassroomWizard
                open={modalOpen}
                onOpenChange={setModalOpen}
                onCreated={fetchData}
                trigger={
                  <Button size="sm" className="gap-2 font-semibold">
                    <Plus className="h-4 w-4" />
                    New classroom
                  </Button>
                }
              />
            )}
          </div>
          </div>

          <div className="trainer-panel grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            <ClassroomMetric
              label="Classrooms"
              value={loading ? '...' : classrooms.length}
              detail={loading ? 'Loading rooms' : `${Math.max(classrooms.length - liveCount, 0)} ready`}
              icon={BookOpen}
              tone="text-sky-300"
              index={0}
            />
            <ClassroomMetric
              label="Live now"
              value={loading ? '...' : liveCount}
              detail={liveCount ? 'Active session' : 'No live room'}
              icon={Radio}
              tone="text-red-300"
              index={1}
            />
            <ClassroomMetric
              label="Access"
              value={isTrainer ? 'Trainer' : 'Student'}
              detail={isTrainer ? 'Creation enabled' : 'Enrollment view'}
              icon={ShieldCheck}
              tone="text-emerald-300"
              index={2}
            />
            <ClassroomMetric
              label="Mode"
              value="Directory"
              detail="Classroom list"
              icon={Users}
              tone="text-cyan-300"
              index={3}
            />
          </div>
        </section>

        {discordRequired ? (
          <DiscordConnectionRequiredCard />
        ) : loading ? (
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
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-base font-semibold">No classrooms</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {isTrainer
                ? "Create the first classroom when training is ready."
                : "No classroom enrollment found yet."}
            </p>
            {isTrainer && (
              <Button onClick={() => setModalOpen(true)} size="sm" className="mt-4 gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create classroom
              </Button>
            )}
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Classrooms</h2>
                <p className="text-sm text-muted-foreground">Open a room or prep the next session.</p>
              </div>
            </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {classrooms.map((classroom) => {
              const isLive = !!classroom.live_url;
              return (
                <article
                  key={classroom.id}
                  className={`trainer-panel group p-4 hover:border-foreground/20 ${
                    isLive ? 'border-red-500/40' : ''
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0 space-y-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <ClassroomStatusPill
                          icon={isLive ? Radio : BookOpen}
                          label={isLive ? 'Live' : 'Ready'}
                          live={isLive}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{classroom.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {classroom.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <span className="trainer-icon-tile hidden h-9 w-9 text-xs font-semibold sm:grid">
                      {initialsOf(classroom.trainer_name) || '?'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{classroom.trainer_name || 'Trainer'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{new Date(classroom.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <ProgressLink href={`/classroom/live/${classroom.id}`} className="min-w-0 flex-1 sm:flex-none">
                      <Button
                        size="sm"
                        className={`w-full justify-between gap-2 font-semibold sm:w-auto ${
                          isLive ? 'bg-red-600 text-white hover:bg-red-700' : ''
                        }`}
                      >
                        <span>{isLive ? 'Join live' : 'Enter'}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </ProgressLink>
                  </div>
                </article>
              );
            })}
          </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ClassroomMetric({ label, value, detail, icon: Icon, tone, index }) {
  const dividerClass = [
    index < 2 ? 'border-b' : '',
    index % 2 === 0 ? 'sm:border-r' : '',
    index < 3 ? 'lg:border-r' : 'lg:border-r-0',
    'lg:border-b-0',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`flex min-w-0 items-center gap-3 px-3 py-2.5 ${dividerClass}`}>
      <span className={`trainer-icon-tile ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ClassroomStatusPill({ icon: Icon, label, live = false }) {
  return (
    <span className={`trainer-chip ${live ? 'trainer-status-danger' : ''}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
