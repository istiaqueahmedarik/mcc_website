"use client";

import ProgressLink from "@/components/ProgressLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, CheckCircle2, Clock3, ExternalLink, Loader2, LockKeyhole, RefreshCw, Send, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./registration.module.css";

async function api(path, options = {}) {
  const response = await fetch(`/api/global-forms/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The request could not be completed.");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

function profileValue(profile, key) {
  if (!profile || !key) return "";
  return profile[key] ?? profile.user?.[key] ?? "";
}

function isPending(profile, key) {
  if (key === "cf_id") return Boolean(profileValue(profile, key)) && profile?.cf_verified === false;
  if (key === "vjudge_id") return Boolean(profileValue(profile, key)) && profile?.vjudge_verified === false;
  return false;
}

function displayValue(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value == null || value === "" ? "—" : String(value);
}

export default function RegistrationClient({ slug }) {
  const draftKey = `global-form-draft:${slug}`;
  const sessionKey = `global-form-session:${slug}`;
  const [publicCampaign, setPublicCampaign] = useState(null);
  const [preview, setPreview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [profileValues, setProfileValues] = useState({});
  const [agreement, setAgreement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const sessionIdRef = useRef("");
  const formRef = useRef(null);

  const restoreDraft = useCallback(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      if (draft) {
        setAnswers(draft.answers || {});
        setProfileValues(draft.profileValues || {});
        setAgreement(Boolean(draft.agreement));
      }
    } catch { /* Ignore an invalid local draft. */ }
  }, [draftKey]);

  const load = useCallback(async ({ keepDraft = true } = {}) => {
    setLoading(true); setError("");
    try {
      const publicData = await api(`public/${encodeURIComponent(slug)}`);
      setPublicCampaign(publicData.campaign);
      try {
        const previewData = await api(`public/${encodeURIComponent(slug)}/preview`);
        setPreview(previewData); setAuthRequired(false);
        if (keepDraft) restoreDraft();
      } catch (previewError) {
        if (previewError.status === 401) { setAuthRequired(true); setPreview(null); }
        else { setPreview(null); setAuthRequired(false); setError(previewError.message); }
      }
    } catch (err) { setError(err.message); setPublicCampaign(null); }
    finally { setLoading(false); }
  }, [restoreDraft, slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!preview || preview.receipt) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ answers, profileValues, agreement }));
    } catch { /* Registration remains usable when browser storage is disabled. */ }
  }, [agreement, answers, draftKey, preview, profileValues]);

  const receipt = preview?.receipt;
  const campaign = preview?.campaign || publicCampaign;
  const fields = useMemo(() => campaign?.fields || [], [campaign]);
  const requiredKeys = useMemo(() => new Set((preview?.required_fields || []).flatMap((item) => typeof item === "string" ? [item] : [item.id, item.mapUserField].filter(Boolean))), [preview]);

  function needsProfileInput(field) {
    if (!field.mapUserField) return false;
    const current = profileValue(preview?.profile, field.mapUserField);
    if (field.mapUserField === "mist_id" && !/^[0-9]{9}$/.test(String(current || "").trim())) return true;
    return requiredKeys.has(field.id) || requiredKeys.has(field.mapUserField) || !String(current || "").trim();
  }

  const sendHeartbeat = useCallback(async (active) => {
    if (!preview || receipt || campaign?.status !== "open") return;
    if (!sessionIdRef.current) {
      let id;
      try { id = sessionStorage.getItem(sessionKey); } catch { /* Use an in-memory session ID. */ }
      if (!id) {
        id = crypto.randomUUID();
        try { sessionStorage.setItem(sessionKey, id); } catch { /* Use an in-memory session ID. */ }
      }
      sessionIdRef.current = id;
    }
    try {
      await api(`public/${encodeURIComponent(slug)}/heartbeat`, { method: "POST", body: JSON.stringify({ session_id: sessionIdRef.current, active }) });
    } catch { /* Presence is best-effort and never blocks registration. */ }
  }, [campaign?.status, preview, receipt, sessionKey, slug]);

  useEffect(() => {
    if (!preview || receipt || campaign?.status !== "open") return undefined;
    let timer;
    const sync = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") {
        sendHeartbeat(true);
        timer = setInterval(() => sendHeartbeat(true), 20_000);
      } else sendHeartbeat(false);
    };
    document.addEventListener("visibilitychange", sync); sync();
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sync); sendHeartbeat(false); };
  }, [campaign?.status, preview, receipt, sendHeartbeat]);

  function validate() {
    const errors = {};
    for (const field of fields) {
      const profileInput = needsProfileInput(field);
      const value = profileInput ? profileValues[field.mapUserField] : field.mapUserField ? profileValue(preview.profile, field.mapUserField) : answers[field.id];
      const empty = value == null || (typeof value === "string" && value.trim() === "");
      if (field.required && (field.type === "checkbox" ? value !== true : empty)) errors[field.id] = "This field is required.";
      if (!empty && field.mapUserField === "mist_id" && !/^[0-9]{9}$/.test(String(value).trim())) errors[field.id] = "Student ID must be exactly nine ASCII digits.";
      if (!empty && field.type === "select" && !(field.options || []).includes(value)) errors[field.id] = "Choose one of the available options.";
      if (!empty && field.type === "number" && !Number.isFinite(Number(value))) errors[field.id] = "Enter a valid number.";
      if (!empty && field.type === "date" && Number.isNaN(Date.parse(`${value}T00:00:00`))) errors[field.id] = "Enter a valid date.";
    }
    if (!agreement) errors.agreement = "You must agree before registering.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
    }
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event?.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setError("");
    try {
      const data = await api(`public/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers, profile_values: profileValues, profile_version: preview.profile_version, agreement: true }),
      });
      try { sessionStorage.removeItem(draftKey); } catch { /* No stored draft to clear. */ }
      await sendHeartbeat(false);
      setPreview((current) => ({ ...current, receipt: data.receipt }));
    } catch (err) {
      if (err.code === "PREVIEW_STALE") {
        await load({ keepDraft: true });
        setError("Your profile changed while this preview was open. We refreshed it; review the current values and submit again.");
      } else if (err.code === "CAMPAIGN_CLOSED") {
        await load({ keepDraft: true });
        setError("This campaign ended before your registration was committed. Your draft remains in this browser.");
      } else setError(err.message);
    } finally { setSubmitting(false); }
  }

  if (loading) return <PageShell><div className="flex min-h-64 items-center justify-center"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Loading registration…</div></PageShell>;
  if (error && !campaign) return <PageShell><StateCard icon={AlertCircle} title="Registration unavailable" text={error}><Button variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></StateCard></PageShell>;

  if (authRequired) return <PageShell><CampaignHeader campaign={campaign} /><StateCard icon={LockKeyhole} title="Sign in to continue" text="Your profile and registration details stay private until you sign in with your MCC account."><ProgressLink href={`/login?returnTo=${encodeURIComponent(`/register/${slug}`)}`}><Button className={`${styles.press} min-h-11`}>Sign in and return</Button></ProgressLink><ProgressLink href="/signup" className="text-sm text-primary underline-offset-4 hover:underline">Need an MCC account? Create one</ProgressLink></StateCard></PageShell>;
  if (!preview) return <PageShell><CampaignHeader campaign={campaign} /><StateCard icon={AlertCircle} title="Your account cannot open this registration" text={error || "Check your account eligibility and try again."}><Button variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></StateCard></PageShell>;
  if (campaign?.status !== "open" && !receipt) return <PageShell><CampaignHeader campaign={campaign} /><StateCard icon={Clock3} title={campaign?.status === "ended" ? "Registration has ended" : "Registration is not open yet"} text={error || "Your account has not submitted a registration for this campaign."} /></PageShell>;
  if (receipt) return <PageShell><CampaignHeader campaign={campaign} /><Receipt receipt={receipt} /></PageShell>;

  return <PageShell>
    <CampaignHeader campaign={campaign} />
    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Review required</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <form ref={formRef} data-registration-form className="space-y-5" aria-labelledby="review-heading" onSubmit={submit} noValidate>
      <div className="sr-only" aria-live="polite">{error || Object.values(fieldErrors)[0] || ""}</div>
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Registration preview</p><h2 id="review-heading" className="mt-1 text-2xl font-semibold">Review your details</h2><p className="mt-1 text-sm text-muted-foreground">Known account values are reused. Only missing required profile details can be entered here.</p></div>
      <div className={`${styles.surface} rounded-2xl p-5`}><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold">MCC account</h3><p className="text-sm text-muted-foreground">Account email cannot be changed here.</p></div><UserRound className="h-5 w-5 text-muted-foreground" /></div><ProfileFact label="Email" value={profileValue(preview.profile, "email")} /><div className="mt-4"><ProgressLink href={`/profile?returnTo=${encodeURIComponent(`/register/${slug}`)}`} className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">Correct an existing profile value <ExternalLink className="h-3.5 w-3.5" /></ProgressLink></div></div>
      <div className="space-y-4">{fields.map((field) => {
        const missing = needsProfileInput(field);
        if (field.mapUserField && !missing) return <div key={field.id} className={`${styles.surface} rounded-2xl p-5`}><ProfileFact label={field.label} value={profileValue(preview.profile, field.mapUserField)} pending={isPending(preview.profile, field.mapUserField)} help={field.helpText} /></div>;
        const value = field.mapUserField ? profileValues[field.mapUserField] ?? "" : answers[field.id] ?? (field.type === "checkbox" ? false : "");
        const change = (next) => field.mapUserField ? setProfileValues((old) => ({ ...old, [field.mapUserField]: next })) : setAnswers((old) => ({ ...old, [field.id]: next }));
        return <div key={field.id} className={`${styles.surface} rounded-2xl p-5`}><RegistrationField field={field} value={value} onChange={change} error={fieldErrors[field.id]} profileInput={missing} /></div>;
      })}</div>
      <div className={`${styles.actionBar} rounded-2xl p-4 sm:p-5`}><label className="flex min-h-11 cursor-pointer items-start gap-3"><Checkbox className="mt-0.5" checked={agreement} onCheckedChange={(checked) => setAgreement(Boolean(checked))} aria-invalid={Boolean(fieldErrors.agreement)} /><span className="text-sm leading-6">{campaign.agreement_text || "I confirm that these details are correct and agree to register."}</span></label>{fieldErrors.agreement && <p className="mt-2 text-sm text-destructive">{fieldErrors.agreement}</p>}<Button type="submit" className={`${styles.press} mt-4 min-h-12 w-full text-base`} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}{submitting ? "Registering…" : "Confirm registration"}</Button><p className="mt-2 text-center text-xs text-muted-foreground">You can submit once. Pending handle verification does not block registration.</p></div>
    </form>
  </PageShell>;
}

