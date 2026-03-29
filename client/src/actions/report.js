"use server";

import { post } from "@/lib/action";

export async function getPublicProfilesByVjudgeIds(ids = []) {
  if (!Array.isArray(ids)) {
    return { error: "ids must be an array", result: {} };
  }

  const cleanedIds = ids
    .map((id) => String(id || "").trim())
    .filter(Boolean);

  if (cleanedIds.length === 0) {
    return { result: {} };
  }

  return await post("api/vjudge/profiles", { ids: cleanedIds });
}
