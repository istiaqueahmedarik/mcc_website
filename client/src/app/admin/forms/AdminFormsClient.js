"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity, AlertCircle, ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight,
  CircleStop, ClipboardCheck, Copy, Download, Eye, FilePlus2, Files, Link2,
  Loader2, Pencil, Play, Plus, RefreshCw, Search, Trash2, Users, Wifi, WifiOff,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./forms.module.css";

const FIELD_TYPES = [
  ["text", "Short text"], ["long_text", "Long text"], ["number", "Number"],
  ["date", "Date"], ["select", "Select"], ["checkbox", "Checkbox"],
];
const PROFILE_FIELDS = [
  ["", "Custom answer"], ["mist_id", "Student ID"], ["full_name", "Full name"],
  ["cf_id", "Codeforces handle"], ["vjudge_id", "VJudge username"],
  ["phone", "Phone"], ["batch_name", "Batch"], ["tshirt_size", "T-shirt size"],
  ["codechef_id", "CodeChef handle"], ["atcoder_id", "AtCoder handle"],
];
const EMPTY_TEMPLATE = { title: "Untitled template", description: "", kind: "general", fields: [], agreement_text: "I confirm that these details are correct." };

function newField() {
  return { id: `field_${crypto.randomUUID()}`, label: "New question", type: "text", required: false, mapUserField: null, options: [], helpText: "" };
}

