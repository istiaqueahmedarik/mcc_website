import { forwardJsonToBackend } from "../../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { id, trainerId } = await params;
  return forwardJsonToBackend(
    request,
    `classroom/${id}/substitutes/${trainerId}`,
    "DELETE",
  );
}
