import { generateContestRoomReport } from "@/actions/contest_details";
import ReportTable from "@/components/ReportTable";
import Link from "next/link";

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
    && (!Array.isArray(response?.identityWarnings) || response.identityWarnings.length === 0);

  return (
    <div className="space-y-4">
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
      {Array.isArray(response?.identityWarnings) && response.identityWarnings.length > 0 && (
        <div role="alert" className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {response.identityWarnings.length} Codeforces participant{response.identityWarnings.length === 1 ? "" : "s"} need MCC account mapping
          </p>
          <p className="mt-1 text-muted-foreground">
            Unresolved rows stay separate and cannot be published. Update the saved Codeforces handle or the group identity rule, then generate again.
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {response.identityWarnings.slice(0, 20).map((warning, index) => (
              <li key={`${warning.contestItemId}-${warning.username}-${index}`}>
                {warning.contestName}: <span translate="no" className="font-mono text-xs">{warning.username || "Unknown username"}</span>
              </li>
            ))}
          </ul>
          {response.identityWarnings.length > 20 && (
            <p className="mt-2 text-xs text-muted-foreground">And {response.identityWarnings.length - 20} more.</p>
          )}
          <Link href={`/contests_report/details/${encodeURIComponent(roomId)}`} className="mt-3 inline-flex min-h-11 items-center rounded-md border bg-background px-3 font-medium text-foreground">
            Review identity rules
          </Link>
        </div>
      )}
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