async function api(path, options = {}) {
  const response = await fetch(`/api/global-forms/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The request could not be completed.");
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function statusTone(status) {
  return status === "open" ? "default" : status === "ended" ? "secondary" : "outline";
}

function setUrl(router, pathname, params, patch) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  router.replace(`${pathname}?${next.toString()}`, { scroll: false });
}

function csvCell(value) {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminFormsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "templates" ? "templates" : "campaigns";
  const campaignId = searchParams.get("campaign") || "";
  const query = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responseTotal, setResponseTotal] = useState(0);
  const [responsePageSize, setResponsePageSize] = useState(50);
  const [dashboard, setDashboard] = useState({ submitted: 0, active: 0, pending_verification: 0, revision: 0 });
  const revisionRef = useRef(0);
  const [streamState, setStreamState] = useState("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [templateDraft, setTemplateDraft] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [campaignDraft, setCampaignDraft] = useState(null);
  const [responseDetail, setResponseDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const refreshLists = useCallback(async () => {
    const [templateData, campaignData] = await Promise.all([
      api("manage/templates"), api("manage/campaigns"),
    ]);
    setTemplates(templateData.templates || []);
    setCampaigns(campaignData.campaigns || []);
  }, []);

  const refreshCampaign = useCallback(async () => {
    if (!campaignId) {
      setSelectedCampaign(null); setResponses([]); setResponseTotal(0); return;
    }
    const suffix = `?q=${encodeURIComponent(query)}&page=${page}`;
    const [campaignData, responseData, dashboardData] = await Promise.all([
      api(`manage/campaigns/${campaignId}`),
      api(`manage/campaigns/${campaignId}/responses${suffix}`),
      api(`manage/dashboard?campaign_id=${encodeURIComponent(campaignId)}`),
    ]);
    setSelectedCampaign(campaignData.campaign);
    setResponses(responseData.responses || []);
    setResponseTotal(responseData.total || 0);
    setResponsePageSize(responseData.page_size || 50);
    setDashboard(dashboardData);
    revisionRef.current = dashboardData.revision || 0;
  }, [campaignId, page, query]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([refreshLists(), refreshCampaign()])
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshCampaign, refreshLists]);

  useEffect(() => {
    if (!campaignId) return undefined;
    let events;
    const disconnect = () => { events?.close(); events = undefined; };
    const connect = () => {
      disconnect();
      if (document.visibilityState !== "visible") { setStreamState("stale"); return; }
      setStreamState("connecting");
      events = new EventSource(`/api/global-forms/manage/stream?campaign_id=${encodeURIComponent(campaignId)}`);
      events.onopen = () => {
        setStreamState("fresh");
        refreshCampaign().catch(() => setStreamState("stale"));
      };
      events.addEventListener("stats", (event) => {
        try {
          const stats = JSON.parse(event.data);
          const changed = revisionRef.current && stats.revision !== revisionRef.current;
          revisionRef.current = stats.revision || 0;
          setDashboard(stats); setStreamState("fresh");
          if (changed) refreshCampaign().catch(() => setStreamState("stale"));
        } catch { setStreamState("stale"); }
      });
      events.onerror = () => setStreamState("stale");
    };
    document.addEventListener("visibilitychange", connect); connect();
    return () => { document.removeEventListener("visibilitychange", connect); disconnect(); };
  }, [campaignId, refreshCampaign]);

  async function perform(label, task) {
    setSaving(true); setError(""); setNotice("");
    try { await task(); setNotice(label); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function saveTemplate() {
    const draft = templateDraft;
    if (!draft?.title?.trim()) return setError("Template title is required.");
    if (draft.fields.some((field) => !field.label?.trim())) return setError("Every question needs a label.");
    const ids = new Set(draft.fields.map((field) => field.id));
    if (ids.size !== draft.fields.length) return setError("Every question needs a unique field ID.");
    const mappings = draft.fields.map((field) => field.mapUserField).filter(Boolean);
    if (new Set(mappings).size !== mappings.length) return setError("A profile field can be mapped only once.");
    if (draft.fields.some((field) => field.type === "select" && !field.options?.length)) return setError("Every select question needs at least one option.");
    await perform("Template saved.", async () => {
      const path = draft.id ? `manage/templates/${draft.id}` : "manage/templates";
      const method = draft.id ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(draft) });
      setTemplateDraft(null); await refreshLists();
    });
  }

  function updateField(id, key, value) {
    setTemplateDraft((draft) => ({ ...draft, fields: draft.fields.map((field) => field.id === id ? { ...field, [key]: value } : field) }));
  }

  function moveField(index, delta) {
    setTemplateDraft((draft) => {
      const target = index + delta;
      if (target < 0 || target >= draft.fields.length) return draft;
      const fields = [...draft.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...draft, fields };
    });
  }

  async function createCampaign() {
    if (!campaignDraft?.title?.trim() || !campaignDraft.template_id) return setError("Choose a template and campaign title.");
    await perform("Campaign draft created.", async () => {
      const data = await api("manage/campaigns", { method: "POST", body: JSON.stringify(campaignDraft) });
      setCampaignDraft(null); await refreshLists();
      if (data.campaign?.id) setUrl(router, pathname, searchParams, { tab: "campaigns", campaign: data.campaign.id, page: 1 });
    });
  }

  async function lifecycle(action) {
    await perform(action === "start" ? "Campaign started." : "Campaign ended.", async () => {
      await api(`manage/campaigns/${campaignId}/${action}`, { method: "POST", body: "{}" });
      await Promise.all([refreshLists(), refreshCampaign()]);
    });
  }

  function exportCsv() {
    const fieldLabels = (selectedCampaign?.fields || []).map((field) => field.label);
    const header = ["Submitted", "Student ID", "Name", "Email", "Verification", ...fieldLabels];
    const rows = responses.map((response) => [
      response.submitted_at, response.mist_id || response.profile_values?.mist_id,
      response.full_name || response.profile_values?.full_name, response.email,
      response.verification_status || (response.pending_verification ? "Pending" : "Current"),
      ...(selectedCampaign?.fields || []).map((field) => response.answers?.[field.id] ?? response.profile_values?.[field.mapUserField]),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `${selectedCampaign?.slug || "campaign"}-responses-page-${page}.csv`;
    anchor.click(); URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(responseTotal / responsePageSize));

  return (
    <main className={`${styles.workspace} px-4 py-8 sm:px-6 lg:px-10`}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className={`${styles.glassBar} rounded-[1.5rem] p-3 sm:p-4`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Global administration</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Forms & registration</h1>
              <p className="mt-1 text-sm text-muted-foreground">Reusable templates, frozen campaigns, and accountable responses.</p>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-2xl border bg-background/80 p-1" aria-label="Workspace view">
              {[{ id: "campaigns", icon: ClipboardCheck, label: "Campaigns" }, { id: "templates", icon: Files, label: "Templates" }].map((item) => (
                <Button key={item.id} variant={tab === item.id ? "default" : "ghost"} className={`${styles.pressable} min-h-11 gap-2 rounded-xl`} onClick={() => setUrl(router, pathname, searchParams, { tab: item.id, campaign: item.id === "templates" ? null : campaignId })}>
                  <item.icon className="h-4 w-4" />{item.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Couldn&apos;t complete that action</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {notice && <Alert><Check className="h-4 w-4" /><AlertDescription>{notice}</AlertDescription></Alert>}
        {loading ? <LoadingState /> : tab === "templates" ? (
          <TemplatesView templates={templates} saving={saving} onCreate={() => setTemplateDraft({ ...EMPTY_TEMPLATE, fields: [newField()] })} onEdit={(item) => setTemplateDraft(structuredClone(item))} onPreview={setPreviewTemplate} onClone={(item) => perform("Template cloned.", async () => { await api(`manage/templates/${item.id}/clone`, { method: "POST", body: "{}" }); await refreshLists(); })} />
        ) : (
          <CampaignsView campaigns={campaigns} selected={selectedCampaign} dashboard={dashboard} streamState={streamState} responses={responses} responseTotal={responseTotal} query={query} page={page} totalPages={totalPages} saving={saving} onSelect={(id) => setUrl(router, pathname, searchParams, { campaign: id, q: null, page: 1 })} onCreate={() => setCampaignDraft({ title: "", description: "", template_id: templates[0]?.id || "" })} onStart={() => lifecycle("start")} onEnd={() => lifecycle("end")} onCopy={async () => { await navigator.clipboard.writeText(`${location.origin}/register/${selectedCampaign.slug}`); setNotice("Share link copied."); }} onQuery={(value) => setUrl(router, pathname, searchParams, { q: value, page: 1 })} onPage={(value) => setUrl(router, pathname, searchParams, { page: value })} onExport={exportCsv} onDetail={setResponseDetail} onRefresh={() => perform("Campaign refreshed.", refreshCampaign)} />
        )}
      </div>

      <TemplateEditor draft={templateDraft} saving={saving} onClose={() => setTemplateDraft(null)} onChange={setTemplateDraft} onField={updateField} onMove={moveField} onSave={saveTemplate} />
      <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      <CampaignCreator draft={campaignDraft} templates={templates} saving={saving} onClose={() => setCampaignDraft(null)} onChange={setCampaignDraft} onSave={createCampaign} />
      <ResponseDetail response={responseDetail} fields={selectedCampaign?.fields || []} onClose={() => setResponseDetail(null)} />
    </main>
  );
}

function TemplatesView({ templates, saving, onCreate, onEdit, onPreview, onClone }) {
  return <section className="space-y-4" aria-labelledby="templates-heading">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="templates-heading" className="text-xl font-semibold">Template library</h2><p className="text-sm text-muted-foreground">Edit the questions future campaigns will freeze.</p></div><Button className={`${styles.pressable} min-h-11 gap-2`} onClick={onCreate}><FilePlus2 className="h-4 w-4" />New template</Button></div>
    {templates.length === 0 ? <Empty icon={Files} title="No templates yet" text="Create a general template to begin." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map((item) => <Card key={item.id} className={`${styles.surface} rounded-2xl`}><CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="break-words text-lg">{item.title}</CardTitle><CardDescription className="mt-1 line-clamp-3">{item.description || "No description"}</CardDescription></div><Badge variant="outline">{item.kind === "tfc" ? "TFC" : "General"}</Badge></div></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{item.fields?.length || 0} questions</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" className={styles.pressable} onClick={() => onEdit(item)}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button variant="outline" size="sm" className={styles.pressable} onClick={() => onPreview(item)}><Eye className="mr-2 h-4 w-4" />Preview</Button><Button variant="ghost" size="sm" disabled={saving} onClick={() => onClone(item)}><Copy className="mr-2 h-4 w-4" />Clone</Button></div></CardContent></Card>)}</div>}
  </section>;
}

function TemplateEditor({ draft, saving, onClose, onChange, onField, onMove, onSave }) {
  return <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? "Edit template" : "Create template"}</DialogTitle><DialogDescription>Question IDs remain stable when you reorder fields.</DialogDescription></DialogHeader>{draft && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[1fr_12rem]"><FieldLabel label="Title"><Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} /></FieldLabel><FieldLabel label="Kind"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.kind} onChange={(event) => onChange({ ...draft, kind: event.target.value })}><option value="general">General</option><option value="tfc">TFC registration</option></select></FieldLabel></div><FieldLabel label="Description"><Textarea value={draft.description || ""} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></FieldLabel><div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Questions</h3><p className="text-sm text-muted-foreground">Mapped values come from the student profile.</p></div><Button variant="outline" onClick={() => onChange({ ...draft, fields: [...draft.fields, newField()] })}><Plus className="mr-2 h-4 w-4" />Add</Button></div>{draft.fields.length === 0 && <Empty icon={Plus} title="No questions" text="Add at least one question before using this template." compact />}{draft.fields.map((field, index) => <div key={field.id} className={`${styles.surface} rounded-xl p-4`}><div className="mb-4 flex items-center justify-between gap-2"><Badge variant="outline">{index + 1}</Badge><div className="flex"><Button type="button" variant="ghost" size="icon" aria-label="Move question up" disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Move question down" disabled={index === draft.fields.length - 1} onClick={() => onMove(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Delete question" onClick={() => onChange({ ...draft, fields: draft.fields.filter((item) => item.id !== field.id) })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div><div className="grid gap-4 md:grid-cols-2"><FieldLabel label="Label"><Input value={field.label} onChange={(event) => onField(field.id, "label", event.target.value)} /></FieldLabel><FieldLabel label="Type"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={field.type} onChange={(event) => onField(field.id, "type", event.target.value)}>{FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel><FieldLabel label="Profile mapping"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={field.mapUserField || ""} onChange={(event) => onField(field.id, "mapUserField", event.target.value || null)}>{PROFILE_FIELDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel><FieldLabel label="Help text"><Input value={field.helpText || ""} onChange={(event) => onField(field.id, "helpText", event.target.value)} /></FieldLabel>{field.type === "select" && <FieldLabel label="Options (one per line)" className="md:col-span-2"><Textarea value={(field.options || []).join("\n")} onChange={(event) => onField(field.id, "options", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} /></FieldLabel>}</div><label className="mt-4 flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={Boolean(field.required)} onCheckedChange={(checked) => onField(field.id, "required", Boolean(checked))} />Required</label></div>)}</div><FieldLabel label="Agreement"><Textarea value={draft.agreement_text || ""} onChange={(event) => onChange({ ...draft, agreement_text: event.target.value })} /></FieldLabel><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={onSave}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save template</Button></div></div>}</DialogContent></Dialog>;
}

function CampaignsView({ campaigns, selected, dashboard, streamState, responses, responseTotal, query, page, totalPages, saving, onSelect, onCreate, onStart, onEnd, onCopy, onQuery, onPage, onExport, onDetail, onRefresh }) {
  return <section className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]"><aside className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Campaigns</h2><p className="text-xs text-muted-foreground">Draft, open, and ended rounds</p></div><Button size="icon" aria-label="Create campaign" onClick={onCreate}><Plus className="h-4 w-4" /></Button></div>{campaigns.length === 0 ? <Empty icon={ClipboardCheck} title="No campaigns" text="Create one from a template." compact /> : <div className="space-y-2">{campaigns.map((campaign) => <button key={campaign.id} type="button" onClick={() => onSelect(campaign.id)} className={`${styles.pressable} w-full rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === campaign.id ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"}`}><div className="flex items-start justify-between gap-2"><span className="break-words font-medium">{campaign.title}</span><Badge variant={statusTone(campaign.status)}>{campaign.status}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">/{campaign.slug}</p></button>)}</div>}</aside><div className="min-w-0 space-y-5">{!selected ? <Empty icon={ClipboardCheck} title="Select a campaign" text="Choose a campaign to see its lifecycle, live activity, and responses." /> : <><div className={`${styles.surface} rounded-2xl p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-2xl font-semibold">{selected.title}</h2><Badge variant={statusTone(selected.status)}>{selected.status}</Badge></div><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{selected.description || "No campaign description."}</p><p className="mt-3 break-all font-mono text-xs text-muted-foreground">/register/{selected.slug}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onCopy}><Link2 className="mr-2 h-4 w-4" />Copy link</Button>{selected.status === "draft" && <Button disabled={saving} onClick={onStart}><Play className="mr-2 h-4 w-4" />Start</Button>}{selected.status === "open" && <Button variant="destructive" disabled={saving} onClick={onEnd}><CircleStop className="mr-2 h-4 w-4" />End</Button>}</div></div></div><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"><Metric icon={ClipboardCheck} label="Submitted" value={dashboard.submitted} /><Metric icon={Activity} label="Currently completing" value={dashboard.active} hint="Approximate, recent visible sessions" /><Metric icon={AlertCircle} label="Needs verification" value={dashboard.pending_verification} /><Metric icon={streamState === "fresh" ? Wifi : WifiOff} label="Live status" value={streamState === "fresh" ? "Fresh" : streamState === "connecting" ? "Connecting" : "Reconnecting"} hint={streamState === "stale" ? "Showing last known values" : undefined} /></div><Card className={`${styles.surface} rounded-2xl`}><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>Responses</CardTitle><CardDescription>{responseTotal} submitted registrations</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search responses" className="min-h-10 pl-9" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search identity or answer" /></div><Button variant="outline" onClick={onRefresh}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" disabled={!responses.length} onClick={onExport}><Download className="mr-2 h-4 w-4" />Export page</Button></div></div></CardHeader><CardContent><div className={styles.tableWrap}><table className="w-full border-collapse text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3">Student</th><th className="px-3 py-3">Student ID</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Verification</th><th className="px-3 py-3 text-right">Details</th></tr></thead><tbody>{responses.map((response) => <tr key={response.id || response.user_id} className="border-b last:border-0"><td className="max-w-64 px-3 py-3"><p className="truncate font-medium">{response.full_name || response.profile_values?.full_name || "Student"}</p><p className="truncate text-xs text-muted-foreground">{response.email || "Account identity"}</p></td><td className="px-3 py-3 font-mono text-xs">{response.mist_id || response.profile_values?.mist_id || "—"}</td><td className="px-3 py-3">{formatDate(response.submitted_at)}</td><td className="px-3 py-3"><Badge variant={response.pending_verification ? "secondary" : "outline"}>{response.verification_status || (response.pending_verification ? "Pending" : "Current")}</Badge></td><td className="px-3 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => onDetail(response)}>View</Button></td></tr>)}</tbody></table>{responses.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{query ? "No responses match this search." : "No responses yet."}</p>}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div></CardContent></Card></>}</div></section>;
}

function CampaignCreator({ draft, templates, saving, onClose, onChange, onSave }) {
  return <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Create campaign</DialogTitle><DialogDescription>The selected template is frozen when this campaign starts.</DialogDescription></DialogHeader>{draft && <div className="space-y-4"><FieldLabel label="Template"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.template_id} onChange={(event) => onChange({ ...draft, template_id: event.target.value })}><option value="">Choose a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></FieldLabel><FieldLabel label="Campaign title"><Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} /></FieldLabel><FieldLabel label="Description"><Textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></FieldLabel><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={onSave}>Create draft</Button></div></div>}</DialogContent></Dialog>;
}

function TemplatePreview({ template, onClose }) {
  return <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Admin preview · {template?.title}</DialogTitle><DialogDescription>This preview never submits a response or counts as activity.</DialogDescription></DialogHeader>{template && <div className="space-y-5 rounded-2xl border bg-card p-5"><div><h3 className="text-xl font-semibold">{template.title}</h3><p className="mt-1 text-sm text-muted-foreground">{template.description}</p></div>{template.fields?.map((field) => <PreviewField key={field.id} field={field} />)}<label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><Checkbox disabled /><span>{template.agreement_text}</span></label><Button className="w-full" disabled>Register (preview only)</Button></div>}</DialogContent></Dialog>;
}

function PreviewField({ field }) {
  return <FieldLabel label={`${field.label}${field.required ? " *" : ""}`}><div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{field.mapUserField ? `Profile value · ${field.mapUserField}` : field.type === "checkbox" ? "Checkbox answer" : field.type === "select" ? field.options?.join(" / ") || "Select an option" : `${FIELD_TYPES.find(([value]) => value === field.type)?.[1] || "Answer"}`}</div>{field.helpText && <span className="text-xs text-muted-foreground">{field.helpText}</span>}</FieldLabel>;
}

function ResponseDetail({ response, fields, onClose }) {
  return <Dialog open={Boolean(response)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Registration details</DialogTitle><DialogDescription>Submitted {formatDate(response?.submitted_at)}</DialogDescription></DialogHeader>{response && <div className="space-y-4"><dl className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><Fact label="Name" value={response.full_name || response.profile_values?.full_name} /><Fact label="Student ID" value={response.mist_id || response.profile_values?.mist_id} /><Fact label="Email" value={response.email} /><Fact label="Verification" value={response.verification_status || (response.pending_verification ? "Pending" : "Current")} /></dl><div className="space-y-2">{fields.map((field) => <Fact key={field.id} label={field.label} value={response.answers?.[field.id] ?? response.profile_values?.[field.mapUserField]} block />)}</div></div>}</DialogContent></Dialog>;
}

function Metric({ icon: Icon, label, value, hint }) { return <div className={`${styles.surface} rounded-2xl p-4`}><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? 0}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>; }
function FieldLabel({ label, children, className = "" }) { return <label className={`grid gap-2 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>; }
function Fact({ label, value, block }) { return <div className={block ? "rounded-xl border p-3" : "min-w-0"}><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{value === undefined || value === null || value === "" ? "—" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>; }
function Empty({ icon: Icon, title, text, compact = false }) { return <div className={`${styles.surface} rounded-2xl px-5 text-center ${compact ? "py-7" : "py-14"}`}><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p></div>; }
function LoadingState() { return <div className="flex min-h-64 items-center justify-center rounded-2xl border bg-card"><Loader2 className="mr-3 h-5 w-5 animate-spin" /><span>Loading forms workspace…</span></div>; }
