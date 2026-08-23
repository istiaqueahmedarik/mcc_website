import { Hono } from "hono";
import sql from "../db";
import { fetchVjudgeContestRank } from "../services/vjudgeContestService";

const vjudgeRoute = new Hono();

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PROFILE_BATCH_IDS = 2000;
const PROFILE_QUERY_CHUNK_SIZE = 200;
const profileCache = new Map<string, { value: any; expiresAt: number }>();

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getCachedProfile(lowerId: string) {
  const entry = profileCache.get(lowerId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    profileCache.delete(lowerId);
    return undefined;
  }
  return entry.value;
}

function setCachedProfile(lowerId: string, value: any) {
  profileCache.set(lowerId, {
    value,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
}

function sanitizeProfileRow(u: any) {
  return {
    id: u.id,
    full_name: u.full_name,
    profile_pic: u.profile_pic,
    vjudge_id: u.vjudge_id,
    cf_id: u.cf_id,
    mist_id: u.mist_id,
    batch_name: u.batch_name || null,
  };
}

vjudgeRoute.post("/profiles", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const rawIds = Array.isArray(body?.ids) ? body.ids : null;

    if (!rawIds) {
      return c.json({ error: "ids must be an array" }, 400);
    }

    if (rawIds.length > MAX_PROFILE_BATCH_IDS) {
      return c.json(
        { error: `ids exceeds limit of ${MAX_PROFILE_BATCH_IDS}` },
        413,
      );
    }

    const hasNonStringId = rawIds.some((id: unknown) => typeof id !== "string");
    if (hasNonStringId) {
      return c.json({ error: "ids must be an array of strings" }, 400);
    }

    const requestedIds = rawIds
      .map((id: string) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_PROFILE_BATCH_IDS);

    if (requestedIds.length === 0) {
      return c.json({ result: {} });
    }

    const result: Record<string, any> = {};
    const representativeByLower = new Map<string, string>();

    for (const requestedId of requestedIds) {
      const lowerId = requestedId.toLowerCase();
      if (!representativeByLower.has(lowerId)) {
        representativeByLower.set(lowerId, requestedId);
      }

      const cached = getCachedProfile(lowerId);
      if (cached !== undefined) {
        result[requestedId] = cached;
      }
    }

    const unresolvedLowerIds = Array.from(representativeByLower.keys()).filter(
      (lowerId) => {
        const representative = representativeByLower.get(lowerId);
        return representative ? result[representative] === undefined : false;
      },
    );

    if (unresolvedLowerIds.length === 0) {
      return c.json({ result });
    }

    const unresolvedExactIds = unresolvedLowerIds
      .map((lowerId) => representativeByLower.get(lowerId))
      .filter(Boolean) as string[];

    // Fast path: exact match query (uses regular index on users.vjudge_id when available).
    const stillMissingLowerIds = new Set(unresolvedLowerIds);
    const exactIdChunks = chunkArray(unresolvedExactIds, PROFILE_QUERY_CHUNK_SIZE);

    for (const idsChunk of exactIdChunks) {
      if (idsChunk.length === 0) continue;
      const exactRows = await sql`
        select
          u.id,
          u.full_name,
          u.profile_pic,
          u.vjudge_id,
          u.cf_id,
          u.mist_id,
          u.batch_name
        from users u
        where u.vjudge_id = any(${idsChunk})
      `;

      for (const u of exactRows) {
        const lowerId = String(u.vjudge_id || "").toLowerCase();
        if (!lowerId || !stillMissingLowerIds.has(lowerId)) continue;
        const profile = sanitizeProfileRow(u);
        const representative = representativeByLower.get(lowerId);
        if (representative) {
          result[representative] = profile;
        }
        setCachedProfile(lowerId, profile);
        stillMissingLowerIds.delete(lowerId);
      }
    }

    if (stillMissingLowerIds.size > 0) {
      const lowerMisses = Array.from(stillMissingLowerIds);
      const lowerMissChunks = chunkArray(lowerMisses, PROFILE_QUERY_CHUNK_SIZE);

      // Fallback: case-insensitive lookup only for unresolved ids.
      for (const missesChunk of lowerMissChunks) {
        if (missesChunk.length === 0) continue;
        const fallbackRows = await sql`
          select
            u.id,
            u.full_name,
            u.profile_pic,
            u.vjudge_id,
            u.cf_id,
            u.mist_id,
            u.batch_name
          from users u
          where lower(u.vjudge_id) = any(${missesChunk})
        `;

        for (const u of fallbackRows) {
          const lowerId = String(u.vjudge_id || "").toLowerCase();
          if (!lowerId || !stillMissingLowerIds.has(lowerId)) continue;
          const profile = sanitizeProfileRow(u);
          const representative = representativeByLower.get(lowerId);
          if (representative) {
            result[representative] = profile;
          }
          setCachedProfile(lowerId, profile);
          stillMissingLowerIds.delete(lowerId);
        }
      }

      for (const lowerId of stillMissingLowerIds) {
        const representative = representativeByLower.get(lowerId);
        if (!representative) continue;
        result[representative] = null;
        setCachedProfile(lowerId, null);
      }
    }

    // Mirror the resolved value for every original requested casing.
    for (const requestedId of requestedIds) {
      if (result[requestedId] !== undefined) continue;
      const representative = representativeByLower.get(
        requestedId.toLowerCase(),
      );
      result[requestedId] = representative
        ? (result[representative] ?? null)
        : null;
    }

    return c.json({ result });
  } catch (error: any) {
    console.error(
      "Database error in batch public profile lookup:",
      error?.message || error,
    );
    return c.json({ error: "Something went wrong" }, 500);
  }
});

vjudgeRoute.post("/login", async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    const response = await fetch("https://vjudge.net/user/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    });

    const setCookie = response.headers.get("set-cookie");
    let jsessionid = "";
    if (setCookie) {
      const match = setCookie.match(/JSESSIONID=([^;]+)/);
      if (match) {
        jsessionid = match[1];
      }
    }

    if (jsessionid) {
      return c.json({ jsessionid });
    } else {
      return c.json({ error: "Login failed, JSESSIONID not found" }, 401);
    }
  } catch (error: any) {
    return c.json(
      { error: "Error during VJudge authentication", details: error.message },
      500,
    );
  }
});

vjudgeRoute.post("/contest-rank/:contestId", async (c) => {
  const contestId = c.req.param("contestId");
  const jsessionid = c.req.header("X-VJudge-Session");
  const { problemWeights } = await c.req.json();

  const result = await fetchVjudgeContestRank(contestId, jsessionid, problemWeights);
  return c.json(result.body, result.statusCode as any);
});

export default vjudgeRoute;
