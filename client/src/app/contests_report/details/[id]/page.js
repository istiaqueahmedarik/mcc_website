import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Calculator,
  ChevronDown,
  CircleCheck,
  FileText,
  Globe2,
  KeyRound,
  LockKeyhole,
  PlusCircle,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getContestRoomContestById,
  getContestRoomScoring,
  getContestReportCodeforcesCredentials,
  insertContestRoomContest,
  replaceContestCodeforcesIdentityMapping,
  clearContestReportCodeforcesCredentials,
  clearContestReportProviderSession,
  saveContestReportCodeforcesCredentials,
  saveContestReportProviderSession,
  updateContestRoomContestWithWeight,
} from "@/actions/contest_details";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DeleteRoomButton from "@/components/DeleteRoomButton";
import DeleteContestButton from "@/components/DeleteContestButton";
import ContestScoringDialog from "@/components/ContestScoringDialog";
import ContestMergeOverview from "@/components/ContestMergeOverview";
import ContestReportSubmitButton from "@/components/ContestReportSubmitButton";
import GlobalContestSourceForm, { CodeforcesGroupMappingForm } from "@/components/GlobalContestSourceForm";

async function readMappingCsv(formData, required) {
  const file = formData.get("codeforces-mapping-csv");
  if (!file || typeof file.text !== "function" || file.size === 0) {
    if (required) throw new Error("Choose a CSV containing username and student_id columns");
    return null;
  }
  if (file.size > 512 * 1024) throw new Error("The mapping CSV must be 512 KiB or smaller");
  return file.text();
}

async function handleAddContest(formData, paramsBox) {
  "use server";
  const contestId = formData.get("contest-id");
  const contestName = formData.get("contest-name");
  const provider = formData.get("provider");
  const codeforcesSourceType = provider === "codeforces" ? formData.get("codeforces-source-type") : null;
  const codeforcesGroupIdentityMode = codeforcesSourceType === "group"
    ? formData.get("codeforces-group-identity-mode")
    : null;
  const roomId = paramsBox;

  let mappingCsv = null;
  try {
    mappingCsv = await readMappingCsv(formData, codeforcesGroupIdentityMode === "csv");
  } catch (error) {
    redirect(`/error/${encodeURIComponent(error?.message || "The mapping CSV is invalid")}`);
  }
  const res = await insertContestRoomContest(roomId, contestId, contestName, provider, {
    codeforcesSourceType,
    codeforcesGroupIdentityMode,
    mappingCsv,
  });
  if (res && (res.status === "success" || res.success)) {
    redirect(`/contests_report/details/${roomId}`);
  } else {
    const msg = encodeURIComponent(
      res?.message || res?.error || "Failed to create room"
    );
    redirect(`/error/${msg}`);
  }
}

async function handleReplaceCodeforcesIdentityMapping(formData, roomId, contestItemId) {
  "use server";
  const mode = formData.get("codeforces-group-identity-mode");
  let mappingCsv = null;
  try {
    mappingCsv = await readMappingCsv(formData, mode === "csv");
  } catch (error) {
    redirect(`/error/${encodeURIComponent(error?.message || "The mapping CSV is invalid")}`);
  }
  const result = await replaceContestCodeforcesIdentityMapping(contestItemId, mode, mappingCsv);
  if (!result?.success) {
    redirect(`/error/${encodeURIComponent(result?.error || "Failed to save the group identity mapping")}`);
  }
  redirect(`/contests_report/details/${roomId}?identityMapping=updated`);
}

async function handleProviderSession(formData, roomId) {
  "use server";
  const provider = formData.get("provider");
  const result = await saveContestReportProviderSession(provider, formData.get("session"));
  const query = result?.success
    ? `access=${encodeURIComponent(`${provider}-connected`)}`
    : `accessError=${encodeURIComponent(result?.error || "Failed to save provider session")}`;
  redirect(`/contests_report/details/${roomId}?${query}#provider-access`);
}

async function handleClearProviderSession(formData, roomId) {
  "use server";
  const provider = formData.get("provider");
  await clearContestReportProviderSession(provider);
  redirect(`/contests_report/details/${roomId}?access=${encodeURIComponent(`${provider}-cleared`)}#provider-access`);
}

