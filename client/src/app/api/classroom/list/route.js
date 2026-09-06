import { forwardJsonToBackend } from "../../_utils/backendProxy";

export const dynamic = "force-dynamic";

// Keep query parameters (including dashboard=true) on Next-proxied requests,
// matching deployments that route /api/classroom/list directly to Hono.
export async function GET(request) {
  return forwardJsonToBackend(request, "classroom/list", "GET");
}
