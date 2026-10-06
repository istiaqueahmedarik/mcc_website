import { forwardJsonToBackend } from "../../../_utils/backendProxy";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return forwardJsonToBackend(request, "classroom/discord/guilds", "GET");
}
