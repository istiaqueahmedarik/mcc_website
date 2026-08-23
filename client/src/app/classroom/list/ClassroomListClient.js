"use client";

import { useEffect, useState } from 'react';
import { get_with_token } from '@/lib/action';
import { Button } from '@/components/ui/button';
import ProgressLink from '@/components/ProgressLink';
import CreateClassroomWizard from '@/components/CreateClassroomWizard';
import DiscordConnectionRequiredCard from '@/components/DiscordConnectionRequiredCard';
import { Users, Plus, BookOpen, Radio, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Classrooms</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
              Training rooms
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open active classrooms and join live practice from one focused list.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
            {!loading && (
              <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[220px]">
                <div className="border-l pl-3">
                  <p className="text-2xl font-bold">{classrooms.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="border-l pl-3">
                  <p className="text-2xl font-bold text-red-600">{liveCount}</p>
                  <p className="text-xs text-muted-foreground">Live</p>
                </div>
              </div>
            )}

            {isTrainer && (
              <CreateClassroomWizard
                open={modalOpen}
                onOpenChange={setModalOpen}
                onCreated={fetchData}
                trigger={
                  <Button className="gap-2 font-semibold">
                    <Plus className="h-4 w-4" />
                    Create classroom
                  </Button>
                }
              />
            )}
          </div>
        </section>

        {discordRequired ? (
          <DiscordConnectionRequiredCard />
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-card p-5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="mt-5 h-7 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-4 w-full rounded bg-muted" />
                <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                <div className="mt-6 h-10 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-bold">No classrooms</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {isTrainer
                ? "Create the first classroom when training is ready."
                : "No classroom enrollment found yet."}
            </p>
            {isTrainer && (
              <Button onClick={() => setModalOpen(true)} className="mt-5 gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create classroom
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => {
              const isLive = !!classroom.live_url;
              return (
                <article
                  key={classroom.id}
                  className={`group flex min-h-[238px] flex-col rounded-lg border bg-card p-5 transition hover:border-foreground/20 hover:shadow-sm ${
                    isLive ? 'border-red-500/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 border-l-2 pl-2 text-xs font-semibold uppercase ${
                        isLive ? 'border-red-600 text-red-600' : 'border-muted-foreground/40 text-muted-foreground'
                      }`}
                    >
                      {isLive ? <Radio className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                      {isLive ? 'Live' : 'Ready'}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-bold">
                      {initialsOf(classroom.trainer_name) || '?'}
                    </span>
                  </div>

                  <div className="mt-5 min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-bold leading-snug">{classroom.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {classroom.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                    <p className="truncate font-medium text-foreground">{classroom.trainer_name || 'Trainer'}</p>
                    <p>Created {new Date(classroom.created_at).toLocaleDateString()}</p>
                  </div>

                  <ProgressLink href={`/classroom/live/${classroom.id}`} className="mt-4">
                    <Button
                      className={`w-full justify-between gap-2 font-semibold ${
                        isLive ? 'bg-red-600 text-white hover:bg-red-700' : ''
                      }`}
                    >
                      {isLive ? 'Join live session' : 'Enter classroom'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </ProgressLink>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
