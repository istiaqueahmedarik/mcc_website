import { generateContestRoomReport } from "@/actions/contest_details";
import ContestReportSubmitButton from "@/components/ContestReportSubmitButton";
import ReportTable from "@/components/ReportTable";
import { Database, RefreshCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function refreshSavedContestReport(formData) {
  "use server";
  const roomId = String(formData.get("room-id") || "").slice(0, 80);
  const contestItemId = String(formData.get("contest-item-id") || "").slice(0, 80) || null;
  const result = await generateContestRoomReport(roomId, {
    ...(contestItemId ? { contestItemId } : {}),
    refresh: true,
  });
  const query = new URLSearchParams();
  if (contestItemId) query.set("item", contestItemId);
  if (result?.success) query.set("refreshed", "1");
  else query.set("refreshError", result?.error || "Unable to refresh provider data");
  redirect(`/contests_report/details/${encodeURIComponent(roomId)}/generate_report?${query.toString()}`);
}

function providerFailureMessage(failure) {
  if (!failure) return null;
  const error = String(failure.error || "");
  const credentialsRejected = failure.code === "CODEFORCES_API_CREDENTIALS_INVALID"
    || /incorrect api key|rejected the saved api key/i.test(error);
  if (!credentialsRejected) return error || null;

  const fallbackGuidance = {
    CODEFORCES_WEB_SESSION_MISSING: "No Codeforces JSESSIONID fallback is connected.",
    CODEFORCES_WEB_SESSION_INVALID: "The connected Codeforces JSESSIONID could not access this group contest.",
    CODEFORCES_WEB_BLOCKED: "Codeforces challenged the server-side JSESSIONID fallback.",
  }[failure.fallbackCode] || "The JSESSIONID fallback also did not complete.";

  return `Codeforces rejected the saved API key or secret. Replace or clear it in Provider access. ${fallbackGuidance}`;
}

async function page({ params, searchParams }) {
  const paramsBox = await params;
  const roomId = paramsBox.id;
  const searchParamsBox = await searchParams;
  const requestedContestItemId = searchParamsBox.item
    ? String(searchParamsBox.item).slice(0, 80)
    : null;

  const response = await generateContestRoomReport(
    roomId,
    requestedContestItemId ? { contestItemId: requestedContestItemId } : {},
  );
  const merged = response?.merged || null;

  if (!response?.success || !merged || !Array.isArray(merged.users)) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Report unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {providerFailureMessage(response?.missingContests?.[0])
            || response?.error
            || "Unable to load contest data. Confirm the access required by this room's providers, then try again."}
        </p>
        <Link
          href={`/contests_report/details/${encodeURIComponent(roomId)}#provider-access`}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Review provider access
        </Link>
      </div>
    );
  }

  const liveReportId = roomId + (requestedContestItemId ? `_${requestedContestItemId}` : "");
  const canPublish = !requestedContestItemId
    && (!Array.isArray(response?.missingContests) || response.missingContests.length === 0)
    && !response?.cache?.isStale;
  const generatedAt = response?.cache?.generatedAt
    ? new Date(response.cache.generatedAt)
    : null;

  return (
    <div className="space-y-4">
      {searchParamsBox?.refreshed && (
        <p role="status" className="mx-auto max-w-5xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Saved report refreshed with the latest provider data.
        </p>
      )}
      {searchParamsBox?.refreshError && (
        <p role="alert" className="mx-auto max-w-5xl rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Refresh failed. The previously saved report is still shown. {searchParamsBox.refreshError}
        </p>
      )}
      {response?.cache?.isStale && (
        <div role="alert" className="mx-auto max-w-5xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Saved report needs a refresh</p>
          <p className="mt-1 text-muted-foreground">
            Room, mapping, demerit, or scoring settings changed after this snapshot. You can still review it, but refresh before publishing.
          </p>
        </div>
      )}
      {Array.isArray(response?.missingContests) && response.missingContests.length > 0 && (
        <div role="alert" className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Report generated with missing sources</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {response.missingContests.map((contest) => (
              <li key={contest.id}>
                {contest.provider === "codeforces" ? "Codeforces" : "VJudge"} · {contest.title}: {providerFailureMessage(contest)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Database className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Saved report</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {generatedAt && !Number.isNaN(generatedAt.getTime())
                ? `Updated ${generatedAt.toLocaleString()}. `
                : ""}
              Provider data is reused until you refresh it.
            </p>
          </div>
        </div>
        <form action={refreshSavedContestReport} className="shrink-0">
          <input type="hidden" name="room-id" value={roomId} />
          {requestedContestItemId ? <input type="hidden" name="contest-item-id" value={requestedContestItemId} /> : null}
          <ContestReportSubmitButton
            pendingLabel="Refreshing…"
            variant="outline"
            className="min-h-11 w-full rounded-lg px-4 active:scale-[0.98] motion-reduce:transform-none sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </ContestReportSubmitButton>
        </form>
      </div>
      <ReportTable
        merged={merged}
        liveReportId={liveReportId}
        name={merged.name || "Contest report"}
        publishEndpoint={canPublish ? `/api/contest-room/${encodeURIComponent(roomId)}/publish` : null}
        enableViewModes
      />
    </div>
  );
}

export default page;
