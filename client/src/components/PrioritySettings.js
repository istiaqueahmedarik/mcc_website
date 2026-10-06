"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Mail, Save } from "lucide-react";
import { get_with_token, post_with_token } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const defaultPriorities = [
  "time_exceeded",
  "student_solution_submitted",
  "student_needs_review",
  "problem_progress_changed",
  "thread_reply",
  "new_problem",
  "teacher_feedback",
  "solution_status_changed",
  "topic_or_resource_updated",
];

const priorityLabels = {
  time_exceeded: "Time exceeded",
  student_solution_submitted: "Solution submitted",
  student_needs_review: "Needs review",
  problem_progress_changed: "Progress changed",
  thread_reply: "Thread reply",
  new_problem: "New problem",
  teacher_feedback: "Teacher feedback",
  solution_status_changed: "Status changed",
  topic_or_resource_updated: "Topic/resource updated",
};

function normalizePriorities(value) {
  const incoming = Array.isArray(value) ? value : [];
  const known = incoming.filter((item) => defaultPriorities.includes(item));
  const missing = defaultPriorities.filter((item) => !known.includes(item));
  return [...known, ...missing];
}

export function PrioritySettings() {
  const [priorities, setPriorities] = useState(defaultPriorities);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedType, setDraggedType] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      setLoading(true);
      try {
        const response = await get_with_token("user/classroom-settings");
        if (!active) return;
        if (!response?.error) {
          setPriorities(normalizePriorities(response?.classroom_update_priorities || response?.update_priorities));
          if (typeof response?.classroom_email_notifications_enabled === "boolean") {
            setEmailEnabled(response.classroom_email_notifications_enabled);
          } else if (typeof response?.email_notifications_enabled === "boolean") {
            setEmailEnabled(response.email_notifications_enabled);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const movePriority = useCallback((type, direction) => {
    setPriorities((items) => {
      const index = items.indexOf(type);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, []);

  const handleDrop = useCallback((targetType) => {
    if (!draggedType || draggedType === targetType) return;
    setPriorities((items) => {
      const sourceIndex = items.indexOf(draggedType);
      const targetIndex = items.indexOf(targetType);
      if (sourceIndex < 0 || targetIndex < 0) return items;
      const next = [...items];
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, draggedType);
      return next;
    });
    setDraggedType("");
  }, [draggedType]);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    const toastId = toast.loading("Saving update settings...");
    try {
      const response = await post_with_token("user/classroom-settings", {
        classroom_update_priorities: priorities,
        classroom_email_notifications_enabled: emailEnabled,
      });
      if (response?.error) {
        toast.error(response.error, { id: toastId });
      } else {
        toast.success("Update settings saved", { id: toastId });
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save update settings", { id: toastId });
    } finally {
      setSaving(false);
    }
  }, [emailEnabled, priorities]);

  return (
    <Card className="rounded-lg border">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Update Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-semibold">Classroom update emails</p>
            <p className="text-xs text-muted-foreground">Controls classroom update email only.</p>
          </div>
          <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} aria-label="Toggle classroom update emails" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority order</p>
          {priorities.map((type, index) => (
            <div
              key={type}
              draggable
              onDragStart={() => setDraggedType(type)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(type)}
              className="flex items-center gap-2 rounded-lg border bg-card p-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-sm">{priorityLabels[type] || type}</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePriority(type, -1)} disabled={index === 0 || loading}>
                <ArrowUp className="h-4 w-4" />
                <span className="sr-only">Move up</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePriority(type, 1)} disabled={index === priorities.length - 1 || loading}>
                <ArrowDown className="h-4 w-4" />
                <span className="sr-only">Move down</span>
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" className="gap-2" onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
