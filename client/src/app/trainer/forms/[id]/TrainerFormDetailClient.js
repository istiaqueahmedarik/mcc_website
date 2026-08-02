"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "@/lib/api-client";
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
const EMPTY_RESPONSES = [];

function fieldValue(response, label) {
  const flat = objectRecord(parseResponseJson(response).flat);
  const value = flat[label];
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseResponseJson(response) {
  const payload = response?.response_json;
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return { raw: payload };
    }
  }
  return typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function countResponseValues(responses, key) {
  return responses.reduce((count, response) => {
    const values = objectRecord(parseResponseJson(response)[key]);
    return count + Object.keys(values).length;
  }, 0);
}

function buildFieldSummaryFromResponses(responses) {
  const summary = {};
  for (const response of responses) {
    const flat = objectRecord(parseResponseJson(response).flat);
    for (const [label, value] of Object.entries(flat)) {
      const normalized = value === null || value === undefined || value === "" ? "(blank)" : String(value);
      summary[label] ||= {};
      summary[label][normalized] = (summary[label][normalized] || 0) + 1;
    }
  }
  return summary;
}

function savedPayloadForResponse(response) {
  const payload = parseResponseJson(response);
  return {
    response_id: response.id,
    submitted_at: response.submitted_at,
    primary_key_value: response.primary_key_value,
    user: {
      name: response.user_name || null,
      email: response.user_email || null,
      mist_id: response.user_mist_id || null,
      batch_name: response.user_batch_name || null,
    },
    saved_response_json: payload,
  };
}

function compactDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const formDetailQueryKey = (formId) => ["trainer", "forms", formId, "detail"];

async function fetchFormDetail(formId) {
  const [formJson, responseJson, analyticsJson] = await Promise.all([
    apiGet(`trainer-forms/manage/forms/${formId}`),
    apiGet(`trainer-forms/manage/forms/${formId}/responses`),
    apiGet(`trainer-forms/manage/forms/${formId}/analytics`),
  ]);

  return {
    form: formJson.form,
    responses: responseJson.responses || [],
    analytics: analyticsJson.analytics || null,
  };
}

