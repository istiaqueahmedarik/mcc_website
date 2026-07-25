"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProgressLink from "@/components/ProgressLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileJson,
  Loader2,
  Search,
  Share2,
  Users,
} from "lucide-react";

const FORM_LABELS = {
  classroom_invitation: "Classroom Invitation",
  attendance: "Attendance",
  general: "General",
};

function fieldValue(response, label) {
  const flat = response?.response_json?.flat || {};
  const value = flat[label];
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function compactDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function TrainerFormDetailClient({ formId }) {
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("visualize");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");

  const shareUrl = form ? `${origin}/forms/${form.share_slug}` : "";
  const fields = useMemo(() => (Array.isArray(form?.fields) ? form.fields : []), [form]);
  const maxDaily = useMemo(() => {
    const counts = analytics?.by_day?.map((item) => Number(item.count) || 0) || [];
    return Math.max(1, ...counts);
  }, [analytics]);

  const filteredResponses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return responses;
    return responses.filter((response) =>
      JSON.stringify(response).toLowerCase().includes(needle),
    );
  }, [query, responses]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [formRes, responseRes, analyticsRes] = await Promise.all([
        fetch(`/api/trainer-forms/manage/forms/${formId}`, { cache: "no-store" }),
        fetch(`/api/trainer-forms/manage/forms/${formId}/responses`, { cache: "no-store" }),
        fetch(`/api/trainer-forms/manage/forms/${formId}/analytics`, { cache: "no-store" }),
      ]);
      const [formJson, responseJson, analyticsJson] = await Promise.all([
        formRes.json(),
        responseRes.json(),
        analyticsRes.json(),
      ]);

      if (formJson.error) throw new Error(formJson.error);
      setForm(formJson.form);
      setResponses(responseJson.responses || []);
      setAnalytics(analyticsJson.analytics || null);
    } catch (err) {
      setError(err.message || "Failed to load form.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    setOrigin(window.location.origin);
    loadData();
  }, [loadData]);

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setNotice("Share link copied.");
    setTimeout(() => setNotice(""), 1800);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-lg border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading form
          </div>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Forms
        </ProgressLink>
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold">Form unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "Form not found."}</p>
        </div>
      </div>
    );
  }

  const dynamic = analytics?.dynamic || {};
  const mappedCount = fields.filter((field) => field.mapUserField).length;
  const customCount = fields.length - mappedCount;

  const handleToggleAcceptingResponses = async () => {
    try {
      const nextState = form.accepting_responses === false;
      const res = await fetch(`/api/trainer-forms/manage/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          accepting_responses: nextState,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm((prev) => (prev ? { ...prev, accepting_responses: nextState } : prev));
      setNotice(nextState ? "Form is now accepting responses." : "Form submission is now turned OFF.");
    } catch (err) {
      setError(err.message || "Failed to update form response setting.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Forms
              </ProgressLink>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-3xl font-bold tracking-tight sm:text-4xl">{form.title}</h1>
                <Badge variant="outline">{FORM_LABELS[form.type] || "General"}</Badge>
                <Badge className={form.status === "published" ? "bg-emerald-600" : "bg-muted text-foreground"}>
                  {form.status}
                </Badge>
                <Badge className={form.accepting_responses !== false ? "bg-emerald-600 text-white" : "bg-rose-600 text-white font-bold"}>
                  {form.accepting_responses !== false ? "Accepting Responses" : "Submissions Closed"}
                </Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {form.description || "No description provided."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={`gap-2 font-semibold ${form.accepting_responses !== false ? "text-amber-600 border-amber-500/30 hover:bg-amber-500/10" : "text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"}`}
                onClick={handleToggleAcceptingResponses}
              >
                {form.accepting_responses !== false ? "Turn Off Submissions" : "Turn On Submissions"}
              </Button>
              <Button type="button" variant="outline" className="gap-2 font-semibold" onClick={copyShareLink}>
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <ProgressLink href={`/forms/${form.share_slug}`}>
                <Button type="button" className="gap-2 font-semibold">
                  <Share2 className="h-4 w-4" />
                  Open Form
                </Button>
              </ProgressLink>
            </div>
          </div>
        </section>

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_520px]">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share URL</p>
            <p className="mt-2 truncate font-mono text-sm">{shareUrl}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Responses" value={analytics?.total_responses || 0} />
            <Metric label="Matched" value={analytics?.matched_responses || 0} />
            <Metric label="Mapped" value={mappedCount} />
            <Metric label="Custom" value={customCount} />
          </div>
        </section>

        <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2 shadow-sm">
          <TabButton active={activeTab === "visualize"} onClick={() => setActiveTab("visualize")}>
            <BarChart3 className="h-4 w-4" />
            Visualize
          </TabButton>
          <TabButton active={activeTab === "explore"} onClick={() => setActiveTab("explore")}>
            <Search className="h-4 w-4" />
            Explore
          </TabButton>
          <TabButton active={activeTab === "json"} onClick={() => setActiveTab("json")}>
            <FileJson className="h-4 w-4" />
            JSON
          </TabButton>
        </div>

        {activeTab === "visualize" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <SectionTitle icon={BarChart3} label="Analytics" title="Response timeline" />
              <div className="mt-5 space-y-3">
                {analytics?.by_day?.length ? (
                  analytics.by_day.map((item) => (
                    <div key={item.date} className="grid grid-cols-[96px_1fr_42px] items-center gap-3 text-sm sm:grid-cols-[120px_1fr_42px]">
                      <span className="truncate text-muted-foreground">{item.date}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${Math.max(6, (Number(item.count) / maxDaily) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-semibold">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState>No responses yet.</EmptyState>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold">Field summary</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {Object.entries(analytics?.field_summary || {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Summary appears after first response.</p>
                  ) : (
                    Object.entries(analytics.field_summary).map(([label, summary]) => (
                      <div key={label} className="rounded-lg border bg-background p-4">
                        <p className="truncate text-sm font-semibold">{label}</p>
                        <div className="mt-3 space-y-2">
                          {Object.entries(summary)
                            .sort((a, b) => Number(b[1]) - Number(a[1]))
                            .slice(0, 5)
                            .map(([value, count]) => (
                              <div key={value} className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate text-muted-foreground">{value}</span>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="rounded-lg border bg-card p-5 shadow-sm">
              <SectionTitle
                icon={form.type === "attendance" ? ClipboardList : Users}
                label="Dynamic"
                title="Track"
              />
              {form.type === "classroom_invitation" ? (
                <div className="mt-5 space-y-3">
                  <Metric label="Joined From Form" value={dynamic.joined_from_form || 0} wide />
                  <Metric label="Classroom Roster" value={dynamic.classroom_roster_count || 0} wide />
                  <p className="text-xs text-muted-foreground">
                    Successful invitation responses add matched students to the linked classroom.
                  </p>
                </div>
              ) : form.type === "attendance" ? (
                <div className="mt-5 space-y-3">
                  <Metric label="Present" value={dynamic.present_count || 0} wide />
                  <Metric label="Absent" value={dynamic.absent_count || 0} wide />
                  <Metric label="Present Rate" value={`${dynamic.present_rate || 0}%`} wide />
                  {dynamic.absent?.length > 0 && (
                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Absent</p>
                      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                        {dynamic.absent.map((student) => (
                          <div key={student.id} className="rounded-md border bg-card px-3 py-2 text-xs">
                            <p className="truncate font-semibold">{student.full_name}</p>
                            <p className="truncate text-muted-foreground">{student.mist_id || student.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  General forms store response JSON for visualization and explore.
                </p>
              )}
            </aside>
          </div>
        )}

        {activeTab === "explore" && (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <SectionTitle icon={Search} label="Responses" title="Explore" />
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search responses"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Submitted</th>
                    <th className="px-3 py-3">{form.primary_key_label}</th>
                    <th className="px-3 py-3">User</th>
                    {fields.map((field) => (
                      <th key={field.id} className="px-3 py-3">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResponses.length === 0 ? (
                    <tr>
                      <td colSpan={3 + fields.length} className="px-3 py-10 text-center text-muted-foreground">
                        No responses found.
                      </td>
                    </tr>
                  ) : (
                    filteredResponses.map((response) => (
                      <tr key={response.id} className="align-top hover:bg-muted/30">
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                          {compactDate(response.submitted_at)}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{response.primary_key_value}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{response.user_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{response.user_email || ""}</p>
                        </td>
                        {fields.map((field) => (
                          <td key={field.id} className="max-w-[220px] px-3 py-3">
                            <span className="line-clamp-3">{fieldValue(response, field.label)}</span>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "json" && (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <SectionTitle icon={FileJson} label="Storage" title="Saved JSON" />
            <div className="mt-5 grid gap-3">
              {responses.length === 0 ? (
                <EmptyState>No JSON responses yet.</EmptyState>
              ) : (
                responses.map((response) => (
                  <details key={response.id} className="rounded-lg border bg-background p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {response.primary_key_value} - {compactDate(response.submitted_at)}
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(response.response_json, null, 2)}
                    </pre>
                  </details>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, title }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function Metric({ label, value, wide = false }) {
  return (
    <div className={`rounded-lg border bg-card px-3 py-3 shadow-sm ${wide ? "w-full" : ""}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-bold">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ children }) {
  return (
    <p className="rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