async function handleCodeforcesCredentials(formData, roomId) {
  "use server";
  const result = await saveContestReportCodeforcesCredentials(
    formData.get("api-key"),
    formData.get("api-secret"),
  );
  const query = result?.success
    ? "access=codeforces-credentials-saved"
    : `accessError=${encodeURIComponent(result?.error || "Failed to save Codeforces credentials")}`;
  redirect(`/contests_report/details/${roomId}?${query}#provider-access`);
}

async function handleClearCodeforcesCredentials(roomId) {
  "use server";
  const result = await clearContestReportCodeforcesCredentials();
  const query = result?.success
    ? "access=codeforces-credentials-cleared"
    : `accessError=${encodeURIComponent(result?.error || "Failed to remove Codeforces credentials")}`;
  redirect(`/contests_report/details/${roomId}?${query}#provider-access`);
}

// Add a handler for weight update
async function handleUpdateWeight(formData, paramsBox) {
  "use server";
  const contestRoomContestId = formData.get("contestRoomContestId");
  const roomId = formData.get("roomId");
  const contestId = formData.get("contestId");
  const weight = Number(formData.get("weight"));
  const res = await updateContestRoomContestWithWeight(
    contestRoomContestId,
    roomId,
    contestId,
    weight
  );
  if (res && (res.status === "success" || res.success)) {
    redirect(`/contests_report/details/${roomId}`);
  } else {
    const msg = encodeURIComponent(
      res?.message || res?.error || "Failed to update weight"
    );
    redirect(`/error/${msg}`);
  }
}

