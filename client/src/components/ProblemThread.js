"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Heart,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { get_with_token, post_with_token } from "@/lib/action";
import MarkdownRender from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MAX_MESSAGE_LENGTH = 5000;
const reactionOptions = [
  { id: "like", label: "Like", Icon: ThumbsUp },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "insight", label: "Insight", Icon: Lightbulb },
  { id: "done", label: "Done", Icon: CheckCircle2 },
];

function normalizeMessages(payload) {
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function scopeLabel(problemType) {
  return String(problemType || "class_problem")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sameId(left, right) {
  if (!left || !right) return false;
  return String(left) === String(right);
}

function senderName(message, isOwn) {
  if (isOwn) return "You";
  return message.sender_name || message.user_name || message.name || "Classroom member";
}

function initialsFor(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CM";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function messageBody(message) {
  return message.message || message.body || "";
}

function messageTime(message) {
  const raw = message.created_at || message.createdAt || message.sent_at || message.updated_at;
  if (!raw) return "Just now";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function reactionCount(message, reaction) {
  return (message.reactions || []).filter((item) => item.reaction === reaction).length;
}

function reactedByMe(message, reaction) {
  return (message.reactions || []).some((item) => item.reaction === reaction && item.reacted_by_me);
}

function ThreadLoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className={cn("flex gap-3", item === 1 && "justify-end")}>
          {item !== 1 && <Skeleton className="h-9 w-9 rounded-full" />}
          <div className={cn("w-[72%] space-y-2", item === 1 && "flex flex-col items-end")}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-6 w-36" />
          </div>
          {item === 1 && <Skeleton className="h-9 w-9 rounded-full" />}
        </div>
      ))}
    </div>
  );
}

