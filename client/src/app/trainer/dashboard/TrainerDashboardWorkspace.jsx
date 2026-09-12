"use client";

import { forwardRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClassroomCardTransition, useClassroomNavigation } from "@/components/ClassroomCardTransition";
import ProgressLink from "@/components/ProgressLink";
import {
  DASHBOARD_FILTERS,
  DASHBOARD_SORTS,
  readPreferences,
  roomStatus,
  sessionFor,
  visibleClassrooms,
} from "./dashboard-model.mjs";

const FILTER_LABELS = {
  all: "All",
  owned: "Owned by me",
  "co-training": "Co-training",
  live: "Live now",
};
const EMPTY_PREFERENCES = { pins: [], recent: {} };

function formatSessionTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Time not set";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const RoomLink = forwardRef(function RoomLink(
  {
    room,
    tab = "updates",
    contestRoom,
    onVisit,
    children,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const { setPreview } = useClassroomNavigation();
  const params = new URLSearchParams({ tab });
  if (contestRoom) params.set("room", contestRoom);
  return (
    <ProgressLink
      ref={ref}
      href={`/classroom/live/${room.id}?${params}`}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!props.target || props.target === "_self")) {
            // Only display identity travels; never cache classroom data or permissions.
            setPreview({ id: String(room.id), name: room.name });
          }
          onVisit(room.id);
        }
      }}
      {...props}
    >
      {children}
    </ProgressLink>
  );
});

