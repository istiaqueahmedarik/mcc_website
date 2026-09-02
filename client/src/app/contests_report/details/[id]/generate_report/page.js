import { generateContestRoomReport } from "@/actions/contest_details";
import ReportTable from "@/components/ReportTable";

async function page({ params, searchParams }) {
  const paramsBox = await params;
  const roomId = paramsBox.id;
  const searchParamsBox = await searchParams;
  const requestedContestId =
    searchParamsBox.id && /^\d+$/.test(searchParamsBox.id)
      ? String(searchParamsBox.id)
      : null;

  const response = await generateContestRoomReport(
    roomId,
    requestedContestId ? { contestId: requestedContestId } : {},
  );
  const merged = response?.merged || null;

  if (!response?.success || !merged || !Array.isArray(merged.users)) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Report unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {response?.error || "Unable to load contest data. Please try again after confirming the VJudge session."}
        </p>
      </div>
    );
  }

  const liveReportId = roomId + (requestedContestId ? `_${requestedContestId}` : "");
  const canPublish = !requestedContestId;

  return (
    <div className="space-y-4">
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
