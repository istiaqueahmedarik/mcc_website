import { forwardJsonToBackend } from "../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

function discordPath(id) {
  return `classroom/${encodeURIComponent(id)}/discord`;
}

export async function GET(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, discordPath(id), "GET");
}

export async function POST(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, discordPath(id), "POST");
}

export async function PUT(request, { params }) {
  const { id } = await params;
  return forwardJsonToBackend(request, discordPath(id), "PUT");
}
