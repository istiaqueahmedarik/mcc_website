import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { PlusCircle, FileText, KeyRound, Scale } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getContestRoomContestById,
  getContestRoomScoring,
  getContestReportCodeforcesCredentials,
  insertContestRoomContest,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function handleAddContest(formData, paramsBox) {
  "use server";
  const contestId = formData.get("contest-id");
  const contestName = formData.get("contest-name");
  const provider = formData.get("provider");
  const roomId = paramsBox;

  const res = await insertContestRoomContest(roomId, contestId, contestName, provider);
  if (res && (res.status === "success" || res.success)) {
    redirect(`/contests_report/details/${roomId}`);
  } else {
    const msg = encodeURIComponent(
      res?.message || res?.error || "Failed to create room"
    );
    redirect(`/error/${msg}`);
  }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Room</h1>
            <p className="text-muted-foreground mt-1">
              Add and find report on contests
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tracking-wide text-foreground">
                {roomType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

      {(needsVjudge || needsCodeforces) && (
        <section id="provider-access" className="mb-6 scroll-mt-6 rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Provider access</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect only the providers used by this room. Sessions stay in HTTP-only cookies for 12 hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {needsVjudge && <Badge variant="outline">VJudge</Badge>}
              {needsCodeforces && <Badge variant="outline">Codeforces</Badge>}
            </div>
          </div>

          {searchParamsBox?.access && (
            <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Provider access updated.
            </p>
          )}
          {searchParamsBox?.accessError && (
            <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {searchParamsBox.accessError}
            </p>
          )}
          {needsCodeforces && codeforcesCredentialRes?.error && !searchParamsBox?.accessError && (
            <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {codeforcesCredentialRes.error}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {needsVjudge && (
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">VJudge session</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required for VJudge reports. Paste JSESSIONID; MCC does not collect your VJudge password here.
                    </p>
                  </div>
                  <Badge variant={vjudgeConnected ? "secondary" : "outline"}>
                    {vjudgeConnected ? "Connected" : "Required"}
                  </Badge>
                </div>
                <form action={async (formData) => {
                  "use server";
                  await handleProviderSession(formData, id);
                }} className="space-y-3">
                  <input type="hidden" name="provider" value="vjudge" />
                  <label htmlFor="vjudge-session" className="text-sm font-medium">JSESSIONID</label>
                  <Input id="vjudge-session" name="session" type="password" autoComplete="off" placeholder="JSESSIONID=…" required />
                  <div className="flex flex-wrap justify-end gap-2">
                    {vjudgeConnected && (
                      <Button formAction={async (formData) => {
                        "use server";
                        await handleClearProviderSession(formData, id);
                      }} type="submit" formNoValidate variant="outline" className="min-h-11">Clear</Button>
                    )}
                    <ContestReportSubmitButton pendingLabel="Connecting…" className="min-h-11">
                      <KeyRound className="mr-2 h-4 w-4" />Connect VJudge
                    </ContestReportSubmitButton>
                  </div>
                </form>
              </div>
            )}

            {needsCodeforces && (
              <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Codeforces access</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Public contests use the API anonymously first. Signed API credentials and JSESSIONID are fallbacks for private Gym, EDU, or blocked access.
                    </p>
                  </div>
                  <Badge variant={codeforcesCredential.configured || codeforcesConnected ? "secondary" : "outline"}>
                    {codeforcesCredential.configured || codeforcesConnected ? "Configured" : "Optional"}
                  </Badge>
                </div>

                <form action={async (formData) => {
                  "use server";
                  await handleCodeforcesCredentials(formData, id);
                }} className="space-y-3 rounded-lg border bg-background/70 p-3">
                  <div>
                    <p className="text-sm font-medium">Signed API retry</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {codeforcesCredential.configured
                        ? `Encrypted key ${codeforcesCredential.apiKeyHint || "••••"} is saved.`
                        : "Used only after the anonymous API cannot access the contest."}
                    </p>
                    <a
                      href="https://codeforces.com/settings/api"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-foreground underline underline-offset-2"
                    >
                      Open Codeforces API settings
                    </a>
                  </div>
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
                      }} type="submit" formNoValidate variant="outline" className="min-h-11">Clear key</Button>
                    )}
                    <ContestReportSubmitButton pendingLabel="Saving…" className="min-h-11">
                      Save encrypted credentials
                    </ContestReportSubmitButton>
                  </div>
                </form>

                <form action={async (formData) => {
                  "use server";
                  await handleProviderSession(formData, id);
                }} className="space-y-3 rounded-lg border bg-background/70 p-3">
                  <input type="hidden" name="provider" value="codeforces" />
                  <div>
                    <label htmlFor="codeforces-session" className="text-sm font-medium">Web JSESSIONID</label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {codeforcesConnected ? "Connected for crawl fallback." : "Optional for public API standings; needed for EDU and web fallback."}
                    </p>
                  </div>
                  <Input id="codeforces-session" name="session" type="password" autoComplete="off" placeholder="JSESSIONID=…" required />
                  <div className="flex flex-wrap justify-end gap-2">
                    {codeforcesConnected && (
                      <Button formAction={async (formData) => {
                        "use server";
                        await handleClearProviderSession(formData, id);
                      }} type="submit" formNoValidate variant="outline" className="min-h-11">Clear</Button>
                    )}
                    <ContestReportSubmitButton pendingLabel="Connecting…" className="min-h-11">
                      <KeyRound className="mr-2 h-4 w-4" />Connect Codeforces
                    </ContestReportSubmitButton>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" size="sm" className="min-h-11 rounded-lg sm:flex-1" asChild>
          <Link
            href={needsVjudge && !vjudgeConnected
              ? "#provider-access"
              : `/contests_report/details/${paramsBox.id}/generate_report`}
            className="flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            {needsVjudge && !vjudgeConnected ? "Connect VJudge to generate" : "Generate Full Report"}
          </Link>
        </Button>
        <ContestScoringDialog
          apiBasePath={`contest-room/${paramsBox.id}`}
          contests={res.result || []}
          roomName={roomMeta?.["Room Name"] || "Contest room"}
        />
      </div>

      <ContestMergeOverview
        className="mb-6"
        contests={res.result || []}
        groups={scoringConfig?.groups || []}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="flex w-full gap-3">
                  <DeleteContestButton
                    contestRoomContestId={contest.id}
                    contestName={contest?.contest_name}
                    className="rounded-full w-1/2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive dark:hover:bg-destructive/20 bg-card"
                  />

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full w-1/2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/70"
                    asChild
                  >
                    <Link
                      href={contest.provider !== "codeforces" && !vjudgeConnected
                        ? "#provider-access"
                        : `/contests_report/details/${paramsBox.id}/generate_report?item=${contest.id}`}
                      className="flex items-center w-full justify-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
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
        <form
          action={async (formData) => {
            "use server";
            await handleAddContest(formData, paramsBox);
          }}
          className="mx-auto w-full max-w-md space-y-6"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Add New Contest
            </h1>
            <p className="text-muted-foreground">
              Choose the provider, then enter its contest ID or supported Codeforces URL.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="contest-provider"
                className="text-sm font-medium leading-none"
              >
                Provider
              </label>
              <Select name="provider" defaultValue="vjudge" required>
                <SelectTrigger id="contest-provider" className="min-h-11">
                  <SelectValue placeholder="Choose provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vjudge">VJudge</SelectItem>
                  <SelectItem value="codeforces">Codeforces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="contest-id"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Contest Id
              </label>
              <Input
                id="contest-id"
                name="contest-id"
                placeholder="Numeric ID or Codeforces contest/EDU URL"
                className="min-h-11 w-full"
                required
              />
              <p className="text-xs text-muted-foreground">
                VJudge uses a numeric ID. Codeforces accepts a numeric contest/Gym ID or supported contest and EDU standings URLs.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="contest-name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Contest Name
              </label>
              <Input
                id="contest-name"
                name="contest-name"
                placeholder="Enter Contest Name..."
                className="min-h-11 w-full"
                required
              />
            </div>

            <ContestReportSubmitButton pendingLabel="Adding…" className="min-h-11 w-full rounded-md">
              Add Contest
            </ContestReportSubmitButton>
          </div>
        </form>
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