export default function TrainerFormDetailClient({ formId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("visualize");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [origin, setOrigin] = useState("");

  const detailQuery = useQuery({
    queryKey: formDetailQueryKey(formId),
    queryFn: () => fetchFormDetail(formId),
  });

  const form = detailQuery.data?.form || null;
  const responses = detailQuery.data?.responses || EMPTY_RESPONSES;
  const analytics = detailQuery.data?.analytics || null;
  const loading = detailQuery.isLoading;
  const loadError = detailQuery.error?.message || "";

  const toggleAcceptingResponsesMutation = useMutation({
    mutationFn: async (nextState) => {
      const data = await apiPut(`trainer-forms/manage/forms/${formId}`, {
        ...form,
        accepting_responses: nextState,
      });
      return { data, nextState };
    },
    onSuccess: async ({ nextState }) => {
      queryClient.setQueryData(formDetailQueryKey(formId), (current) =>
        current?.form
          ? {
              ...current,
              form: { ...current.form, accepting_responses: nextState },
            }
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: formDetailQueryKey(formId) });
      setNotice(nextState ? "Form is now accepting responses." : "Form submission is now turned OFF.");
    },
  });

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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setNotice("Share link copied.");
    setTimeout(() => setNotice(""), 1800);
  };

  if (loading) {
    return (
      <div className="trainer-page flex items-center justify-center px-4">
        <div className="trainer-command-bar px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading form
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="trainer-page">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Forms
          </ProgressLink>
          <div className="trainer-panel mt-6 p-6">
            <h1 className="text-xl font-bold">Form unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{loadError || "Form not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const dynamic = analytics?.dynamic || {};
  const mappedCount = countResponseValues(responses, "mapped");
  const customCount = countResponseValues(responses, "custom");
  const fieldSummary = Object.entries(analytics?.field_summary || {}).length
    ? analytics.field_summary
    : buildFieldSummaryFromResponses(responses);

  const handleToggleAcceptingResponses = async () => {
    const nextState = form.accepting_responses === false;
    setActionError("");
    setNotice("");
    try {
      await toggleAcceptingResponsesMutation.mutateAsync(nextState);
    } catch (err) {
      setActionError(err.message || "Failed to update form response setting.");
    }
  };

  return (
    <div className="trainer-page">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="pb-1">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0 max-w-3xl">
              <ProgressLink href="/trainer/forms" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Forms
              </ProgressLink>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-2xl font-semibold sm:text-3xl">{form.title}</h1>
                <Badge variant="outline" className="max-w-full truncate">{FORM_LABELS[form.type] || "General"}</Badge>
                <Badge variant="outline" className={form.status === "published" ? "trainer-status-success" : ""}>
                  {form.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={form.accepting_responses !== false ? "trainer-status-success" : "trainer-status-danger"}
                >
                  {form.accepting_responses !== false ? "Accepting" : "Closed"}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                {form.description || "No description provided."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`gap-2 font-semibold ${form.accepting_responses !== false ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"}`}
                onClick={handleToggleAcceptingResponses}
                disabled={toggleAcceptingResponsesMutation.isPending}
              >
                {toggleAcceptingResponsesMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {form.accepting_responses !== false ? "Close responses" : "Accept responses"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2 font-semibold" onClick={copyShareLink}>
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <ProgressLink href={`/forms/${form.share_slug}`}>
                <Button type="button" size="sm" className="gap-2 font-semibold">
                  <Share2 className="h-4 w-4" />
                  Open Form
                </Button>
              </ProgressLink>
            </div>
          </div>
        </section>

        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        {actionError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {actionError}
          </div>
        )}

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="trainer-panel min-w-0 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Share URL</p>
            <p className="mt-1 truncate font-mono text-sm">{shareUrl}</p>
          </div>
          <div className="trainer-panel grid grid-cols-2 overflow-hidden sm:grid-cols-4">
            <Metric label="Responses" value={analytics?.total_responses || 0} />
            <Metric label="Matched" value={analytics?.matched_responses || 0} />
            <Metric label="Mapped" value={mappedCount} />
            <Metric label="Custom" value={customCount} />
          </div>
        </section>

        <div className="trainer-command-bar flex flex-wrap gap-1 p-1" role="tablist" aria-label="Form response views">
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="trainer-panel p-4">
              <SectionTitle icon={BarChart3} label="Analytics" title="Response timeline" />
              <div className="mt-4 space-y-2.5">
                {analytics?.by_day?.length ? (
                  analytics.by_day.map((item) => (
                    <div key={item.date} className="grid grid-cols-[88px_1fr_38px] items-center gap-3 text-sm sm:grid-cols-[112px_1fr_38px]">
                      <span className="truncate text-muted-foreground">{item.date}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${Math.max(6, (Number(item.count) / maxDaily) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-semibold tabular-nums">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState>No responses yet.</EmptyState>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Field summary</h3>
                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                  {Object.entries(fieldSummary).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Summary appears after first response.</p>
                  ) : (
                    Object.entries(fieldSummary).map(([label, summary]) => (
                      <div key={label} className="trainer-panel-soft p-3">
                        <p className="truncate text-sm font-semibold">{label}</p>
                        <div className="mt-2 space-y-1.5">
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

            <aside className="trainer-panel p-4">
              <SectionTitle
                icon={form.type === "attendance" ? ClipboardList : Users}
                label="Dynamic"
                title="Track"
              />
              {form.type === "classroom_invitation" ? (
                <div className="mt-4 space-y-2.5">
                  <Metric label="Joined From Form" value={dynamic.joined_from_form || 0} wide />
                  <Metric label="Classroom Roster" value={dynamic.classroom_roster_count || 0} wide />
                  <p className="text-xs text-muted-foreground">
                    Successful invitation responses add matched students to the linked classroom.
                  </p>
                </div>
              ) : form.type === "attendance" ? (
                <div className="mt-4 space-y-2.5">
                  <Metric label="Present" value={dynamic.present_count || 0} wide />
                  <Metric label="Absent" value={dynamic.absent_count || 0} wide />
                  <Metric label="Present Rate" value={`${dynamic.present_rate || 0}%`} wide />
                  {dynamic.absent?.length > 0 && (
                    <div className="trainer-panel-soft p-3">
                      <p className="text-xs font-semibold text-muted-foreground">Absent</p>
                      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                        {dynamic.absent.map((student) => (
                          <div key={student.id} className="trainer-panel-soft px-3 py-2 text-xs">
                            <p className="truncate font-semibold">{student.full_name}</p>
                            <p className="truncate text-muted-foreground">{student.mist_id || student.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="trainer-empty mt-4 p-3 text-sm">
                  General forms store response JSON for visualization and explore.
                </p>
              )}
            </aside>
          </div>
        )}

        {activeTab === "explore" && (
          <section className="trainer-panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <SectionTitle icon={Search} label="Responses" title="Explore" />
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search responses"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search responses"
                />
              </div>
            </div>

            <div className="trainer-table-shell mt-4">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Submitted</th>
                    <th className="px-3 py-2.5">{form.primary_key_label}</th>
                    <th className="px-3 py-2.5">User</th>
                    {fields.map((field) => (
                      <th key={field.id} className="px-3 py-2.5">
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
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                          {compactDate(response.submitted_at)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{response.primary_key_value}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold">{response.user_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{response.user_email || ""}</p>
                        </td>
                        {fields.map((field) => (
                          <td key={field.id} className="max-w-[220px] px-3 py-2.5">
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
          <section className="trainer-panel p-4">
            <SectionTitle icon={FileJson} label="Storage" title="Saved JSON" />
            <div className="mt-4 grid gap-2.5">
              {responses.length === 0 ? (
                <EmptyState>No JSON responses yet.</EmptyState>
              ) : (
                responses.map((response) => (
                  <details key={response.id} className="trainer-panel-soft p-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {response.primary_key_value} - {compactDate(response.submitted_at)}
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(savedPayloadForResponse(response), null, 2)}
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
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <h2 className="mt-0.5 text-base font-semibold">{title}</h2>
    </div>
  );
}

function Metric({ label, value, wide = false }) {
  if (wide) {
    return (
      <div className="trainer-panel-soft w-full px-3 py-2.5">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{value}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 border-r px-3 py-2.5 last:border-r-0">
      <p className="truncate text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ children }) {
  return (
    <p className="trainer-empty p-5 text-sm">
      {children}
    </p>
  );
}
