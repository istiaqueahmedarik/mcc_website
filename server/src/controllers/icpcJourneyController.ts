import sql from "../db";

function formatYear(value: Date | string | null) {
  if (!value) return "N/A";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "N/A";
  return String(dateValue.getUTCFullYear());
}

async function requireAdmin(c: any) {
  const { id, email } = c.get("jwtPayload") || {};
  if (!id || !email) return null;
  const user =
    await sql`select id from users where id = ${id} and email = ${email} and admin = true`;
  if (user.length === 0) return null;
  return user[0];
}

function toNullableText(value: any) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normalizeYear(value: any) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const year = Number(text);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) return null;
  return `${year}-01-01`;
}

function normalizeImages(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export const getIcpcJourneyPublic = async (c: any) => {
  try {
    const rows = await sql`
      select
        id,
        year,
        competition,
        hosted_uni,
        num_of_teams,
        images,
        description,
        "references" as reference_text,
        best_rank
      from icpc_journey
      order by year desc nulls last, created_at asc
    `;

    const journey = rows.map((row: any) => {
      const teams = Number(row.num_of_teams ?? 0);
      const bestRank = Number(row.best_rank ?? 0);
      const referenceText = String(row.reference_text ?? "").trim();
      const highlights = [
        row.hosted_uni ? `Hosted at ${row.hosted_uni}` : null,
        teams > 0 ? `${teams} teams participated` : null,
        bestRank > 0 ? `Best rank: ${bestRank}` : null,
        referenceText || null,
      ].filter(Boolean);

      return {
        id: row.id,
        year: formatYear(row.year),
        competition: row.competition || "ICPC Contest",
        location: row.hosted_uni || "Venue TBD",
        teams: teams > 0 ? teams : null,
        rank: bestRank > 0 ? `Rank ${bestRank}` : "Participation",
        images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
        description: row.description || "Details will be updated soon.",
        highlights,
        references: referenceText || null,
      };
    });

    return c.json({ journey });
  } catch (e) {
    console.error("ICPC journey load failed:", e);
    return c.json({ error: "Failed to load ICPC journey" }, 500);
  }
};

export const listAdminIcpcJourney = async (c: any) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await sql`
      select
        id,
        year,
        competition,
        hosted_uni,
        num_of_teams,
        images,
        description,
        "references",
        best_rank,
        created_at
      from icpc_journey
      order by year desc nulls last, created_at desc
    `;
    return c.json({ result });
  } catch (e) {
    console.error("ICPC admin list failed:", e);
    return c.json({ error: "Failed to load ICPC journey list" }, 500);
  }
};

export const createAdminIcpcJourney = async (c: any) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    const year = normalizeYear(body.year);
    const competition = toNullableText(body.competition);
    const hostedUni = toNullableText(body.hosted_uni);
    const teams = Number(body.num_of_teams ?? 0);
    const bestRank = Number(body.best_rank ?? 0);
    const description = toNullableText(body.description);
    const references = toNullableText(body.references);
    const images = normalizeImages(body.images);

    if (!year) return c.json({ error: "Year is required (YYYY)" }, 400);
    if (!competition) return c.json({ error: "Competition is required" }, 400);

    const result = await sql`
      insert into icpc_journey (
        year,
        competition,
        hosted_uni,
        num_of_teams,
        images,
        description,
        "references",
        best_rank
      ) values (
        ${year},
        ${competition},
        ${hostedUni},
        ${Number.isFinite(teams) && teams > 0 ? teams : null},
        ${images.length > 0 ? images : null},
        ${description},
        ${references},
        ${Number.isFinite(bestRank) && bestRank > 0 ? bestRank : null}
      )
      returning *
    `;

    return c.json({ result: result[0] });
  } catch (e) {
    console.error("ICPC admin create failed:", e);
    return c.json({ error: "Failed to create ICPC journey" }, 400);
  }
};

export const updateAdminIcpcJourney = async (c: any) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    if (!body.id) return c.json({ error: "Missing id" }, 400);

    const year = normalizeYear(body.year);
    const competition = toNullableText(body.competition);
    const hostedUni = toNullableText(body.hosted_uni);
    const teams = Number(body.num_of_teams ?? 0);
    const bestRank = Number(body.best_rank ?? 0);
    const description = toNullableText(body.description);
    const references = toNullableText(body.references);
    const images = normalizeImages(body.images);

    if (!year) return c.json({ error: "Year is required (YYYY)" }, 400);
    if (!competition) return c.json({ error: "Competition is required" }, 400);

    const result = await sql`
      update icpc_journey
      set
        year = ${year},
        competition = ${competition},
        hosted_uni = ${hostedUni},
        num_of_teams = ${Number.isFinite(teams) && teams > 0 ? teams : null},
        images = ${images.length > 0 ? images : null},
        description = ${description},
        "references" = ${references},
        best_rank = ${Number.isFinite(bestRank) && bestRank > 0 ? bestRank : null}
      where id = ${body.id}
      returning *
    `;

    return c.json({ result: result[0] });
  } catch (e) {
    console.error("ICPC admin update failed:", e);
    return c.json({ error: "Failed to update ICPC journey" }, 400);
  }
};

export const deleteAdminIcpcJourney = async (c: any) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    if (!body.id) return c.json({ error: "Missing id" }, 400);

    const result = await sql`
      delete from icpc_journey
      where id = ${body.id}
      returning id
    `;

    if (!result[0]) {
      return c.json({ error: "Entry not found" }, 404);
    }

    return c.json({ result: result[0] });
  } catch (e) {
    console.error("ICPC admin delete failed:", e);
    return c.json({ error: "Failed to delete ICPC journey" }, 400);
  }
};
