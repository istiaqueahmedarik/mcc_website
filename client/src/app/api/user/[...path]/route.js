import { forwardJsonToBackend } from "../../_utils/backendProxy";

export const dynamic = "force-dynamic";

function userPath(params) {
  const path = Array.isArray(params?.path) ? params.path.join("/") : "";
  return `user/${path}`;
}

export async function GET(request, { params }) {
  return forwardJsonToBackend(request, userPath(await params), "GET");
}

export async function POST(request, { params }) {
  return forwardJsonToBackend(request, userPath(await params), "POST");
}