function EmptyThreadState({ error }) {
  const hasError = Boolean(error);
  return (
    <div className="flex min-h-[260px] items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-3">
        <div
          className={cn(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-lg border",
            hasError ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300" : "bg-background text-primary"
          )}
        >
          {hasError ? <AlertCircle className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{hasError ? "Thread could not load" : "No messages yet"}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {hasError ? error : "Start with the first question, hint, or feedback."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProblemThread({ classroomId, problemId, problemType = "class_problem", classId, assignmentId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reactingKey, setReactingKey] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const currentUserId = currentUser?.id || currentUser?.user_id || "";

  const loadThread = useCallback(async () => {
    if (!classroomId || !problemId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ problemType });
      if (classId) query.set("classId", classId);
      if (assignmentId) query.set("assignmentId", assignmentId);
      const response = await get_with_token(`classroom/${classroomId}/problem-thread/${problemId}?${query.toString()}`);
      if (response?.error) {
        setMessages([]);
        setError(response.error);
      } else {
        setThreadMeta(response?.thread || null);
        setMessages(normalizeMessages(response));
      }
    } catch (err) {
      setMessages([]);
      setError(err?.message || "Failed to load thread");
    } finally {
      setLoading(false);
    }
  }, [assignmentId, classId, classroomId, problemId, problemType]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [loading, messages.length]);

  const canPost = useMemo(() => {
    if (!classroomId || !problemId || !draft.trim()) return false;
    return true;
  }, [classroomId, draft, problemId]);

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();
    if (!canPost) return;
    setSending(true);
    setError("");
    try {
      const response = await post_with_token(`classroom/${classroomId}/problem-thread/${problemId}`, {
        classId,
        assignmentId,
        problem_type: problemType,
        message: draft.trim(),
      });
      if (response?.error) {
        setError(response.error);
      } else {
        setDraft("");
        const nextMessage = response?.message || response?.result;
        if (nextMessage) {
          setMessages((items) => [...items, nextMessage]);
        } else {
          loadThread();
        }
      }
    } catch (err) {
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [assignmentId, canPost, classId, classroomId, draft, loadThread, problemId, problemType]);

  const sendWithKeyboard = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      sendMessage(event);
    }
  }, [sendMessage]);

  const toggleReaction = useCallback(async (messageId, reaction) => {
    if (!messageId) return;
    const nextKey = `${messageId}:${reaction}`;
    setReactingKey(nextKey);
    setError("");
    try {
      const response = await post_with_token(`classroom/${classroomId}/problem-thread/reaction`, { messageId, reaction });
      if (response?.error) {
        setError(response.error);
      } else {
        loadThread();
      }
    } catch (err) {
      setError(err?.message || "Failed to update reaction");
    } finally {
      setReactingKey("");
    }
  }, [classroomId, loadThread]);

  const messageCountLabel = `${messages.length} ${messages.length === 1 ? "message" : "messages"}`;
  const scope = scopeLabel(threadMeta?.problem_type || problemType);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="border-b bg-muted/25 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-primary shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-5">Problem thread</p>
                  <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide">
                    {scope}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{messageCountLabel}</span>
                  {assignmentId && (
                    <>
                      <span aria-hidden="true">/</span>
                      <span>Assignment thread</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={loadThread}
                  disabled={loading}
                  aria-label="Refresh thread"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh thread</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <ScrollArea className="min-h-[180px] border-b bg-muted/15" style={{ height: "clamp(180px, calc(92vh - 350px), 390px)" }}>
          {loading ? (
            <ThreadLoadingState />
          ) : messages.length === 0 ? (
            <EmptyThreadState error={error} />
          ) : (
            <div className="space-y-4 p-4">
              {messages.map((message) => {
                const isOwn = sameId(message.user_id || message.sender_id, currentUserId);
                const name = senderName(message, isOwn);
                const body = messageBody(message);
                const kindLabel = message.is_solution ? "Solution" : message.kind && message.kind !== "message" ? scopeLabel(message.kind) : "";
                return (
                  <div key={message.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                    <Avatar className="mt-1 h-9 w-9 border bg-background">
                      <AvatarFallback
                        className={cn(
                          "text-[11px] font-semibold",
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isOwn ? <UserRound className="h-4 w-4" /> : initialsFor(name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn("min-w-0 flex-1 space-y-1.5", isOwn && "flex flex-col items-end")}>
                      <div className={cn("flex flex-wrap items-center gap-2 text-xs", isOwn && "justify-end")}>
                        <span className="font-semibold text-foreground">{name}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {messageTime(message)}
                        </span>
                        {kindLabel && (
                          <Badge
                            variant={message.is_solution ? "default" : "secondary"}
                            className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide"
                          >
                            {kindLabel}
                          </Badge>
                        )}
                      </div>

                      <div
                        className={cn(
                          "max-w-[min(92%,42rem)] overflow-hidden rounded-lg border px-3.5 py-3 text-sm shadow-sm",
                          isOwn
                            ? "border-primary/25 bg-primary text-primary-foreground"
                            : "border-border/70 bg-background"
                        )}
                      >
                        <MarkdownRender
                          content={body}
                          allowRawHtml={false}
                          useDefaultWidth={false}
                          className={cn(
                            "prose-sm max-w-none break-words leading-relaxed prose-p:my-1 prose-pre:my-2 prose-pre:max-w-full prose-pre:overflow-x-auto prose-code:break-words",
                            isOwn && "dark:prose-invert prose-headings:text-primary-foreground prose-a:text-primary-foreground prose-strong:text-primary-foreground"
                          )}
                        />
                      </div>

                      <div className={cn("flex flex-wrap items-center gap-1", isOwn && "justify-end")}>
                        {reactionOptions.map((option) => {
                          const ReactionIcon = option.Icon;
                          const count = reactionCount(message, option.id);
                          const active = reactedByMe(message, option.id);
                          const busy = reactingKey === `${message.id}:${option.id}`;
                          return (
                            <Tooltip key={option.id}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant={active ? "secondary" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "h-7 min-w-7 rounded-full px-2 text-xs",
                                    active && "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                                  )}
                                  onClick={() => toggleReaction(message.id, option.id)}
                                  disabled={busy}
                                  aria-label={`${option.label} reaction${count ? `, ${count}` : ""}`}
                                >
                                  <ReactionIcon className="h-3.5 w-3.5" />
                                  {count > 0 && <span className="min-w-3 text-[11px] tabular-nums">{count}</span>}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{option.label}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                </div>
              );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {error && messages.length > 0 && (
          <div className="flex items-start gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={sendMessage} className="bg-background p-4">
          <div className="rounded-lg border bg-muted/20 p-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={sendWithKeyboard}
              placeholder="Ask a question or reply about this problem..."
              className="min-h-20 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <Separator className="my-2" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span
                className={cn(
                  "px-1 text-xs text-muted-foreground",
                  draft.length > MAX_MESSAGE_LENGTH - 300 && "font-medium text-amber-600 dark:text-amber-300"
                )}
              >
                {draft.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <Button type="submit" size="sm" className="gap-2 sm:self-end" disabled={!canPost || sending}>
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