export default function TrainerDashboardWorkspace({
  rooms,
  profile,
  loading,
  error,
  refreshing,
  onRetry,
  onCreate,
  onSubstitutes,
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const filter = DASHBOARD_FILTERS.includes(searchParams.get("filter"))
    ? searchParams.get("filter")
    : "all";
  const sort = DASHBOARD_SORTS.includes(searchParams.get("sort"))
    ? searchParams.get("sort")
    : "recent";
  const view = searchParams.get("view") === "list" ? "list" : "cards";
  const [saved, setSaved] = useState({ user: null, ...EMPTY_PREFERENCES });
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const userId = profile?.id;
  const preferences = saved.user === userId ? saved : EMPTY_PREFERENCES;

  useEffect(() => {
    if (!userId) return;
    try {
      setSaved({
        user: userId,
        ...readPreferences(
          localStorage.getItem(`mcc:trainer-dashboard:${userId}`),
        ),
      });
      setStorageUnavailable(false);
    } catch {
      setSaved({ user: userId, ...EMPTY_PREFERENCES });
      setStorageUnavailable(true);
    }
  }, [userId]);

  const savePreferences = (next) => {
    setSaved({ user: userId, ...next });
    if (!userId) return;
    try {
      localStorage.setItem(
        `mcc:trainer-dashboard:${userId}`,
        JSON.stringify(next),
      );
    } catch {
      setStorageUnavailable(true);
    }
  };
  const visit = (id) =>
    savePreferences({
      pins: preferences.pins,
      recent: Object.fromEntries(
        Object.entries({ ...preferences.recent, [id]: Date.now() })
          .sort((a, b) => b[1] - a[1])
          .slice(0, 500),
      ),
    });
  const togglePin = (id) =>
    savePreferences({
      recent: preferences.recent,
      pins: preferences.pins.includes(id)
        ? preferences.pins.filter((pin) => pin !== id)
        : [...preferences.pins, id].slice(-500),
    });
  const changeQuery = (patch) => {
    const url = new URL(window.location.href);
    Object.entries(patch).forEach(([key, value]) =>
      value ? url.searchParams.set(key, value) : url.searchParams.delete(key),
    );
    window.history.replaceState(null, "", url);
  };
  const filtered = visibleClassrooms(rooms, {
    query,
    filter,
    sort,
    ...preferences,
  });
  const liveRooms = rooms.filter((room) => roomStatus(room) === "Live now");
  const attention = rooms.flatMap((room) => [
    ...(room.dashboard?.pending_requests
      ? [
          {
            id: `${room.id}-requests`,
            room,
            label: `${room.dashboard.pending_requests} account link request${room.dashboard.pending_requests === 1 ? "" : "s"}`,
            action: "Review requests",
            tab: "students",
          },
        ]
      : []),
    ...(room.dashboard?.stale_reports || []).map((report) => ({
      id: report.room_id,
      room,
      label: `${report.name}: report needs refresh`,
      action: "Open report",
      tab: "contests",
      contestRoom: report.room_id,
    })),
  ]);
  const pendingCount = rooms.reduce(
    (sum, room) =>
      sum +
      (room.dashboard?.pending_requests || 0) +
      (room.dashboard?.stale_reports?.length || 0),
    0,
  );

  if (loading)
    return (
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Loading trainer dashboard"
      >
        <div className="h-8 w-72 max-w-full rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="h-11 rounded-2xl bg-muted/40" />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="trainer-panel h-52 bg-muted/40 motion-safe:animate-pulse"
              />
            ))}
          </div>
          <div className="trainer-panel h-64 bg-muted/40 motion-safe:animate-pulse" />
        </div>
        <span className="sr-only">
          Loading classrooms and dashboard details…
        </span>
      </div>
    );

  if (error && rooms.length === 0)
    return (
      <section className="trainer-empty" role="alert">
        <h2 className="text-lg font-semibold">Couldn’t load your dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your classrooms may still be available. Try loading them again.
        </p>
        <Button
          onClick={onRetry}
          disabled={refreshing}
          className="rounded-2xl mt-4 min-h-11"
        >
          {refreshing ? "Retrying…" : "Retry"}
        </Button>
      </section>
    );

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="trainer-panel flex flex-wrap items-center justify-between gap-3 border-amber-500/40 p-3"
          role="alert"
        >
          <p className="text-sm">
            Couldn’t refresh. Showing the last loaded dashboard.
          </p>
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={refreshing}
            className="rounded-2xl min-h-11"
          >
            {refreshing ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}
      <div
        className="flex flex-wrap gap-2 text-xs font-medium"
        aria-label="Dashboard summary"
      >
        {[
          `${rooms.length} classrooms`,
          `${liveRooms.length} live now`,
          `${pendingCount} need attention`,
        ].map((label, i) => (
          <span
            key={label}
            className={`rounded-xl border px-3 py-2 ${i === 2 && pendingCount ? "border-amber-500/40 bg-amber-500/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground"}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          id="trainer-tour-classroom-grid"
          className="min-w-0 space-y-4"
          aria-labelledby="dashboard-classrooms"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="dashboard-classrooms" className="text-xl font-semibold">
              Your classrooms
            </h2>
            <ProgressLink
              id="trainer-tour-all-classrooms"
              href="/classroom/list"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </ProgressLink>
          </div>
          {rooms.length > 0 && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <label htmlFor="dashboard-search" className="sr-only">
                    Search classrooms by name, trainer, or topic
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dashboard-search"
                    value={query}
                    onChange={(e) => changeQuery({ q: e.target.value })}
                    placeholder="Search classrooms…"
                    className="rounded-2xl h-11 pl-10 text-base sm:text-sm"
                  />
                </div>
                <div
                  className="flex gap-1 rounded-[20px] border p-1"
                  role="group"
                  aria-label="Classroom display"
                >
                  <Button
                    size="sm"
                    className="rounded-2xl min-h-11 gap-2"
                    variant={view === "cards" ? "secondary" : "ghost"}
                    aria-pressed={view === "cards"}
                    onClick={() => changeQuery({ view: null })}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Cards
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-2xl min-h-11 gap-2"
                    variant={view === "list" ? "secondary" : "ghost"}
                    aria-pressed={view === "list"}
                    onClick={() => changeQuery({ view: "list" })}
                  >
                    <List className="h-4 w-4" />
                    List
                  </Button>
                </div>
              </div>
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Filter classrooms"
                >
                  {DASHBOARD_FILTERS.map((value) => (
                    <Button
                      key={value}
                      variant={filter === value ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-2xl min-h-11"
                      aria-pressed={filter === value}
                      onClick={() =>
                        changeQuery({ filter: value === "all" ? null : value })
                      }
                    >
                      {FILTER_LABELS[value]}
                    </Button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => changeQuery({ sort: e.target.value })}
                    className="min-h-11 rounded-2xl border border-border bg-background px-2 text-sm text-foreground"
                  >
                    <option value="recent">Pinned, then recent</option>
                    <option value="name">Pinned, then name</option>
                    <option value="session">Pinned, then session</option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-muted-foreground" role="status">
                {filtered.length} of {rooms.length} classrooms
                {storageUnavailable
                  ? " · Pins and recents are temporary; browser storage is unavailable."
                  : " · Pins and recents are saved on this browser."}
              </p>
            </>
          )}
          {rooms.length === 0 ? (
            <div className="trainer-empty">
              <h3 className="text-lg font-semibold">No classrooms yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first classroom to start preparing sessions.
              </p>
              <Button onClick={onCreate} className="rounded-2xl mt-5 min-h-11 gap-2">
                <Plus className="h-4 w-4" />
                Create classroom
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="trainer-empty">
              <h3 className="font-semibold">No matching classrooms</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another name or clear the filters.
              </p>
              <Button
                variant="outline"
                className="rounded-2xl mt-4 min-h-11"
                onClick={() => changeQuery({ q: null, filter: null })}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div
              className={
                view === "cards" ? "grid gap-4 lg:grid-cols-2" : "space-y-3"
              }
            >
              {filtered.map((room, index) => (
                <ClassroomCard
                  key={room.id}
                  room={room}
                  view={view}
                  pinned={preferences.pins.includes(room.id)}
                  onPin={() => togglePin(room.id)}
                  onVisit={visit}
                  onSubstitutes={onSubstitutes}
                  canManageSubs={room.is_owner || profile?.admin}
                  first={index === 0}
                />
              ))}
            </div>
          )}
        </section>
        {rooms.length > 0 && (
          <aside
            className="trainer-panel min-w-0 p-5 xl:sticky xl:top-6"
            aria-labelledby="dashboard-attention"
          >
            <h2 id="dashboard-attention" className="text-base font-semibold">
              Needs attention
            </h2>
            {attention.length ? (
              <ul className="mt-3 max-h-[32rem] divide-y divide-border overflow-y-auto">
                {attention.map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="break-words text-sm font-medium">
                      {item.label}
                    </p>
                    <RoomLink
                      room={item.room}
                      tab={item.tab}
                      contestRoom={item.contestRoom}
                      onVisit={visit}
                      className="mt-1 inline-flex min-h-11 items-center gap-2 break-words text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.room.name} · {item.action}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </RoomLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">You’re caught up here</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No pending account links or stale contest reports.
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function ClassroomCard({
  room,
  view,
  pinned,
  onPin,
  onVisit,
  onSubstitutes,
  canManageSubs,
  first,
}) {
  const session = sessionFor(room);
  const status = roomStatus(room);
  return (
    <ClassroomCardTransition classroomId={room.id}>
    <article
      id={first ? "trainer-tour-classroom-card" : undefined}
      className={`trainer-panel p-4 sm:p-5 ${status === "Live now" ? "border-primary/40" : ""} ${view === "list" ? "lg:flex lg:items-center lg:gap-6" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
              <span>{status}</span>
              <span>·</span>
              <span>
                {room.is_owner
                  ? "Owner"
                  : room.is_substitute
                    ? "Co-trainer"
                    : "Admin access"}
              </span>
            </div>
            <ClassroomCardTransition classroomId={room.id} title>
            <h3 className="break-words text-lg font-semibold leading-6">
              <RoomLink
                room={room}
                onVisit={onVisit}
                className="hover:text-primary"
              >
                {room.name}
              </RoomLink>
            </h3>
            </ClassroomCardTransition>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl h-11 w-11 shrink-0"
            aria-label={`${pinned ? "Unpin" : "Pin"} ${room.name}`}
            aria-pressed={pinned}
            onClick={onPin}
          >
            <Pin
              className={`h-4 w-4 ${pinned ? "fill-primary/20 text-primary" : "text-muted-foreground"}`}
            />
          </Button>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {room.dashboard?.latest_topic
            ? `Latest topic: ${room.dashboard.latest_topic}`
            : room.description || "Add topics and prepare this classroom."}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {room.dashboard?.student_count ?? "—"} students
          </span>
          <span>{room.trainer_name || "Trainer"}</span>
          {session && (
            <span>
              {formatSessionTime(
                session.status === "started"
                  ? session.started_at
                  : session.scheduled_time,
              )}
            </span>
          )}
        </div>
      </div>
      <div
        className={`flex flex-wrap items-center gap-2 ${view === "cards" ? "mt-4 border-t border-border/60 pt-4" : "mt-4 lg:mt-0 lg:max-w-xs lg:justify-end"}`}
      >
        <Button asChild className="rounded-2xl min-h-11">
          <RoomLink
            room={room}
            tab={status === "Live now" ? "live" : "updates"}
            onVisit={onVisit}
          >
            {status === "Live now" ? "Open live session" : "Open classroom"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </RoomLink>
        </Button>
        <RoomLink
          room={room}
          tab="contests"
          onVisit={onVisit}
          className="inline-flex min-h-11 items-center px-2 text-xs font-medium text-primary"
        >
          Contests & reports
        </RoomLink>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl ml-auto h-11 w-11"
              aria-label={`Actions for ${room.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <RoomLink room={room} tab="schedule" onVisit={onVisit}>
                Schedule session
              </RoomLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <RoomLink room={room} tab="students" onVisit={onVisit}>
                People
              </RoomLink>
            </DropdownMenuItem>
            {canManageSubs && (
              <DropdownMenuItem onSelect={() => onSubstitutes(room)}>
                Manage co-trainers…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
    </ClassroomCardTransition>
  );
}
