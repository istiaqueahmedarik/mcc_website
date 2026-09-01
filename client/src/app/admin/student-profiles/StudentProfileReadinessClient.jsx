"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import ProgressLink from "@/components/ProgressLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const BATCH_OPTIONS = Array.from({ length: 12 }, (_, index) => 19 + index);
const STATUS_OPTIONS = {
  all: "All profiles",
  complete: "Ready to export",
  incomplete: "Needs attention",
};
const PREVIEW_LIMIT = 100;
const FIELD_LABELS = {
  full_name: "Full name",
  student_id: "Student ID",
  cf_handle: "Codeforces handle",
  vjudge_username: "VJudge username",
};

const buttonMotionClass =
  "touch-manipulation transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.97]";

function asSearchText(profile) {
  return [
    profile.batch,
    profile.full_name,
    profile.student_id,
    profile.cf_handle,
    profile.vjudge_username,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function safeSpreadsheetValue(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function quoteCsv(value) {
  return `"${safeSpreadsheetValue(value).replaceAll('"', '""')}"`;
}

function downloadProfilesCsv(profiles, from, to, status) {
  const headers = ["batch", "full_name", "student_id", "cf_handle", "vjudge_username"];
  const csv = [
    headers.map(quoteCsv).join(","),
    ...profiles.map((profile) => headers.map((header) => quoteCsv(profile[header])).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", csv, "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `student-profiles-batches-${from}-${to}-${status}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function entrance(shouldReduceMotion, index = 0) {
  return {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, transform: "translateY(8px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: {
      duration: shouldReduceMotion ? 0.16 : 0.24,
      ease: [0.23, 1, 0.32, 1],
      delay: shouldReduceMotion ? 0 : index * 0.04,
    },
  };
}

export default function StudentProfileReadinessClient({
  initialFrom,
  initialTo,
  initialStatus,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [fromBatch, setFromBatch] = useState(initialFrom);
  const [toBatch, setToBatch] = useState(initialTo);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setFromBatch(initialFrom);
    setToBatch(initialTo);
    setStatus(initialStatus);
  }, [initialFrom, initialStatus, initialTo]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReadiness() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          from: String(fromBatch),
          to: String(toBatch),
        });
        const response = await fetch(`/api/classroom/admin/student-profile-readiness?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || json?.error) {
          throw new Error(json?.error || "Student profile data could not be loaded.");
        }
        setData(json);
      } catch (loadError) {
        if (loadError?.name !== "AbortError") {
          setError(loadError?.message || "Student profile data could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReadiness();
    return () => controller.abort();
  }, [fromBatch, reloadKey, toBatch]);

  const updateUrl = useCallback(
    (nextFrom, nextTo, nextStatus) => {
      const params = new URLSearchParams({
        from: String(nextFrom),
        to: String(nextTo),
        status: nextStatus,
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const handleFromChange = (value) => {
    const nextFrom = Number(value);
    const nextTo = Math.max(nextFrom, toBatch);
    setFromBatch(nextFrom);
    setToBatch(nextTo);
    updateUrl(nextFrom, nextTo, status);
  };

  const handleToChange = (value) => {
    const nextTo = Number(value);
    const nextFrom = Math.min(fromBatch, nextTo);
    setFromBatch(nextFrom);
    setToBatch(nextTo);
    updateUrl(nextFrom, nextTo, status);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    updateUrl(fromBatch, toBatch, value);
  };

  const visibleProfiles = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.profiles || []).filter((profile) => {
      if (status === "complete" && !profile.complete) return false;
      if (status === "incomplete" && profile.complete) return false;
      return !needle || asSearchText(profile).includes(needle);
    });
  }, [data?.profiles, search, status]);

  const missingFields = useMemo(() => {
    const totals = {
      full_name: 0,
      student_id: 0,
      cf_handle: 0,
      vjudge_username: 0,
    };
    for (const profile of data?.profiles || []) {
      for (const field of profile.missing_fields || []) totals[field] += 1;
    }
    return Object.entries(totals).map(([field, count]) => ({ field, count }));
  }, [data?.profiles]);

  const previewProfiles = visibleProfiles.slice(0, PREVIEW_LIMIT);
  const generatedTime = data?.generatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
        new Date(data.generatedAt),
      )
    : null;

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <motion.header
            {...entrance(shouldReduceMotion, 0)}
            className="flex flex-col gap-5 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Admin · Student Records
              </div>
              <h1 className="text-pretty text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                Profile readiness
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
                Find export-ready student profiles and see which required identity fields need attention.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className={buttonMotionClass}>
                <ProgressLink href="/admin/trainers">
                  <ArrowLeft aria-hidden="true" />
                  Manage users
                </ProgressLink>
              </Button>
              <Button
                className={buttonMotionClass}
                disabled={loading || visibleProfiles.length === 0}
                onClick={() => downloadProfilesCsv(visibleProfiles, fromBatch, toBatch, status)}
              >
                <Download aria-hidden="true" />
                Export {visibleProfiles.length.toLocaleString()} rows
              </Button>
            </div>
          </motion.header>

          <motion.section {...entrance(shouldReduceMotion, 1)} aria-labelledby="profile-filters-title">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle id="profile-filters-title" className="text-base">Export scope</CardTitle>
                    <CardDescription>Range and readiness stay in the URL for repeatable exports.</CardDescription>
                  </div>
                  {generatedTime && !loading ? (
                    <p className="text-xs text-muted-foreground">Snapshot refreshed at {generatedTime}</p>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[9rem_9rem_13rem_minmax(14rem,1fr)]">
                <FilterSelect label="From batch" value={String(fromBatch)} onChange={handleFromChange} />
                <FilterSelect label="To batch" value={String(toBatch)} onChange={handleToChange} />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-status">
                    Profile status
                  </label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger id="profile-status" className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-search">
                    Search current range
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="profile-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Name, ID, or handle…"
                      autoComplete="off"
                      spellCheck={false}
                      className="bg-muted/30 pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {error ? (
            <Alert variant="destructive" role="alert">
              <CircleAlert className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Profile readiness could not load</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{error} Check your connection, then try again.</span>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(buttonMotionClass, "self-start")}
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  <RefreshCw aria-hidden="true" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <ReadinessSkeleton />
          ) : data ? (
            <>
              <motion.section {...entrance(shouldReduceMotion, 2)} aria-labelledby="readiness-overview-title">
                <h2 id="readiness-overview-title" className="sr-only">Profile readiness overview</h2>
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.35fr_1fr]">
                    <div className="border-b border-border/60 p-5 sm:p-6 lg:border-b-0 lg:border-r">
                      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Overall readiness
                          </p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-5xl font-semibold tracking-[-0.045em] tabular-nums">
                              {data.summary.completenessRate.toLocaleString()}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              of {data.summary.total.toLocaleString()} students
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
                          <span className="text-muted-foreground">Ready</span>
                          <strong className="text-right font-semibold">{data.summary.complete.toLocaleString()}</strong>
                          <span className="text-muted-foreground">Needs attention</span>
                          <strong className="text-right font-semibold">{data.summary.incomplete.toLocaleString()}</strong>
                        </div>
                      </div>
                      <BatchReadinessChart batches={data.batches} shouldReduceMotion={shouldReduceMotion} />
                    </div>
                    <div className="bg-muted/15 p-5 sm:p-6">
                      <div className="mb-5">
                        <h3 className="text-base font-semibold">Missing-field pressure</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Each count is a profile that cannot enter a complete export yet.
                        </p>
                      </div>
                      <MissingFieldChart
                        fields={missingFields}
                        total={data.summary.total}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                      <div className="mt-6 rounded-lg border border-border/60 bg-background/80 p-4">
                        <div className="flex items-start gap-3">
                          <FileSpreadsheet className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                          <p className="text-sm leading-5 text-muted-foreground">
                            CSV export follows the selected status and current search. Spreadsheet-leading formulas are neutralized automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section {...entrance(shouldReduceMotion, 3)} aria-labelledby="profile-preview-title">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
                    <div>
                      <CardTitle id="profile-preview-title" className="text-base">Profile preview</CardTitle>
                      <CardDescription aria-live="polite">
                        {visibleProfiles.length.toLocaleString()} {STATUS_OPTIONS[status].toLowerCase()}
                        {search.trim() ? ` matching “${search.trim()}”` : ""}.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1.5 font-medium">
                        <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Batches {fromBatch}–{toBatch}
                      </Badge>
                      {status === "complete" ? (
                        <Badge className="gap-1.5 font-medium">
                          <UserRoundCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Export ready
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {visibleProfiles.length === 0 ? (
                      <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                        <Search className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <p className="font-medium">No profiles match this view</p>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                          Clear the search or choose another readiness status or batch range.
                        </p>
                      </div>
                    ) : (
                      <div
                        className="max-h-[34rem] overflow-auto overscroll-contain border-t border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        role="region"
                        aria-label="Student profile preview table"
                        tabIndex={0}
                      >
                        <table className="w-full caption-bottom text-sm">
                          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="h-10 w-20">Batch</TableHead>
                              <TableHead className="h-10">Full name</TableHead>
                              <TableHead className="h-10">Student ID</TableHead>
                              <TableHead className="h-10">Codeforces</TableHead>
                              <TableHead className="h-10">VJudge</TableHead>
                              <TableHead className="h-10 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewProfiles.map((profile, index) => (
                              <ProfileRow key={`${profile.batch}-${profile.student_id || "missing"}-${index}`} profile={profile} />
                            ))}
                          </TableBody>
                        </table>
                      </div>
                    )}
                    {visibleProfiles.length > PREVIEW_LIMIT ? (
                      <p className="border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
                        Previewing the first {PREVIEW_LIMIT.toLocaleString()} rows. Export includes all {visibleProfiles.length.toLocaleString()} matching rows.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.section>
            </>
          ) : null}
        </div>
      </main>
    </MotionConfig>
  );
}

function FilterSelect({ label, value, onChange }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  const selectedBatch = Number(value);
  const options = [...new Set([...BATCH_OPTIONS, selectedBatch])].sort((a, b) => a - b);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="bg-muted/30 tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((batch) => (
            <SelectItem key={batch} value={String(batch)}>Batch {batch}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BatchReadinessChart({ batches, shouldReduceMotion }) {
  return (
    <div
      className="space-y-4"
      role="img"
      aria-label={`Complete and incomplete student profiles by batch. ${batches
        .map((batch) => `Batch ${batch.batch}: ${batch.complete} ready and ${batch.incomplete} need attention`)
        .join(". ")}.`}
    >
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" />Ready</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/25" />Needs attention</span>
      </div>
      {batches.map((batch, index) => {
        const completeWidth = batch.total > 0 ? (batch.complete / batch.total) * 100 : 0;
        const incompleteWidth = batch.total > 0 ? (batch.incomplete / batch.total) * 100 : 0;
        return (
          <div key={batch.batch} className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3">
            <div>
              <p className="text-sm font-semibold tabular-nums">Batch {batch.batch}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{batch.total} students</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs tabular-nums">
                <span className="text-muted-foreground">{batch.complete} ready</span>
                <span className="font-medium">{batch.completenessRate}%</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div style={{ width: `${completeWidth}%` }}>
                  <motion.div
                    className="h-full w-full bg-primary"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.7, transform: "scaleX(0)" }}
                    animate={{ opacity: 1, transform: "scaleX(1)" }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0, delay: shouldReduceMotion ? 0 : index * 0.04 }}
                    style={{ transformOrigin: "left center" }}
                  />
                </div>
                <div style={{ width: `${incompleteWidth}%` }}>
                  <motion.div
                    className="h-full w-full bg-muted-foreground/25"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.5, transform: "scaleX(0)" }}
                    animate={{ opacity: 1, transform: "scaleX(1)" }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0, delay: shouldReduceMotion ? 0 : index * 0.04 + 0.04 }}
                    style={{ transformOrigin: "left center" }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissingFieldChart({ fields, total, shouldReduceMotion }) {
  const maxCount = Math.max(1, ...fields.map((field) => field.count));
  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        const width = (field.count / maxCount) * 100;
        return (
          <div key={field.field}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{FIELD_LABELS[field.field]}</span>
              <span className="font-semibold tabular-nums">
                {field.count}
                <span className="ml-1 font-normal text-muted-foreground">/ {total}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <motion.div
                className="h-full rounded-full bg-foreground/55"
                style={{ width: `${width}%`, transformOrigin: "left center" }}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.5, transform: "scaleX(0)" }}
                animate={{ opacity: 1, transform: "scaleX(1)" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0, delay: shouldReduceMotion ? 0 : index * 0.04 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileRow({ profile }) {
  const cell = (value, field) => value ? (
    <span translate="no">{value}</span>
  ) : (
    <span className="text-muted-foreground">Missing {FIELD_LABELS[field].toLowerCase()}</span>
  );

  return (
    <TableRow>
      <TableCell className="py-3 font-medium tabular-nums">{profile.batch}</TableCell>
      <TableCell className="max-w-64 py-3 font-medium">{cell(profile.full_name, "full_name")}</TableCell>
      <TableCell className="py-3 font-mono text-xs tabular-nums">{cell(profile.student_id, "student_id")}</TableCell>
      <TableCell className="max-w-52 py-3 font-mono text-xs">{cell(profile.cf_handle, "cf_handle")}</TableCell>
      <TableCell className="max-w-52 py-3 font-mono text-xs">{cell(profile.vjudge_username, "vjudge_username")}</TableCell>
      <TableCell className="py-3 text-right">
        {profile.complete ? (
          <Badge variant="secondary" className="gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 font-medium">
            <CircleAlert className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {profile.missing_fields.length} missing
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function ReadinessSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]" aria-label="Loading profile readiness">
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-5 p-6">
          <Skeleton className="h-12 w-44" />
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid grid-cols-[4rem_1fr] items-center gap-3">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-5 p-6">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
