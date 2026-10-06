import { forwardJsonToBackend } from "../../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(
    request,
    `classroom/${encodeURIComponent(id)}/discord/roster`,
    "GET",
  );
}
