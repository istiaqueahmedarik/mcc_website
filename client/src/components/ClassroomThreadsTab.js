"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  CheckCircle2,
  Download,
  File,
  FileCode2,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  get_uncached_with_token,
  get_with_token,
  post_form_with_token,
  post_uncached_with_token,
} from "@/lib/action";
import { useClassroomThreadRealtime } from "@/hooks/useClassroomThreadRealtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_ATTACHMENT_ACCEPT = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".java",
  ".py",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
].join(",");

const eventLabels = {
  student_solution_submitted: "Submitted",
  trainer_problem_added: "Problem",
  trainer_feedback: "Feedback",
  solution_status_changed: "Status",
  topic_or_resource_updated: "Topic",
  attachment_shared: "File",
};

const eventTone = {
  student_solution_submitted: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  trainer_problem_added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  trainer_feedback: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  solution_status_changed: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  topic_or_resource_updated: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  attachment_shared: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function studentName(student) {
  const name = student?.full_name || student?.name || "Student";
  return student?.mist_id ? `${name} [${student.mist_id}]` : name;
}

function isNearBottom(element) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 120;
}

function attachmentIcon(contentType) {
  if (String(contentType || "").startsWith("image/")) return ImageIcon;
  if (
    String(contentType || "").includes("json") ||
    String(contentType || "").includes("javascript") ||
    String(contentType || "").startsWith("text/")
  ) return FileCode2;
  return File;
}

function createOptimisticMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `optimistic:${crypto.randomUUID()}`;
  }
  return `optimistic:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function optimisticSenderName(currentUser) {
  return currentUser?.full_name || currentUser?.name || "You";
}

function buildOptimisticMessage({ id, text, file, threadId, currentUser, submissionReference }) {
  const createdAt = new Date().toISOString();
  const body = text || (file ? `Shared ${file.name}` : "");
  return {
    id,
    thread_id: threadId || "",
    sender_id: currentUser?.id || "",
    sender_name: optimisticSenderName(currentUser),
    sender_email: currentUser?.email || "",
    sender_mist_id: currentUser?.mist_id || "",
    kind: "message",
    event_type: null,
    body,
    metadata: {
      optimistic: true,
      client_message_id: id,
      ...(submissionReference ? { submission_reference: submissionReference } : {}),
    },
    created_at: createdAt,
    is_own: true,
    delivery_status: "pending",
    attachments: file ? [{
      id: `${id}:attachment`,
      original_filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
      created_at: createdAt,
      is_pending: true,
    }] : [],
  };
}

function useOptimisticThreadMessages(messages) {
  const [pendingMessages, setPendingMessages] = useState([]);

  const dispatchOptimisticMessage = useCallback((action) => {
    setPendingMessages((currentMessages) => {
      if (action.type === "add") {
        if (!action.message?.id || currentMessages.some((message) => message.id === action.message.id)) {
          return currentMessages;
        }
        return [...currentMessages, action.message];
      }

      if (action.type === "resolve") {
        return currentMessages.filter((message) => message.id !== action.id);
      }

      if (action.type === "fail") {
        return currentMessages.map((message) => (
          message.id === action.id
            ? { ...message, delivery_status: "failed", error: action.error || "Message could not be sent" }
            : message
        ));
      }

      if (action.type === "clear") return [];

      return currentMessages;
    });
  }, []);

  const optimisticMessages = useMemo(() => {
    const savedIds = new Set(messages.map((message) => message.id));
    const savedClientIds = new Set(
      messages
        .map((message) => message.metadata?.client_message_id)
        .filter(Boolean)
    );
    const visiblePending = pendingMessages.filter((message) => (
      !savedIds.has(message.id) && !savedClientIds.has(message.metadata?.client_message_id)
    ));
    return [...messages, ...visiblePending];
  }, [messages, pendingMessages]);

  return [optimisticMessages, dispatchOptimisticMessage];
}

function ThreadRefreshButton({ onRefresh, loading }) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRefresh} disabled={loading}>
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}

function ThreadList({ threads, selectedStudentId, search, onSearchChange, onSelect }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      const student = thread.student || {};
      return (
        String(student.full_name || "").toLowerCase().includes(q) ||
        String(student.email || "").toLowerCase().includes(q) ||
        String(student.mist_id || "").toLowerCase().includes(q) ||
        String(thread.last_message?.body || "").toLowerCase().includes(q)
      );
    });
  }, [search, threads]);

  return (
    <div className="flex h-[42rem] min-h-[30rem] max-h-[calc(100vh-12rem)] flex-col rounded-lg border bg-background">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search students"
            className="h-9 pl-9"
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No active student threads.</div>
          ) : filtered.map((thread) => {
            const active = thread.student_id === selectedStudentId;
            const last = thread.last_message?.body || "No messages yet.";
            return (
              <button
                key={thread.id || thread.student_id}
                type="button"
                onClick={() => onSelect(thread.student_id)}
                className={`block w-full p-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-muted" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                    {studentName(thread.student).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{studentName(thread.student)}</p>
                      {thread.last_message?.created_at && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(thread.last_message.created_at)}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{last}</p>
                    {thread.last_message?.kind === "system" && (
                      <div className="mt-2">
                        <Badge variant="outline" className="rounded-md text-[10px]">Event</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function mergeUniqueById(existingItems, nextItems) {
  const seen = new Set(existingItems.map((item) => item.id));
  const merged = [...existingItems];
  for (const item of nextItems || []) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function threadSortTime(thread) {
  const value = thread?.last_message?.created_at || thread?.updated_at || "";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortThreadSummaries(threads) {
  return [...threads].sort((a, b) => {
    const diff = threadSortTime(b) - threadSortTime(a);
    if (diff !== 0) return diff;
    return studentName(a?.student).localeCompare(studentName(b?.student));
  });
}

function mergeThreadSummary(threads, summary) {
  if (!summary?.student_id) return threads;
  let found = false;
  const nextThreads = threads.map((thread) => {
    if (thread.student_id !== summary.student_id) return thread;
    found = true;
    return { ...thread, ...summary };
  });
  if (!found) nextThreads.push(summary);
  return sortThreadSummaries(nextThreads);
}

function ThreadEventsModal({ classroomId, studentId, initialEvents }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState({ hasMore: false, before: null });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async ({ before = null, append = false } = {}) => {
    if (!classroomId || !studentId) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        eventsOnly: "1",
        limit: "20",
        t: String(Date.now()),
      });
      if (before) params.set("before", before);
      const response = await get_with_token(`classroom/${classroomId}/student-threads/${studentId}?${params.toString()}`);
      if (response?.error) {
        setError(response.error);
        return;
      }
      const nextEvents = Array.isArray(response?.events) ? response.events : [];
      setEvents((currentEvents) => (
        append ? mergeUniqueById(currentEvents, nextEvents) : nextEvents
      ));
      setPage({
        hasMore: Boolean(response?.eventsPage?.hasMore),
        before: response?.eventsPage?.before || null,
      });
      setLoaded(true);
    } catch (err) {
      setError(err?.message || "Failed to load thread events");
      setLoaded(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [classroomId, studentId]);

  useEffect(() => {
    if (!open) return;
    if (!loaded) loadEvents();
  }, [loadEvents, loaded, open]);

  useEffect(() => {
    if (open) return;
    setEvents(Array.isArray(initialEvents) ? initialEvents : []);
    setPage({ hasMore: false, before: null });
    setError("");
    setLoaded(false);
  }, [initialEvents, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          Events
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Thread Events</DialogTitle>
          <DialogDescription>Classroom activity connected to this student thread.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 max-h-[60vh] pr-3">
          {loading && events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Loading events...</div>
          ) : error && events.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No events yet.</div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border bg-background p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className={`rounded-md ${eventTone[event.event_type] || ""}`}>
                      {eventLabels[event.event_type] || "Event"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDay(event.created_at)} {formatTime(event.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">
                    {event.body}
                  </p>
                </div>
              ))}
              {page.hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadEvents({ before: page.before, append: true })}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load older events"}
                  </Button>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatSubmissionReferenceType(reference) {
  if (reference?.type === "live_problem") return "Live submission";
  if (reference?.type === "topic_problem") return "Topic submission";
  return "Submission";
}

function formatSubmissionReferenceDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSubmissionReferenceStatus(status) {
  if (status === "pending_approval") return "Pending review";
  return status ? String(status).replace(/_/g, " ") : "Pending review";
}

function submissionReferenceKey(reference) {
  if (!reference || typeof reference !== "object") return "";
  const type = reference.type || "submission";
  const id =
    reference.class_problem_id ||
    reference.classProblemId ||
    reference.progress_id ||
    reference.progressId ||
    reference.problem_id ||
    reference.problemId ||
    "";
  return `${type}:${id}`;
}

function SubmissionReferenceChip({ reference, own = false, compact = false }) {
  if (!reference || typeof reference !== "object") return null;
  const problemTitle = reference.problem_title || reference.problemTitle || "Submitted problem";
  const context = reference.topic_title || reference.topicTitle || reference.class_name || reference.className || "";
  const submittedAt = formatSubmissionReferenceDate(reference.submitted_at || reference.submittedAt);

  return (
    <div
      className={`mb-2 rounded-lg border px-3 py-2 text-left text-xs ${
        own
          ? "border-white/30 bg-white/15 text-white"
          : "border-amber-500/30 bg-amber-500/10 text-foreground"
      } ${compact ? "max-w-full" : ""}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={`h-5 rounded-md px-1.5 text-[10px] ${own ? "border-white/35 bg-white/10 text-white" : "border-amber-500/30 text-amber-700 dark:text-amber-300"}`}
        >
          <File className="mr-1 h-3 w-3" />
          {formatSubmissionReferenceType(reference)}
        </Badge>
        <span className={own ? "text-white/80" : "text-muted-foreground"}>{formatSubmissionReferenceStatus(reference.status)}</span>
      </div>
      <p className="line-clamp-2 break-words font-semibold">{problemTitle}</p>
      {(context || submittedAt) && (
        <p className={`mt-1 line-clamp-1 break-words ${own ? "text-white/80" : "text-muted-foreground"}`}>
          {[context, submittedAt].filter(Boolean).join(" - ")}
        </p>
      )}
    </div>
  );
}

function AttachmentList({ attachments, classroomId, studentId, onError }) {
  const [openingId, setOpeningId] = useState("");

  const openAttachment = useCallback(async (attachment) => {
    setOpeningId(attachment.id);
    try {
      const response = await get_with_token(
        `classroom/${classroomId}/student-threads/${studentId}/attachments/${attachment.id}?t=${Date.now()}`
      );
      if (response?.error) {
        onError?.(response.error);
        return;
      }
      if (response?.url) {
        window.open(response.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      onError?.(error?.message || "Failed to open attachment");
    } finally {
      setOpeningId("");
    }
  }, [classroomId, onError, studentId]);

  if (!attachments?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => {
        const Icon = attachmentIcon(attachment.content_type);
        if (attachment.is_pending) {
          return (
            <div
              key={attachment.id}
              className="flex w-full max-w-xs items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-left text-xs opacity-80"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{attachment.original_filename}</span>
                <span className="block text-muted-foreground">{formatBytes(attachment.size_bytes)}</span>
              </span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          );
        }
        return (
          <button
            key={attachment.id}
            type="button"
            onClick={() => openAttachment(attachment)}
            className="flex w-full max-w-xs items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-left text-xs transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{attachment.original_filename}</span>
              <span className="block text-muted-foreground">{formatBytes(attachment.size_bytes)}</span>
            </span>
            {openingId === attachment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}

function ThreadMessage({ message, previousMessage, classroomId, studentId, onAttachmentError }) {
  const showDay = formatDay(message.created_at) !== formatDay(previousMessage?.created_at);
  const pending = message.delivery_status === "pending";
  const failed = message.delivery_status === "failed";
  const submissionReference = message.metadata?.submission_reference;
  const deleted = Boolean(message.deleted_at);
  const edited = Boolean(message.edited_at) && !deleted;

  if (message.kind === "system") {
    return (
      <>
        {showDay && <div className="py-2 text-center text-[11px] font-medium text-muted-foreground">{formatDay(message.created_at)}</div>}
        <div className="flex justify-center px-3 py-1">
          <div className="max-w-[88%] rounded-lg border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
            <div className="mb-1 flex justify-center">
              <Badge variant="outline" className={`rounded-md ${eventTone[message.event_type] || ""}`}>
                {eventLabels[message.event_type] || "Classroom event"}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap break-words text-foreground">{message.body}</p>
            <span className="mt-1 block text-[11px]">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </>
    );
  }

  const own = Boolean(message.is_own);
  return (
    <>
      {showDay && <div className="py-2 text-center text-[11px] font-medium text-muted-foreground">{formatDay(message.created_at)}</div>}
      <div className={`flex px-3 py-1.5 ${own ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[88%] sm:max-w-[72%] ${own ? "items-end" : "items-start"} flex flex-col`}>
          <div className={`rounded-2xl px-4 py-2 shadow-sm ${own ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border bg-background text-foreground"} ${pending ? "opacity-75" : ""} ${failed ? "ring-1 ring-red-400" : ""}`}>
            {!own && <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{message.sender_name}</p>}
            <SubmissionReferenceChip reference={submissionReference} own={own} />
            <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${deleted ? "italic opacity-75" : ""}`}>
              {message.body}
            </p>
            <AttachmentList
              attachments={message.attachments}
              classroomId={classroomId}
              studentId={studentId}
              onError={onAttachmentError}
            />
          </div>
          <span className={`mt-1 px-1 text-[11px] ${failed ? "text-red-500" : "text-muted-foreground"}`}>
            {pending ? "Sending..." : failed ? "Not sent" : `${formatTime(message.created_at)}${deleted ? " · deleted" : edited ? " · edited" : ""}`}
          </span>
        </div>
      </div>
    </>
  );
}

function ThreadPanel({
  classroomId,
  selectedThread,
  thread,
  student,
  submissionReference,
  messages,
  latestEvents,
  loading,
  error,
  safeAttachments,
  onRefresh,
  onRealtimeSignal,
  onRealtimeSubscribed,
  onRealtimeRenew,
  onSendText,
  onSendAttachment,
  onAttachmentError,
  onOpenBubble,
  onLoadOlderMessages,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  panelClassName = "",
}) {
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [fileError, setFileError] = useState("");
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const scrollViewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const preserveScrollRef = useRef(false);
  const activeSubmissionReferenceKey = submissionReferenceKey(submissionReference);
  const panelSizingClassName = panelClassName || "h-[42rem] min-h-[30rem] max-h-[calc(100vh-12rem)]";
  const eventItems = useMemo(() => {
    const seen = new Set();
    const items = [];
    const pushEvent = (event) => {
      if (!event?.id || seen.has(event.id)) return;
      seen.add(event.id);
      items.push(event);
    };
    (latestEvents || []).forEach(pushEvent);
    (messages || [])
      .filter((message) => message.kind === "system")
      .forEach(pushEvent);
    return items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [latestEvents, messages]);

  const realtimeState = useClassroomThreadRealtime({
    realtime: thread?.realtime,
    eventName: thread?.realtime?.event || "thread_changed",
    onSignal: useCallback((signal) => {
      const viewport = scrollViewportRef.current;
      if (!isNearBottom(viewport)) setHasNewActivity(true);
      if (onRealtimeSignal) onRealtimeSignal(signal);
      else onRefresh?.({ keepPosition: true });
    }, [onRealtimeSignal, onRefresh]),
    onSubscribed: onRealtimeSubscribed,
    onRenew: onRealtimeRenew,
  });

  const liveLabel = realtimeState.status === "connected"
    ? "Live"
    : realtimeState.status === "reconnecting"
      ? "Reconnecting"
      : realtimeState.status === "connecting"
        ? "Connecting"
        : realtimeState.status === "unavailable"
          ? "Offline"
          : "";

  const scrollToBottom = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
    setHasNewActivity(false);
  }, []);

  useEffect(() => {
    if (preserveScrollRef.current) return;
    if (!loading && messages.length > 0 && !hasNewActivity) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [hasNewActivity, loading, messages.length, scrollToBottom]);

  useEffect(() => {
    setMessageText("");
    setSelectedFile(null);
    setFileError("");
    setHasNewActivity(false);
  }, [activeSubmissionReferenceKey, selectedThread?.student_id]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0] || null;
    setFileError("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const maxBytes = safeAttachments?.maxBytes || 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError(`File must be ${formatBytes(maxBytes)} or smaller.`);
      event.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }, [safeAttachments?.maxBytes]);

  const submit = useCallback(async () => {
    const text = messageText.trim();
    const file = selectedFile;
    if (!text && !file) return;
    setFileError("");
    setMessageText("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    requestAnimationFrame(scrollToBottom);

    if (file) setSending(true);

    const sendPromise = file
      ? onSendAttachment(text, file, submissionReference)
      : onSendText(text, submissionReference);

    sendPromise
      .then((response) => {
        if (!response?.error) return;
        setFileError(response.error);
        if (!file) setMessageText(text);
        if (file) setSelectedFile(file);
      })
      .catch((error) => {
        setFileError(error?.message || "Message could not be sent");
        if (!file) setMessageText(text);
        if (file) setSelectedFile(file);
      })
      .finally(() => {
        if (file) setSending(false);
      });
  }, [messageText, onSendAttachment, onSendText, scrollToBottom, selectedFile, submissionReference]);

  const disabledComposer = sending || (!messageText.trim() && !selectedFile);
  const canOpenBubble = Boolean(onOpenBubble && selectedThread?.student_id);

  const loadOlder = useCallback(async () => {
    if (!onLoadOlderMessages || loadingOlderMessages) return;
    const viewport = scrollViewportRef.current;
    const previousScrollHeight = viewport?.scrollHeight || 0;
    const previousScrollTop = viewport?.scrollTop || 0;
    preserveScrollRef.current = true;
    try {
      await onLoadOlderMessages();
      requestAnimationFrame(() => {
        const nextViewport = scrollViewportRef.current;
        if (!nextViewport) return;
        nextViewport.scrollTop = nextViewport.scrollHeight - previousScrollHeight + previousScrollTop;
      });
    } finally {
      requestAnimationFrame(() => {
        preserveScrollRef.current = false;
      });
    }
  }, [loadingOlderMessages, onLoadOlderMessages]);

  if (!selectedThread) {
    return (
      <div className="grid min-h-[28rem] place-items-center rounded-lg border border-dashed bg-background p-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
            <MessageCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No thread selected</p>
            <p className="text-xs text-muted-foreground">Choose an active student.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border bg-background ${panelSizingClassName}`}>
      <div className="shrink-0 border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{studentName(student)}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Private classroom thread</span>
              {liveLabel && (
                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                  {liveLabel}
                </Badge>
              )}
            </div>
            {submissionReference && (
              <div className="mt-3 max-w-xl">
                <SubmissionReferenceChip reference={submissionReference} compact />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canOpenBubble && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onOpenBubble({
                  classroomId,
                  studentId: selectedThread.student_id,
                  student,
                  submissionReference,
                })}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Open bubble
              </Button>
            )}
            <ThreadEventsModal
              classroomId={classroomId}
              studentId={selectedThread.student_id}
              initialEvents={eventItems}
            />
            <ThreadRefreshButton onRefresh={() => onRefresh?.({ keepPosition: false })} loading={loading} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="min-h-[25rem] py-4">
          {loading && messages.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading thread...
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-56 place-items-center px-6 text-center text-sm text-muted-foreground">
              <div>
                <MessageCircle className="mx-auto mb-2 h-8 w-8" />
                <p>No messages yet.</p>
              </div>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <div className="flex justify-center px-3 pb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={loadOlder}
                    disabled={loadingOlderMessages}
                  >
                    {loadingOlderMessages ? "Loading..." : "Load older messages"}
                  </Button>
                </div>
              )}
              {messages.map((message, index) => (
                <ThreadMessage
                  key={message.id}
                  message={message}
                  previousMessage={messages[index - 1]}
                  classroomId={classroomId}
                  studentId={selectedThread.student_id}
                  onAttachmentError={onAttachmentError}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {hasNewActivity && (
        <div className="flex justify-center border-t bg-muted/30 py-2">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={scrollToBottom}>
            <ArrowDownCircle className="h-4 w-4" />
            Latest
          </Button>
        </div>
      )}

      <div className="border-t p-3">
        {(fileError || error) && fileError && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{selectedFile.name}</span>
            <span className="text-muted-foreground">{formatBytes(selectedFile.size)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={safeAttachments?.accept || DEFAULT_ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Message"
            className="max-h-32 min-h-10 resize-none overflow-y-auto rounded-2xl"
            maxLength={4000}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={submit}
            disabled={disabledComposer}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedFile ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClassroomThreadsTab({
  classroomId,
  isTrainer,
  currentUser,
  forcedStudentId = "",
  forcedStudent = null,
  submissionReference = null,
  showHeader = true,
  showList = true,
  frame = true,
  panelClassName = "",
  onOpenBubble,
}) {
  const [threads, setThreads] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(forcedStudentId || "");
  const [thread, setThread] = useState(null);
  const [student, setStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [optimisticMessages, dispatchOptimisticMessage] = useOptimisticThreadMessages(messages);
  const [latestEvents, setLatestEvents] = useState([]);
  const [messagePage, setMessagePage] = useState({ hasMore: false, before: null });
  const [listRealtime, setListRealtime] = useState(null);
  const [safeAttachments, setSafeAttachments] = useState({
    accept: DEFAULT_ATTACHMENT_ACCEPT,
    maxBytes: 10 * 1024 * 1024,
  });
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const activeStudentIdRef = useRef(forcedStudentId || "");
  const threadLoadGenerationRef = useRef(0);
  const highestRevisionRef = useRef(0);
  const catchupInFlightRef = useRef(null);
  const catchupQueuedAfterRef = useRef(null);

  const selectedThread = useMemo(() => {
    return threads.find((item) => item.student_id === selectedStudentId) || (
      forcedStudentId
        ? { student_id: forcedStudentId, student: forcedStudent || student || currentUser }
        : null
    );
  }, [currentUser, forcedStudent, forcedStudentId, selectedStudentId, student, threads]);
  const selectedThreadRef = useRef(null);

  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  useEffect(() => {
    if (forcedStudentId) setSelectedStudentId(forcedStudentId);
  }, [forcedStudentId]);

  useEffect(() => {
    const activeStudentId = forcedStudentId || selectedStudentId || (!isTrainer ? currentUser?.id : "");
    activeStudentIdRef.current = activeStudentId;
    threadLoadGenerationRef.current += 1;
    highestRevisionRef.current = 0;
    catchupInFlightRef.current = null;
    catchupQueuedAfterRef.current = null;
    setThread(null);
    setStudent(null);
    setMessages([]);
    setLatestEvents([]);
    setMessagePage({ hasMore: false, before: null });
    setThreadLoading(false);
    setOlderMessagesLoading(false);
    setError("");
    dispatchOptimisticMessage({ type: "clear" });
  }, [
    currentUser?.id,
    dispatchOptimisticMessage,
    forcedStudentId,
    isTrainer,
    selectedStudentId,
    submissionReference,
  ]);

  const loadList = useCallback(async ({ withoutRealtime = false } = {}) => {
    if (!classroomId) return;
    if (!showList) {
      setListLoading(false);
      setListRealtime(null);
      if (forcedStudentId) setSelectedStudentId(forcedStudentId);
      return;
    }
    if (!withoutRealtime) setListLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (withoutRealtime) params.set("realtime", "0");
      const response = await get_uncached_with_token(`classroom/${classroomId}/student-threads?${params.toString()}`);
      if (response?.error) {
        setError(response.error);
        if (!withoutRealtime) {
          setThreads([]);
          setListRealtime(null);
        }
        return;
      }
      const nextThreads = Array.isArray(response?.threads) ? response.threads : [];
      setThreads(nextThreads);
      if (!withoutRealtime) setListRealtime(response?.realtime || null);
      setSafeAttachments(response?.safeAttachments || {
        accept: DEFAULT_ATTACHMENT_ACCEPT,
        maxBytes: 10 * 1024 * 1024,
      });
      setSelectedStudentId((currentStudentId) => {
        if (!isTrainer && response?.ownStudentId) return response.ownStudentId;
        if (!currentStudentId && nextThreads.length > 0) return nextThreads[0].student_id;
        return currentStudentId;
      });
    } catch (err) {
      setError(err?.message || "Failed to load threads");
      if (!withoutRealtime) {
        setThreads([]);
        setListRealtime(null);
      }
    } finally {
      if (!withoutRealtime) setListLoading(false);
    }
  }, [classroomId, forcedStudentId, isTrainer, showList]);

  const appendDeliveredMessage = useCallback((message, studentId, summary = null, options = {}) => {
    if (!message?.id || !studentId || activeStudentIdRef.current !== studentId) return;
    const updateThreadSummary = options.updateThreadSummary !== false;
    const deliveredMessage = {
      ...message,
      is_own: message.sender_id === currentUser?.id,
      metadata: {
        ...(message.metadata || {}),
        ...(message.client_message_id ? { client_message_id: message.client_message_id } : {}),
      },
    };
    const revision = Number(deliveredMessage.thread_revision || 0);
    if (Number.isSafeInteger(revision) && revision > highestRevisionRef.current) {
      highestRevisionRef.current = revision;
    }

    setMessages((currentMessages) => {
      const nextMessages = currentMessages.some((item) => item.id === deliveredMessage.id)
        ? currentMessages.map((item) => (
            item.id === deliveredMessage.id
              ? { ...item, ...deliveredMessage }
              : item
          ))
        : [...currentMessages, deliveredMessage];
      return nextMessages.sort((a, b) => {
        const aRevision = Number(a.thread_revision || 0);
        const bRevision = Number(b.thread_revision || 0);
        if (aRevision && bRevision && aRevision !== bRevision) return aRevision - bRevision;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });
    });

    if (deliveredMessage.kind === "system") {
      setLatestEvents((currentEvents) => {
        if (currentEvents.some((item) => item.id === deliveredMessage.id)) {
          return currentEvents.map((item) => (
            item.id === deliveredMessage.id
              ? { ...item, ...deliveredMessage }
              : item
          ));
        }
        return [deliveredMessage, ...currentEvents].slice(0, 6);
      });
    }

    if (updateThreadSummary) {
      setThread((currentThread) => currentThread ? {
        ...currentThread,
        revision: Math.max(Number(currentThread.revision || 0), revision),
        updated_at: deliveredMessage.created_at || currentThread.updated_at,
      } : currentThread);

      setThreads((currentThreads) => {
        if (summary?.student_id) return mergeThreadSummary(currentThreads, summary);
        let changed = false;
        const nextThreads = currentThreads.map((item) => {
          if (item.student_id !== studentId) return item;
          changed = true;
          return {
            ...item,
            revision: Math.max(Number(item.revision || 0), revision),
            updated_at: deliveredMessage.created_at || item.updated_at,
            last_message: {
              id: deliveredMessage.id,
              kind: deliveredMessage.kind,
              event_type: deliveredMessage.event_type,
              body: deliveredMessage.body,
              created_at: deliveredMessage.created_at,
              sender_name: deliveredMessage.sender_name || "",
            },
          };
        });
        return changed ? sortThreadSummaries(nextThreads) : currentThreads;
      });
    }
  }, [currentUser?.id]);

  const loadThread = useCallback(async (options = {}) => {
    const studentId = forcedStudentId || selectedStudentId || (!isTrainer ? currentUser?.id : "");
    if (!classroomId || !studentId) return;
    const generation = threadLoadGenerationRef.current;
    const before = options.before || "";
    const appendOlder = Boolean(before);
    if (appendOlder) setOlderMessagesLoading(true);
    else setThreadLoading(true);
    try {
      const params = new URLSearchParams({
        messageLimit: "40",
        t: String(Date.now()),
      });
      if (before) {
        params.set("before", before);
        params.set("realtime", "0");
      }
      const response = await get_uncached_with_token(
        `classroom/${classroomId}/student-threads/${studentId}?${params.toString()}`
      );
      if (generation !== threadLoadGenerationRef.current || activeStudentIdRef.current !== studentId) return;
      if (response?.error) {
        setError(response.error);
        if (!appendOlder) {
          setThread(null);
          setMessages([]);
          setLatestEvents([]);
          setMessagePage({ hasMore: false, before: null });
        }
        return;
      }
      setError("");
      setThread((currentThread) => appendOlder
        ? currentThread
        : (response.thread || null));
      setStudent(response.student || selectedThreadRef.current?.student || null);
      const nextMessages = (Array.isArray(response.messages) ? response.messages : []).map((message) => ({
        ...message,
        is_own: message.sender_id === currentUser?.id,
      }));
      if (!appendOlder) {
        highestRevisionRef.current = Math.max(
          Number(response?.thread?.revision || 0),
          ...nextMessages.map((message) => Number(message.thread_revision || 0))
        );
      }
      setMessages((currentMessages) => (
        appendOlder
          ? mergeUniqueById(nextMessages, currentMessages)
          : nextMessages
      ));
      if (!appendOlder) setLatestEvents(Array.isArray(response.latestEvents) ? response.latestEvents : []);
      setMessagePage({
        hasMore: Boolean(response?.messagesPage?.hasMore),
        before: response?.messagesPage?.before || null,
      });
      if (response?.safeAttachments) setSafeAttachments(response.safeAttachments);
    } catch (err) {
      if (generation === threadLoadGenerationRef.current && activeStudentIdRef.current === studentId) {
        setError(err?.message || "Failed to load thread");
      }
    } finally {
      if (generation === threadLoadGenerationRef.current && activeStudentIdRef.current === studentId) {
        setThreadLoading(false);
        setOlderMessagesLoading(false);
      }
    }
  }, [classroomId, currentUser?.id, forcedStudentId, isTrainer, selectedStudentId]);

  const loadOlderMessages = useCallback(() => {
    if (!messagePage.hasMore || !messagePage.before) return Promise.resolve();
    return loadThread({ before: messagePage.before });
  }, [loadThread, messagePage.before, messagePage.hasMore]);

  const renewListRealtime = useCallback(async () => {
    const response = await post_uncached_with_token(
      `classroom/${classroomId}/student-threads/realtime`,
      { scope: "manager_list" }
    );
    if (response?.error || !response?.realtime) {
      throw new Error(response?.error || "Could not renew the thread list subscription");
    }
    setListRealtime(response.realtime);
    return response.realtime;
  }, [classroomId]);

  useClassroomThreadRealtime({
    realtime: isTrainer && showList ? listRealtime : null,
    eventName: listRealtime?.event || "thread_changed",
    onSignal: useCallback((signal) => {
      if (signal?.summary?.student_id) {
        setThreads((currentThreads) => mergeThreadSummary(currentThreads, signal.summary));
      }
    }, []),
    onSubscribed: useCallback(() => loadList({ withoutRealtime: true }), [loadList]),
    onRenew: renewListRealtime,
  });

  const catchUpThreadMessages = useCallback((requestedAfterRevision = null) => {
    if (catchupInFlightRef.current) {
      const queuedAfter = requestedAfterRevision === null
        ? highestRevisionRef.current
        : Math.max(0, Number(requestedAfterRevision) || 0);
      catchupQueuedAfterRef.current = catchupQueuedAfterRef.current === null
        ? queuedAfter
        : Math.min(catchupQueuedAfterRef.current, queuedAfter);
      return catchupInFlightRef.current;
    }
    const studentId = activeStudentIdRef.current;
    const generation = threadLoadGenerationRef.current;
    const expectedThreadId = thread?.id;
    if (!classroomId || !studentId || !expectedThreadId) return Promise.resolve();

    const initialRevision = requestedAfterRevision !== null
      && Number.isSafeInteger(Number(requestedAfterRevision))
      ? Math.max(0, Number(requestedAfterRevision))
      : highestRevisionRef.current;
    const request = (async () => {
      let afterRevision = initialRevision;
      for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
        const params = new URLSearchParams({
          afterRevision: String(afterRevision),
          limit: "100",
          t: String(Date.now()),
        });
        const response = await get_uncached_with_token(
          `classroom/${classroomId}/student-threads/${studentId}/messages?${params.toString()}`
        );
        if (generation !== threadLoadGenerationRef.current || activeStudentIdRef.current !== studentId) return;
        if (response?.error) throw new Error(response.error);
        if (response?.threadId !== expectedThreadId) return;

        const recoveredMessages = Array.isArray(response?.messages) ? response.messages : [];
        for (const recoveredMessage of recoveredMessages) {
          appendDeliveredMessage(recoveredMessage, studentId);
          const clientMessageId = recoveredMessage?.client_message_id
            || recoveredMessage?.metadata?.client_message_id;
          if (clientMessageId) dispatchOptimisticMessage({ type: "resolve", id: clientMessageId });
        }

        const nextRevision = Number(response?.page?.afterRevision || afterRevision);
        if (!response?.page?.hasMore || nextRevision <= afterRevision) return;
        afterRevision = nextRevision;
      }
      throw new Error("Thread catch-up exceeded the safe page limit");
    })()
      .catch((catchupError) => {
        if (generation === threadLoadGenerationRef.current && activeStudentIdRef.current === studentId) {
          setError(catchupError?.message || "Failed to recover missed thread messages");
        }
      })
      .finally(() => {
        if (catchupInFlightRef.current === request) {
          catchupInFlightRef.current = null;
          const queuedAfter = catchupQueuedAfterRef.current;
          catchupQueuedAfterRef.current = null;
          if (
            queuedAfter !== null
            && generation === threadLoadGenerationRef.current
            && activeStudentIdRef.current === studentId
          ) {
            void catchUpThreadMessages(queuedAfter);
          }
        }
      });
    catchupInFlightRef.current = request;
    return request;
  }, [appendDeliveredMessage, classroomId, dispatchOptimisticMessage, thread?.id]);

  const renewThreadRealtime = useCallback(async () => {
    const studentId = activeStudentIdRef.current;
    if (!studentId) throw new Error("No student thread selected");
    const response = await post_uncached_with_token(
      `classroom/${classroomId}/student-threads/realtime`,
      { scope: "thread", studentId }
    );
    if (response?.error || !response?.realtime) {
      throw new Error(response?.error || "Could not renew the thread subscription");
    }
    if (response.threadId !== thread?.id) throw new Error("Thread changed during Realtime renewal");
    setThread((currentThread) => currentThread?.id === response.threadId
      ? { ...currentThread, realtime: response.realtime }
      : currentThread);
    return response.realtime;
  }, [classroomId, thread?.id]);

  const handleThreadRealtimeSignal = useCallback((signal) => {
    const activeStudentId = activeStudentIdRef.current;

    if (!classroomId || !activeStudentId) return;
    if (signal?.student_id && signal.student_id !== activeStudentId) return;
    if (signal?.thread_id && thread?.id && signal.thread_id !== thread.id) return;
    const previousRevision = highestRevisionRef.current;
    const deliveredMessage = signal?.message;
    const deliveredRevision = Number(deliveredMessage?.thread_revision || signal?.thread_revision || 0);
    const isMutationDelta = signal?.type === "message_edited" || signal?.type === "message_deleted";
    if (deliveredMessage?.id) {
      appendDeliveredMessage(
        deliveredMessage,
        activeStudentId,
        isMutationDelta ? null : signal?.summary || null,
        { updateThreadSummary: !isMutationDelta }
      );
      const clientMessageId = deliveredMessage.client_message_id
        || deliveredMessage.metadata?.client_message_id;
      if (clientMessageId) dispatchOptimisticMessage({ type: "resolve", id: clientMessageId });
    }
    if (!deliveredMessage?.id || (deliveredRevision > 0 && deliveredRevision > previousRevision + 1)) {
      void catchUpThreadMessages(previousRevision);
    }
  }, [
    appendDeliveredMessage,
    catchUpThreadMessages,
    classroomId,
    dispatchOptimisticMessage,
    thread?.id,
  ]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const sendText = useCallback(async (text, activeSubmissionReference = null) => {
    const studentId = forcedStudentId || selectedStudentId || (!isTrainer ? currentUser?.id : "");
    if (!studentId) return { error: "No student thread selected" };
    const optimisticId = createOptimisticMessageId();
    dispatchOptimisticMessage({
      type: "add",
      message: buildOptimisticMessage({
        id: optimisticId,
        text,
        threadId: thread?.id,
        currentUser,
        submissionReference: activeSubmissionReference,
      }),
    });

    try {
      const payload = {
        message: text,
        clientMessageId: optimisticId,
      };
      if (activeSubmissionReference) payload.submissionReference = activeSubmissionReference;
      const response = await post_uncached_with_token(
        `classroom/${classroomId}/student-threads/${studentId}/messages`,
        payload
      );
      if (response?.error) {
        dispatchOptimisticMessage({ type: "fail", id: optimisticId, error: response.error });
        return response;
      }
      if (response?.message) {
        appendDeliveredMessage(response.message, studentId, response.summary || null);
        dispatchOptimisticMessage({ type: "resolve", id: optimisticId });
      }
      return response;
    } catch (error) {
      const message = error?.message || "Message could not be sent";
      dispatchOptimisticMessage({ type: "fail", id: optimisticId, error: message });
      return { error: message };
    }
  }, [appendDeliveredMessage, classroomId, currentUser, dispatchOptimisticMessage, forcedStudentId, isTrainer, selectedStudentId, thread?.id]);

  const sendAttachment = useCallback(async (text, file, activeSubmissionReference = null) => {
    const studentId = forcedStudentId || selectedStudentId || (!isTrainer ? currentUser?.id : "");
    if (!studentId) return { error: "No student thread selected" };
    const optimisticId = createOptimisticMessageId();
    dispatchOptimisticMessage({
      type: "add",
      message: buildOptimisticMessage({
        id: optimisticId,
        text,
        file,
        threadId: thread?.id,
        currentUser,
        submissionReference: activeSubmissionReference,
      }),
    });

    const formData = new FormData();
    formData.append("message", text || "");
    formData.append("clientMessageId", optimisticId);
    if (activeSubmissionReference) formData.append("submissionReference", JSON.stringify(activeSubmissionReference));
    formData.append("file", file);
    try {
      const response = await post_form_with_token(`classroom/${classroomId}/student-threads/${studentId}/attachments`, formData);
      if (response?.error) {
        dispatchOptimisticMessage({ type: "fail", id: optimisticId, error: response.error });
        return response;
      }
      if (response?.message) {
        appendDeliveredMessage(response.message, studentId, response.summary || null);
        dispatchOptimisticMessage({ type: "resolve", id: optimisticId });
      }
      return response;
    } catch (error) {
      const message = error?.message || "File could not be sent";
      dispatchOptimisticMessage({ type: "fail", id: optimisticId, error: message });
      return { error: message };
    }
  }, [appendDeliveredMessage, classroomId, currentUser, dispatchOptimisticMessage, forcedStudentId, isTrainer, selectedStudentId, thread?.id]);

  const content = (
    <>
      {showHeader && (
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4" />
                Threads
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {isTrainer ? "One classroom conversation per active student." : "Your private classroom conversation."}
              </p>
            </div>
            {showList && (
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={loadList} disabled={listLoading}>
                <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={frame ? "p-4" : "p-0"}>
        {error && !thread && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showList && listLoading && threads.length === 0 ? (
          <div className="grid min-h-[26rem] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading threads...
          </div>
        ) : isTrainer && showList ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <ThreadList
              threads={threads}
              selectedStudentId={selectedStudentId}
              search={search}
              onSearchChange={setSearch}
              onSelect={setSelectedStudentId}
            />
            <ThreadPanel
              classroomId={classroomId}
              selectedThread={selectedThread}
              thread={thread}
              student={student || selectedThread?.student}
              submissionReference={submissionReference}
              messages={optimisticMessages}
              latestEvents={latestEvents}
              loading={threadLoading}
              error={thread ? error : ""}
              safeAttachments={safeAttachments}
              onRefresh={loadThread}
              onRealtimeSignal={handleThreadRealtimeSignal}
              onRealtimeSubscribed={catchUpThreadMessages}
              onRealtimeRenew={renewThreadRealtime}
              onSendText={sendText}
              onSendAttachment={sendAttachment}
              onAttachmentError={setError}
              onOpenBubble={onOpenBubble}
              onLoadOlderMessages={loadOlderMessages}
              hasMoreMessages={messagePage.hasMore}
              loadingOlderMessages={olderMessagesLoading}
              panelClassName={panelClassName}
            />
          </div>
        ) : (
          <ThreadPanel
            classroomId={classroomId}
            selectedThread={selectedThread || { student_id: selectedStudentId || currentUser?.id }}
            thread={thread}
            student={student || selectedThread?.student || currentUser}
            submissionReference={submissionReference}
            messages={optimisticMessages}
            latestEvents={latestEvents}
            loading={threadLoading}
            error={thread ? error : ""}
            safeAttachments={safeAttachments}
            onRefresh={loadThread}
            onRealtimeSignal={handleThreadRealtimeSignal}
            onRealtimeSubscribed={catchUpThreadMessages}
            onRealtimeRenew={renewThreadRealtime}
            onSendText={sendText}
            onSendAttachment={sendAttachment}
            onAttachmentError={setError}
            onOpenBubble={onOpenBubble}
            onLoadOlderMessages={loadOlderMessages}
            hasMoreMessages={messagePage.hasMore}
            loadingOlderMessages={olderMessagesLoading}
            panelClassName={panelClassName}
          />
        )}
      </CardContent>
    </>
  );

  if (!frame) return content;

  return (
    <Card className="rounded-lg border">
      {content}
    </Card>
  );
}
