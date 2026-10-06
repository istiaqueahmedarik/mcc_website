import { forwardJsonToBackend } from "../../_utils/backendProxy";

export const dynamic = "force-dynamic";

function authPath(params) {
  const path = Array.isArray(params?.path) ? params.path.join("/") : "";
  return `auth/${path}`;
}

export async function GET(request, { params }) {
  return forwardJsonToBackend(request, authPath(await params), "GET");
}

export async function POST(request, { params }) {
  return forwardJsonToBackend(request, authPath(await params), "POST");
}