async function page({ params, searchParams }) {
  const paramsBox = await params;
  const id = paramsBox.id;
  const searchParamsBox = await searchParams;
  const show = searchParamsBox?.show;

  if (show) return <Modal paramsBox={id} />;
  const res = await getContestRoomContestById(id);
  const roomMeta = res?.room || null;
  const roomType = String(roomMeta?.contest_type || "TFC").toUpperCase();
  const contests = Array.isArray(res?.result) ? res.result : [];
  const providers = new Set(contests.map((contest) => (
    contest?.provider === "codeforces" ? "codeforces" : "vjudge"
  )));
  const needsVjudge = providers.has("vjudge");
  const needsCodeforces = providers.has("codeforces");
  const cookieStore = await cookies();
  const vjudgeConnected = Boolean(cookieStore.get("vj_session")?.value);
  const codeforcesConnected = Boolean(cookieStore.get("cf_session")?.value);
  const codeforcesCredentialRes = needsCodeforces
    ? await getContestReportCodeforcesCredentials()
    : null;
  const codeforcesCredential = codeforcesCredentialRes?.credential || { configured: false };
  const scoringRes = await getContestRoomScoring(id);
  const scoringConfig = scoringRes?.config || null;
  const roomName = roomMeta?.["Room Name"] || "Contest room";
  const reportBlocked = needsVjudge && !vjudgeConnected;
  /**
       * {
    result: [
      {
        id: '7714cda7-16c9-442e-937b-76d3d6f6487f',
        created_at: '2025-04-15T18:48:32.673Z',
        room_id: '8e6cfd2b-a74b-4df0-b200-408df3cb19b2',
        contest_id: '709641'
      },
      {
        id: 'bd041ae5-21d4-4714-9469-fb56ae6a6dc4',
        created_at: '2025-04-15T18:50:08.723Z',
        room_id: '8e6cfd2b-a74b-4df0-b200-408df3cb19b2',
        contest_id: '709642'
      }
    ],
    success: true
  }
       */
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">{roomName}</h1>
            <p className="mt-1 text-muted-foreground text-pretty">
              Manage contest sources, provider access, and report generation.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tracking-wide text-foreground">
                {roomType}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 rounded-full px-6"
            >
              <Link
                href={`/contests_report/details/${paramsBox.id}?show=true`}
                className="flex items-center"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add More Contest
              </Link>
            </Button>
            <DeleteRoomButton roomId={paramsBox.id} roomName={roomMeta?.["Room Name"]} />
          </div>
        </div>
      </header>

      {roomType === "TSC" && (
        <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium text-foreground">TSC Formula Configuration</p>
          <p className="mt-1 text-muted-foreground">
            Reference TFC Room ID: {roomMeta?.tfc_room_id || "Not set"}
          </p>
          <p className="mt-1 text-muted-foreground">
            TFC percentage is set during final report generation. TSC percentage is auto-calculated as 100 - TFC.
          </p>
        </div>
      )}

      <section id="provider-access" className="mb-6 scroll-mt-6 overflow-hidden rounded-2xl border bg-card">
        {(needsVjudge || needsCodeforces) && (
          <>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Access readiness
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-balance">Connect only what this report needs</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground text-pretty">
                  Public data is tried first. Private provider sessions stay in HTTP-only cookies for 12 hours.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Providers used by this room">
                {needsVjudge && (
                  <Badge variant={vjudgeConnected ? "secondary" : "outline"} className="gap-1.5">
                    {vjudgeConnected && <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    VJudge
                  </Badge>
                )}
                {needsCodeforces && (
                  <Badge variant="secondary" className="gap-1.5">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Codeforces public API
                  </Badge>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {searchParamsBox?.access && (
                <p role="status" className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                  Provider access updated.
                </p>
              )}
              {searchParamsBox?.accessError && (
                <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {searchParamsBox.accessError}
                </p>
              )}
              {needsCodeforces && codeforcesCredentialRes?.error && !searchParamsBox?.accessError && (
                <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {codeforcesCredentialRes.error}
                </p>
              )}

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                {needsVjudge && (
                  <article className="rounded-xl border bg-muted/15 p-4 sm:p-5">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground ring-1 ring-border">
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-semibold">VJudge session</h3>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground text-pretty">
                            Required for the VJudge contests in this room. Paste the session ID, never your password.
                          </p>
                        </div>
                      </div>
                      <Badge variant={vjudgeConnected ? "secondary" : "outline"} className="w-fit shrink-0">
                        {vjudgeConnected ? "Connected" : "Required"}
                      </Badge>
                    </div>
                    <form action={async (formData) => {
                      "use server";
                      await handleProviderSession(formData, id);
                    }} className="space-y-3">
                      <input type="hidden" name="provider" value="vjudge" />
                      <div className="space-y-2">
                        <label htmlFor="vjudge-session" className="text-sm font-medium">JSESSIONID</label>
                        <Input id="vjudge-session" name="session" type="password" autoComplete="off" placeholder="Paste JSESSIONID" required />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {vjudgeConnected && (
                          <Button formAction={async (formData) => {
                            "use server";
                            await handleClearProviderSession(formData, id);
                          }} type="submit" formNoValidate variant="ghost" className="min-h-11">Clear</Button>
                        )}
                        <ContestReportSubmitButton pendingLabel="Connecting…" className="min-h-11 active:scale-[0.98] motion-reduce:transform-none">
                          <KeyRound className="mr-2 h-4 w-4" />Connect VJudge
                        </ContestReportSubmitButton>
                      </div>
                    </form>
                  </article>
                )}

                {needsCodeforces && (
                  <article className="rounded-xl border bg-muted/15 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground ring-1 ring-border">
                          <Globe2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-semibold">Codeforces access chain</h3>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground text-pretty">
                            The public API runs first. Add a fallback only for private Gym, EDU, or blocked access.
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit shrink-0">Public ready</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg bg-background/70 px-3 py-3 ring-1 ring-border/70">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <CircleCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Anonymous API</p>
                          <p className="text-xs text-muted-foreground">Always attempted first. No setup needed.</p>
                        </div>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Ready</span>
                      </div>

                      <details className="group rounded-lg bg-background/70 ring-1 ring-border/70" open={!codeforcesCredential.configured}>
                        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">Signed API retry</span>
                            <span className="block text-xs text-muted-foreground">
                              {codeforcesCredential.configured
                                ? `Encrypted key ${codeforcesCredential.apiKeyHint || "••••"} is saved.`
                                : "For private contests when public access fails."}
                            </span>
                          </span>
                          <Badge variant={codeforcesCredential.configured ? "secondary" : "outline"} className="hidden shrink-0 sm:inline-flex">
                            {codeforcesCredential.configured ? "Configured" : "Optional"}
                          </Badge>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                        </summary>
                        <form action={async (formData) => {
                          "use server";
                          await handleCodeforcesCredentials(formData, id);
                        }} className="space-y-3 border-t border-border/70 p-3">
                          <a
                            href="https://codeforces.com/settings/api"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-xs font-medium text-foreground underline underline-offset-4 hover:text-primary"
                          >
                            Open Codeforces API settings
                          </a>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label htmlFor="codeforces-api-key" className="text-sm font-medium">API key</label>
                              <Input id="codeforces-api-key" name="api-key" autoComplete="off" required />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="codeforces-api-secret" className="text-sm font-medium">API secret</label>
                              <Input id="codeforces-api-secret" name="api-secret" type="password" autoComplete="off" required />
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {codeforcesCredential.configured && (
                              <Button formAction={async () => {
                                "use server";
                                await handleClearCodeforcesCredentials(id);
                              }} type="submit" formNoValidate variant="ghost" className="min-h-11">Clear key</Button>
                            )}
                            <ContestReportSubmitButton pendingLabel="Saving…" className="min-h-11 active:scale-[0.98] motion-reduce:transform-none">
                              Save encrypted credentials
                            </ContestReportSubmitButton>
                          </div>
                        </form>
                      </details>

                      <details className="group rounded-lg bg-background/70 ring-1 ring-border/70">
                        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">Web session fallback</span>
                            <span className="block text-xs text-muted-foreground">
                              {codeforcesConnected ? "Connected for authenticated crawling." : "Used for EDU and blocked web access."}
                            </span>
                          </span>
                          <Badge variant={codeforcesConnected ? "secondary" : "outline"} className="hidden shrink-0 sm:inline-flex">
                            {codeforcesConnected ? "Connected" : "Optional"}
                          </Badge>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                        </summary>
                        <form action={async (formData) => {
                          "use server";
                          await handleProviderSession(formData, id);
                        }} className="space-y-3 border-t border-border/70 p-3">
                          <input type="hidden" name="provider" value="codeforces" />
                          <div className="space-y-2">
                            <label htmlFor="codeforces-session" className="text-sm font-medium">Codeforces JSESSIONID</label>
                            <Input id="codeforces-session" name="session" type="password" autoComplete="off" placeholder="Paste JSESSIONID" required />
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {codeforcesConnected && (
                              <Button formAction={async (formData) => {
                                "use server";
                                await handleClearProviderSession(formData, id);
                              }} type="submit" formNoValidate variant="ghost" className="min-h-11">Clear</Button>
                            )}
                            <ContestReportSubmitButton pendingLabel="Connecting…" className="min-h-11 active:scale-[0.98] motion-reduce:transform-none">
                              <KeyRound className="mr-2 h-4 w-4" />Connect Codeforces
                            </ContestReportSubmitButton>
                          </div>
                        </form>
                      </details>
                    </div>
                  </article>
                )}
              </div>
            </div>
          </>
        )}

        <div className={`flex flex-col gap-3 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${(needsVjudge || needsCodeforces) ? "border-t" : ""}`}>
          <div className="flex min-w-0 items-center gap-3 px-1">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${reportBlocked ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
              {reportBlocked ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : <CircleCheck className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{reportBlocked ? "One connection needed" : "Ready to generate"}</p>
              <p className="text-xs text-muted-foreground">
                {reportBlocked ? "Connect VJudge to unlock the full report." : `${contests.length} contest${contests.length === 1 ? "" : "s"} will be included.`}
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <ContestScoringDialog
              apiBasePath={`contest-room/${paramsBox.id}`}
              contests={res.result || []}
              roomName={roomName}
              trigger={(
                <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-4 active:scale-[0.98] motion-reduce:transform-none">
                  <Calculator className="mr-2 h-4 w-4" />
                  Scoring &amp; Merge
                </Button>
              )}
            />
            <Button size="sm" className="min-h-11 rounded-lg px-5 active:scale-[0.98] motion-reduce:transform-none" asChild>
              <Link
                href={reportBlocked
                  ? "#provider-access"
                  : `/contests_report/details/${paramsBox.id}/generate_report`}
                className="flex items-center justify-center"
              >
                <FileText className="mr-2 h-4 w-4" />
                {reportBlocked ? "Connect VJudge" : "Generate Full Report"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <ContestMergeOverview
        className="mb-6"
        contests={res.result || []}
        groups={scoringConfig?.groups || []}
      />

      {searchParamsBox?.identityMapping && (
        <p role="status" className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Codeforces group identity rule updated.
        </p>
      )}

      <div className="grid items-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {res.result && res.result.length > 0 ? (
          res.result.map((contest, idx) => (
            <Card
              key={idx}
              className="overflow-hidden border-0 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 bg-card"
            >
              <div className="relative h-16 bg-foreground/10 rounded-t-3xl px-6 flex items-center">
                <Badge
                  variant="secondary"
                  className="absolute -bottom-3 left-6 py-1 px-4 rounded-full text-xs font-bold bg-card dark:bg-card shadow-sm"
                >
                  {contest.provider === "codeforces" ? "Codeforces" : "VJudge"} · {contest.contest_id}
                </Badge>
              </div>

              <CardContent className="pt-8 pb-4 px-6">
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-[1fr,auto] gap-y-3 text-sm">
                    <span className="font-medium text-muted-foreground">
                      Name
                    </span>
                    <span className="font-bold text-right">
                      {contest?.contest_name}
                    </span>

                    <span className="font-medium text-muted-foreground">
                      ID
                    </span>
                    <span className="font-mono text-right">
                      {contest.id.substring(0, 8)}...
                    </span>

                    {contest.provider === "codeforces" && (
                      <>
                        <span className="font-medium text-muted-foreground">Source</span>
                        <span className="text-right capitalize">{contest.codeforces_source_type || "Public"}</span>
                      </>
                    )}

                    <span className="font-medium text-muted-foreground">
                      Created
                    </span>
                    <span className="text-right">
                      {new Date(contest.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>

                    <span className="font-medium text-muted-foreground">
                      Room ID
                    </span>
                    <span className="font-mono text-right">
                      {contest.room_id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </CardContent>

              <Separator className="mx-6 bg-border dark:bg-border" />

              <CardFooter className="flex flex-col gap-4 pt-4 pb-6 px-6">
                <div className={`grid w-full gap-2 ${contest.provider === "codeforces" && contest.codeforces_source_type === "group" ? "grid-cols-2 2xl:grid-cols-3" : "grid-cols-2"}`}>
                  <DeleteContestButton
                    contestRoomContestId={contest.id}
                    contestName={contest?.contest_name}
                    className="min-h-11 w-full rounded-full border-destructive bg-card px-3 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] motion-reduce:transform-none dark:border-destructive dark:hover:bg-destructive/20"
                  />

                  {contest.provider === "codeforces" && contest.codeforces_source_type === "group" && (
                    <CodeforcesGroupMappingForm
                      currentMode={contest.codeforces_group_identity_mode}
                      mappingCount={contest.codeforces_mapping_count}
                      triggerClassName="min-h-11 w-full rounded-full px-3 active:scale-[0.98] motion-reduce:transform-none"
                      action={async (formData) => {
                        "use server";
                        await handleReplaceCodeforcesIdentityMapping(formData, paramsBox.id, contest.id);
                      }}
                    />
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    className={`min-h-11 w-full rounded-full border-0 bg-secondary px-3 text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] motion-reduce:transform-none dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/70 ${contest.provider === "codeforces" && contest.codeforces_source_type === "group" ? "col-span-2 2xl:col-span-1" : ""}`}
                    asChild
                  >
                    <Link
                      href={contest.provider !== "codeforces" && !vjudgeConnected
                        ? "#provider-access"
                        : `/contests_report/details/${paramsBox.id}/generate_report?item=${contest.id}`}
                      className="flex items-center w-full justify-center"
                    >
                      <FileText className="h-4 w-4" />
                      {contest.provider !== "codeforces" && !vjudgeConnected ? "Connect VJudge" : "Generate Report"}
                    </Link>
                  </Button>
                </div>

                <form
                  action={async (formData) => {
                    "use server";
                    await handleUpdateWeight(formData, paramsBox.id);
                  }}
                  className="flex items-center gap-3 w-full"
                >
                  <input
                    type="hidden"
                    name="contestRoomContestId"
                    value={contest.id}
                  />
                  <input type="hidden" name="roomId" value={contest.room_id} />
                  <input
                    type="hidden"
                    name="contestId"
                    value={contest.contest_id}
                  />

                  <div className="relative flex-1">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      name="weight"
                      min="0"
                      step="0.1"
                      placeholder="Weight"
                      defaultValue={contest.weight}
                      className="pl-10 h-9 rounded-full border-slate-200 dark:border-slate-800"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                  >
                    Update
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                No contests found
              </h3>
              <p className="text-muted-foreground mb-4">
                Add your first contest to get started
              </p>
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 rounded-full px-6"
              >
                <Link
                  href={`/contests_report/details/${paramsBox.id}?show=true`}
                  className="flex items-center"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add Contest
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default page;

async function Modal({ paramsBox }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
        <GlobalContestSourceForm action={async (formData) => {
          "use server";
          await handleAddContest(formData, paramsBox);
        }} />
      </div>
      <div className="relative hidden w-full md:block md:w-1/2">
        <div className="absolute inset-0">
          <Image
            src="/vjudge_cover4.png"
            alt="Room creation illustration"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
