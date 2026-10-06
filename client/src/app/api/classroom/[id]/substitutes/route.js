import { forwardJsonToBackend } from "../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

function substitutesPath(id) {
  return `classroom/${id}/substitutes`;
}

export async function GET(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, substitutesPath(id), "GET");
}

export async function POST(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, substitutesPath(id), "POST");
}
