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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading form
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Forms
        </ProgressLink>
        <div className="mt-6 rounded-lg border bg-card p-6">
          <h1 className="text-xl font-bold">Form unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "Form not found."}</p>
        </div>
      </div>
    );
  }

  const dynamic = analytics?.dynamic || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Forms
            </ProgressLink>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
              <Badge variant="outline">{FORM_LABELS[form.type] || "General"}</Badge>
              <Badge className={form.status === "published" ? "bg-emerald-600" : "bg-muted text-foreground"}>
                {form.status}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {form.description || "No description provided."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={copyShareLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <ProgressLink href={`/forms/${form.share_slug}`}>
              <Button type="button" className="gap-2">
                <Share2 className="h-4 w-4" />
                Open Form
              </Button>
            </ProgressLink>
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Share URL</p>
              <p className="mt-1 truncate font-mono text-sm">{shareUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Responses" value={analytics?.total_responses || 0} />
              <Metric label="Matched" value={analytics?.matched_responses || 0} />
              <Metric label="Mapped Cells" value={fields.filter((field) => field.mapUserField).length} />
              <Metric label="Custom Cells" value={fields.filter((field) => !field.mapUserField).length} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(320px,0.25fr)]">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Response Timeline</h2>
              </div>
              <div className="mt-5 space-y-3">
                {analytics?.by_day?.length ? (
                  analytics.by_day.map((item) => (
                    <div key={item.date} className="grid grid-cols-[110px_1fr_42px] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{item.date}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(6, (Number(item.count) / maxDaily) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-semibold">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No responses yet.
                  </p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold">Field Summary</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {Object.entries(analytics?.field_summary || {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Summary appears after first response.</p>
                  ) : (
                    Object.entries(analytics.field_summary).map(([label, summary]) => (
                      <div key={label} className="rounded-lg border bg-background p-4">
                        <p className="text-sm font-semibold">{label}</p>
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

            <aside className="space-y-4">
              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  {form.type === "attendance" ? (
                    <ClipboardList className="h-5 w-5 text-primary" />
                  ) : (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                  <h2 className="text-lg font-bold">Dynamic Track</h2>
                </div>
                {form.type === "classroom_invitation" ? (
                  <div className="mt-4 space-y-3">
                    <Metric label="Joined From Form" value={dynamic.joined_from_form || 0} wide />
                    <Metric label="Classroom Roster" value={dynamic.classroom_roster_count || 0} wide />
                    <p className="text-xs text-muted-foreground">
                      Successful invitation responses add matched students to the linked classroom.
                    </p>
                  </div>
                ) : form.type === "attendance" ? (
                  <div className="mt-4 space-y-3">
                    <Metric label="Present" value={dynamic.present_count || 0} wide />
                    <Metric label="Absent" value={dynamic.absent_count || 0} wide />
                    <Metric label="Present Rate" value={`${dynamic.present_rate || 0}%`} wide />
                    {dynamic.absent?.length > 0 && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">Absent</p>
                        <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                          {dynamic.absent.map((student) => (
                            <div key={student.id} className="text-xs">
                              <p className="font-semibold">{student.full_name}</p>
                              <p className="text-muted-foreground">{student.mist_id || student.email}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    General forms store responses as JSON and support visualization plus explore.
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}

        {activeTab === "explore" && (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold">Explore Responses</h2>
                <p className="text-sm text-muted-foreground">Search mapped aliases, custom fields, user data, and JSON.</p>
              </div>
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
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">{form.primary_key_label}</th>
                    <th className="px-3 py-2">User</th>
                    {fields.map((field) => (
                      <th key={field.id} className="px-3 py-2">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResponses.length === 0 ? (
                    <tr>
                      <td colSpan={3 + fields.length} className="px-3 py-8 text-center text-muted-foreground">
                        No responses found.
                      </td>
                    </tr>
                  ) : (
                    filteredResponses.map((response) => (
                      <tr key={response.id} className="align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {compactDate(response.submitted_at)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{response.primary_key_value}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold">{response.user_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{response.user_email || ""}</p>
                        </td>
                        {fields.map((field) => (
                          <td key={field.id} className="max-w-[220px] px-3 py-2">
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
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Saved JSON</h2>
            </div>
            <div className="mt-5 grid gap-4">
              {responses.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No JSON responses yet.
                </p>
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
      </div>
    </div>
  );
}

function Metric({ label, value, wide = false }) {
  return (
    <div className={`rounded-lg border bg-background px-3 py-2 ${wide ? "w-full" : ""}`}>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
