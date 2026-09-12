"use client";

import TrainerActionGroup from "@/app/classroom/live/[id]/TrainerActionGroup";

import { AlertCircle, Calendar, Clock, History, Library, Play, Radio, ShieldCheck } from "@/components/ui/heroicons-animated/TrainerClassroomIcons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClassroomSessionTime } from "./trainer-interior-model.mjs";

function sessionTime(session) {
  const value = session?.started_at || session?.scheduled_time;
  if (!value) return "Time not set";
  return formatClassroomSessionTime(value);
}

export function ClassroomArrivalPanel({
  activeClass,
  nextClass,
  pendingSubmissionCount,
  pendingJoinCount,
  onOpenLive,
  onOpenSchedule,
  onOpenHistory,
  onOpenResources,
  onOpenPeople,
  onOpenTopics,
}) {
  const session = activeClass || nextClass;
  const isLive = Boolean(activeClass);
  const hasAttention = pendingSubmissionCount > 0 || pendingJoinCount > 0;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]" aria-label="Classroom arrival">
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={isLive ? "border-red-500/30 bg-red-500/10 text-red-500" : "border-primary/25 bg-primary/10 text-primary"}>
                {isLive ? <Radio className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                {isLive ? "Live now" : session ? "Next session" : "No session scheduled"}
              </Badge>
              {session?.session_type && <span className="text-xs uppercase text-muted-foreground">{session.session_type}</span>}
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{session?.name || "Plan the next class"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{session ? sessionTime(session) : "Add a session when the classroom is ready."}</p>
          </div>
          {isLive ? (
            <Button className="min-h-11 shrink-0 gap-2" onClick={onOpenLive}><Radio className="h-4 w-4" />Open live</Button>
          ) : nextClass ? (
            <Button className="min-h-11 shrink-0 gap-2" onClick={onOpenSchedule}><Calendar className="h-4 w-4" />Prepare session</Button>
          ) : (
            <Button className="min-h-11 shrink-0 gap-2" onClick={onOpenSchedule}><Calendar className="h-4 w-4" />Schedule session</Button>
          )}
        </div>
        <TrainerActionGroup className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" size="sm" className="min-h-11 gap-2" onClick={onOpenHistory}><History className="h-4 w-4" />History</Button>
          <Button variant="ghost" size="sm" className="min-h-11 gap-2" onClick={onOpenResources}><Library className="h-4 w-4" />Resources</Button>
          <Button variant="ghost" size="sm" className="min-h-11 gap-2" onClick={onOpenSchedule}><Calendar className="h-4 w-4" />Schedule</Button>
        </TrainerActionGroup>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/75 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Needs attention</h2>
        </div>
        {hasAttention ? (
          <div className="mt-3 divide-y divide-border/60">
            {pendingSubmissionCount > 0 && <button type="button" onClick={onOpenTopics} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Submitted work to review</span><Badge variant="secondary">{pendingSubmissionCount}</Badge></button>}
            {pendingJoinCount > 0 && <button type="button" onClick={onOpenPeople} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Account links to review</span><Badge variant="secondary">{pendingJoinCount}</Badge></button>}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>No pending account links or submitted work to review.</span></div>
        )}
      </div>
    </section>
  );
}

export function LiveSessionToolbar({ activeClass, meetingUrl, onAssign, onBoard, onEnd }) {
  let safeMeetingUrl = "";
  try {
    const parsed = new URL(meetingUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") safeMeetingUrl = parsed.toString();
  } catch {}
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/75 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Live session controls">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4 text-red-500" /><span className="truncate">{activeClass.name}</span></div>
        <p className="mt-1 text-xs text-muted-foreground">Started {sessionTime(activeClass)}</p>
      </div>
      <TrainerActionGroup className="flex flex-wrap items-center gap-2">
        <Button id="live-assign-problem-trigger" size="sm" className="min-h-11 gap-2" onClick={onAssign}><Play className="h-4 w-4" />Assign problem</Button>
        {safeMeetingUrl && <Button size="sm" variant="outline" className="min-h-11" asChild><a href={safeMeetingUrl} target="_blank" rel="noreferrer">Open meeting</a></Button>}
        <Button size="sm" variant="outline" className="min-h-11" onClick={onBoard}>Open board</Button>
        <Button size="sm" variant="ghost" className="min-h-11 text-destructive hover:text-destructive" onClick={onEnd}>End session</Button>
      </TrainerActionGroup>
    </section>
  );
}
