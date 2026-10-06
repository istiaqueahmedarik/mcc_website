"use client";

import { useMemo } from "react";
import { File, MessageCircle, Minimize2, X } from "lucide-react";
import { ClassroomThreadsTab } from "@/components/ClassroomThreadsTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MAX_FLOATING_STUDENT_THREADS = 6;

function studentName(student) {
  const name = student?.full_name || student?.name || "Student";
  return student?.mist_id ? `${name} [${student.mist_id}]` : name;
}

function referenceType(reference) {
  if (reference?.type === "live_problem") return "Live submission";
  if (reference?.type === "topic_problem") return "Topic submission";
  return "Thread";
}

function referenceTitle(reference) {
  if (!reference) return "";
  return reference.problem_title || reference.problemTitle || "Pending submission";
}

function submissionReferenceId(reference) {
  if (!reference) return "";
  if (reference.type === "live_problem") {
    return reference.classProblemId || reference.class_problem_id || reference.problemId || reference.problem_id || "";
  }
  if (reference.type === "topic_problem") {
    return reference.progressId || reference.progress_id || reference.topicProblemId || reference.topic_problem_id || "";
  }
  return "";
}

export function getStudentThreadBubbleKey(thread) {
  const classroomId = thread?.classroomId || thread?.classroom_id || "classroom";
  const studentId = thread?.studentId || thread?.student_id || thread?.student?.id || "student";
  const reference = thread?.submissionReference || thread?.submission_reference || null;
  const referenceId = submissionReferenceId(reference);
  if (!reference || !referenceId) return `${classroomId}:student:${studentId}`;
  return `${classroomId}:student:${studentId}:submission:${reference.type}:${referenceId}`;
}

function ThreadBubbleButton({ thread, active, onActivate, onClose }) {
  const title = thread.title || studentName(thread.student);
  const reference = thread.submissionReference;
  const initial = studentName(thread.student).slice(0, 1).toUpperCase() || "S";

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onActivate(thread.key)}
        className={`grid h-14 w-14 place-items-center rounded-full border bg-background text-foreground shadow-xl transition hover:-translate-x-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
        aria-label={`Open ${title}`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-sm font-black text-background">
          {initial}
        </span>
        {reference ? (
          <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full border border-background bg-amber-500 text-white">
            <File className="h-2.5 w-2.5" />
          </span>
        ) : (
          <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full border border-background bg-primary text-primary-foreground">
            <MessageCircle className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose(thread.key);
        }}
        className={`absolute -right-1 -top-1 z-20 grid h-6 w-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          active ? "opacity-100" : "pointer-events-none scale-75 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
        }`}
        aria-label={`Close ${title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 hidden w-72 -translate-y-1/2 rounded-lg border bg-background p-3 text-left shadow-xl group-hover:block">
        <p className="truncate text-sm font-semibold">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
            {referenceType(reference)}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {reference ? referenceTitle(reference) : "Private classroom thread"}
        </p>
      </div>
    </div>
  );
}

export function StudentThreadBubbleDock({ threads, activeKey, onActivate, onClose, onMinimize, currentUser, isTrainer }) {
  const visibleThreads = useMemo(() => (threads || []).slice(-MAX_FLOATING_STUDENT_THREADS), [threads]);
  const activeThread = visibleThreads.find((thread) => thread.key === activeKey) || null;

  if (visibleThreads.length === 0) return null;

  return (
    <>
      {activeThread && (
        <div className="fixed bottom-24 right-[5.75rem] z-50 w-[min(760px,calc(100vw-7rem))] max-sm:bottom-36 max-sm:right-4 max-sm:w-[calc(100vw-2rem)]">
          <div className="overflow-hidden rounded-lg border bg-background shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{activeThread.title || studentName(activeThread.student)}</p>
                  <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                    {referenceType(activeThread.submissionReference)}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {activeThread.submissionReference ? referenceTitle(activeThread.submissionReference) : "Private classroom thread"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize} aria-label="Minimize thread">
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClose(activeThread.key)} aria-label="Close thread">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ClassroomThreadsTab
              classroomId={activeThread.classroomId}
              isTrainer={isTrainer}
              currentUser={currentUser}
              forcedStudentId={activeThread.studentId}
              forcedStudent={activeThread.student}
              submissionReference={activeThread.submissionReference || null}
              showHeader={false}
              showList={false}
              frame={false}
              panelClassName="h-[34rem] max-h-[calc(100vh-13rem)] min-h-0 rounded-none border-0"
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-[60] flex max-h-[calc(100vh-8rem)] flex-col-reverse items-end gap-2 overflow-visible max-sm:bottom-24">
        {visibleThreads.map((thread) => (
          <ThreadBubbleButton
            key={thread.key}
            thread={thread}
            active={thread.key === activeKey}
            onActivate={onActivate}
            onClose={onClose}
          />
        ))}
      </div>
    </>
  );
}
