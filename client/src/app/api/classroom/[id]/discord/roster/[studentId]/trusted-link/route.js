import { forwardJsonToBackend } from "../../../../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { id, studentId } = await params;
  return forwardJsonToBackend(
    request,
    `classroom/${encodeURIComponent(id)}/discord/roster/${encodeURIComponent(studentId)}/trusted-link`,
    "POST",
  );
}
