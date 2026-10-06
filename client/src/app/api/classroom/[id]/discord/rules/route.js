import { forwardJsonToBackend } from "../../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

function rulesPath(id) {
  return `classroom/${encodeURIComponent(id)}/discord/rules`;
}

export async function GET(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, rulesPath(id), "GET");
}

export async function PUT(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, rulesPath(id), "PUT");
}
