import { forwardJsonToBackend } from "../../_utils/backendProxy";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return forwardJsonToBackend(request, "classroom/create", "POST");
}
