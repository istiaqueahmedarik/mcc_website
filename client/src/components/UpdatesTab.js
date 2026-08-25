"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, CheckCheck, Clock, Inbox, RefreshCw } from "lucide-react";
import { get_with_token, post_with_token } from "@/lib/action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const UPDATE_PAGE_SIZE = 30;

const updateLabels = {
  time_exceeded: "Time exceeded",
  student_solution_submitted: "Solution submitted",
  student_needs_review: "Needs review",
  problem_progress_changed: "Progress changed",
  new_problem: "New problem",
  teacher_feedback: "Teacher feedback",
  thread_reply: "Thread reply",
  solution_status_changed: "Status changed",
  topic_or_resource_updated: "Topic updated",
};

const updateTone = {
  time_exceeded: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  student_solution_submitted: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  student_needs_review: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  problem_progress_changed: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  new_problem: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  teacher_feedback: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  thread_reply: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  solution_status_changed: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  topic_or_resource_updated: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
};

function formatTime(value) {
  if (!value) return "No time recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No time recorded";
  return date.toLocaleString();
}

function getUpdateTimestamp(update) {
  return update.created_at || update.updated_at || update.assigned_at || update.submitted_at || update.timestamp;
}

function normalizeUpdates(payload) {
  if (Array.isArray(payload?.updates)) return payload.updates;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function mergeUpdates(currentUpdates, nextUpdates) {
  const seen = new Set(currentUpdates.map((update) => update.update_key || update.id).filter(Boolean));
  const merged = [...currentUpdates];
  for (const update of nextUpdates || []) {
    const key = update.update_key || update.id;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(update);
  }
  return merged;
}

export function UpdatesTab({ classroomId, active = true }) {
  const scrollViewportRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const loadInFlightRef = useRef(false);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [markingKey, setMarkingKey] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [page, setPage] = useState({ offset: 0, hasMore: false });

  const loadUpdates = useCallback(async ({ append = false } = {}) => {
    if (!classroomId) return;
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const offset = append ? updates.length : 0;
      const response = await get_with_token(
        `classroom/${classroomId}/updates?limit=${UPDATE_PAGE_SIZE}&offset=${offset}&t=${Date.now()}`
      );
      if (response?.error) {
        setError(response.error);
        if (!append) setUpdates([]);
      } else {
        const nextUpdates = normalizeUpdates(response);
        setUpdates((currentUpdates) => (
          append ? mergeUpdates(currentUpdates, nextUpdates) : nextUpdates
        ));
        setPage({
          offset: response?.page?.offset || offset,
          hasMore: Boolean(response?.page?.hasMore),
        });
        setLastLoadedAt(new Date());
        setHasLoaded(true);
      }
    } catch (err) {
      setError(err?.message || "Failed to load updates");
      if (!append) setUpdates([]);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [classroomId, updates.length]);

  useEffect(() => {
    if (!active || hasLoaded) return;
    loadUpdates();
  }, [active, hasLoaded, loadUpdates]);

  useEffect(() => {
    if (!active || !page.hasMore || loading || loadingMore || updates.length === 0) return;
    const viewport = scrollViewportRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!viewport || !sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        loadUpdates({ append: true });
      },
      {
        root: viewport,
        rootMargin: "160px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, loadUpdates, loading, loadingMore, page.hasMore, updates.length]);

  const unreadCount = useMemo(() => updates.filter((update) => !update.is_read).length, [updates]);

  const markLocalRead = useCallback((updateKeys) => {
    const keys = new Set(updateKeys);
    const readAt = new Date().toISOString();
    setUpdates((items) => items.map((item) => (
      keys.has(item.update_key) ? { ...item, is_read: true, read_at: item.read_at || readAt } : item
    )));
  }, []);

  const markRead = useCallback(async (update) => {
    if (!update?.update_key || update.is_read) return true;
    setMarkingKey(update.update_key);
    try {
      const response = await post_with_token(`classroom/${classroomId}/updates/read`, {
        updateKeys: [update.update_key],
      });
      if (response?.error) {
        setError(response.error);
        return false;
      }
      markLocalRead([update.update_key]);
      return true;
    } catch (err) {
      setError(err?.message || "Failed to mark update as read");
      return false;
    } finally {
      setMarkingKey("");
    }
  }, [classroomId, markLocalRead]);

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    setError("");
    try {
      const response = await post_with_token(`classroom/${classroomId}/updates/read-all`, {});
      if (response?.error) {
        setError(response.error);
      } else {
        markLocalRead(response?.updateKeys || updates.map((update) => update.update_key).filter(Boolean));
      }
    } catch (err) {
      setError(err?.message || "Failed to mark all updates as read");
    } finally {
      setMarkingAll(false);
    }
  }, [classroomId, markLocalRead, updates]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-6 text-foreground">Updates</h2>
          <p className="text-sm text-muted-foreground">
            {lastLoadedAt ? `Last checked ${lastLoadedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Last checked when updates load."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-2 border-border/80 bg-card/70 px-3 font-semibold text-foreground shadow-sm active:scale-[0.98]"
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking" : "Mark Read"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 border-border/80 bg-card/70 text-foreground shadow-sm active:scale-[0.98]"
            onClick={() => loadUpdates()}
            disabled={loading}
            aria-label="Refresh updates"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-lg border border-border/80 bg-card/70 shadow-[0_18px_45px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.02)]">
        <CardContent className="min-h-[10.25rem] p-0">
          {error && updates.length > 0 && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid min-h-[10.25rem] place-items-center px-6 py-8 text-center text-sm text-muted-foreground">
              <div className="space-y-3">
                <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                <p>Loading updates...</p>
              </div>
            </div>
          ) : error && updates.length === 0 ? (
            <div className="grid min-h-[10.25rem] place-items-center px-6 py-8 text-center">
              <div className="max-w-sm space-y-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="mx-auto h-5 w-5" />
                <p>{error}</p>
              </div>
            </div>
          ) : updates.length === 0 ? (
            <div className="grid min-h-[10.25rem] place-items-center px-6 py-8 text-center">
              <div className="space-y-3 text-sm text-muted-foreground">
                <Inbox className="mx-auto h-7 w-7 opacity-60" />
                <p>No updates right now</p>
              </div>
            </div>
          ) : (
            <ScrollArea
              className="min-h-0"
              viewportRef={scrollViewportRef}
              style={{ height: "clamp(18rem, calc(100vh - 26rem), 34rem)" }}
            >
              <div className="space-y-3 p-4">
                {updates.map((update, index) => {
                  const type = update.type || "other";
                  const title = update.title || update.problem_title || update.topic_title || update.message || "Classroom update";
                  const actor = update.student_name || update.sender_name || update.trainer_name || update.actor_name || "";
                  return (
                    <div
                      key={update.update_key || update.id || `${type}-${index}`}
                      className={`rounded-lg border bg-background/60 p-4 transition-colors ${update.is_read ? "border-border/60 opacity-75" : "border-primary/35 bg-primary/[0.03]"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={updateTone[type] || ""}>
                              {updateLabels[type] || type}
                            </Badge>
                            {!update.is_read && <Badge variant="secondary">Unread</Badge>}
                          </div>
                          <div>
                            <p className="break-words text-sm font-semibold text-foreground">{title}</p>
                            {actor && <p className="text-xs text-muted-foreground">{actor}</p>}
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(getUpdateTimestamp(update))}
                        </span>
                      </div>
                      {update.message && update.message !== title && (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{update.message}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 gap-1.5 text-xs"
                          onClick={() => markRead(update)}
                          disabled={update.is_read || markingKey === update.update_key}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {update.is_read ? "Read" : markingKey === update.update_key ? "Marking..." : "Mark as read"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {page.hasMore && (
                  <div ref={loadMoreSentinelRef} className="flex min-h-14 justify-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => loadUpdates({ append: true })}
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading..." : "Load more updates"}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