function PageShell({ children }) { return <main className={`${styles.page} px-4 py-8 sm:px-6 lg:py-12`}><div className="mx-auto max-w-3xl space-y-6">{children}</div></main>; }
function CampaignHeader({ campaign }) { return <header className={`${styles.hero} rounded-[1.75rem] p-6 sm:p-8`}><div className="flex flex-wrap items-center gap-2"><Badge variant={campaign?.status === "open" ? "default" : "secondary"}>{campaign?.status || "Unavailable"}</Badge><span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">MCC registration</span></div><h1 className="mt-4 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{campaign?.title || "Registration"}</h1><p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground sm:text-base">{campaign?.description || "Review the campaign details and continue with your MCC account."}</p></header>; }
function StateCard({ icon: Icon, title, text, children }) { return <section className={`${styles.surface} rounded-2xl px-6 py-12 text-center`}><Icon className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{text}</p>{children && <div className="mt-6 flex flex-col items-center gap-3">{children}</div>}</section>; }
function ProfileFact({ label, value, pending, help }) { return <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>{pending && <Badge variant="secondary"><Clock3 className="mr-1 h-3 w-3" />Pending verification</Badge>}</div><p className="mt-1 break-words text-base font-medium">{displayValue(value)}</p>{help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}</div>; }

function RegistrationField({ field, value, onChange, error, profileInput }) {
  const id = `field-${field.id}`;
  const common = { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : field.helpText ? `${id}-help` : undefined };
  let control;
  if (field.type === "long_text") control = <Textarea {...common} value={value} onChange={(event) => onChange(event.target.value)} />;
  else if (field.type === "select") control = <select {...common} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose an option</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  else if (field.type === "checkbox") control = <label className="flex min-h-11 items-center gap-3"><Checkbox id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} aria-invalid={Boolean(error)} /><span className="text-sm">Yes</span></label>;
  else control = <Input {...common} type={field.mapUserField === "mist_id" ? "text" : field.type} inputMode={field.mapUserField === "mist_id" ? "numeric" : undefined} pattern={field.mapUserField === "mist_id" ? "[0-9]{9}" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
  return <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><Label htmlFor={id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</Label>{profileInput && <Badge variant="outline">Completes profile</Badge>}</div>{control}{field.helpText && <p id={`${id}-help`} className="text-xs text-muted-foreground">{field.helpText}</p>}{error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}</div>;
}

function Receipt({ receipt }) {
  const pending = receipt.pending_verification || receipt.verification_status === "pending" || (receipt.pending_fields?.length > 0);
  return <section className={`${styles.surface} rounded-2xl p-6 sm:p-8`}><CheckCircle2 className="h-11 w-11 text-emerald-600" /><h2 className="mt-4 text-2xl font-semibold">Registration complete</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Your response was recorded. Keep this receipt for your records.</p><dl className="mt-6 grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2"><ReceiptFact label="Receipt" value={receipt.id || receipt.receipt_id || receipt.code} /><ReceiptFact label="Submitted" value={receipt.submitted_at ? new Date(receipt.submitted_at).toLocaleString() : "Recorded"} /></dl>{pending && <Alert className="mt-5"><Clock3 className="h-4 w-4" /><AlertTitle>Profile verification pending</AlertTitle><AlertDescription>Your registration is complete. The listed handle updates still need administrator verification.</AlertDescription></Alert>}<div className="mt-6 flex flex-wrap gap-3"><ProgressLink href="/"><Button variant="outline">Return home</Button></ProgressLink><ProgressLink href="/profile"><Button>View profile</Button></ProgressLink></div></section>;
}
function ReceiptFact({ label, value }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-mono text-sm">{displayValue(value)}</dd></div>; }
