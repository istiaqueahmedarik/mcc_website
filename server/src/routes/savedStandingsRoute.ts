import { Hono } from "hono";
import sql from "../db";

const route = new Hono();

// Helper to load alias mapping: maps lowercase alias to its canonical case-sensitive name
async function getAliasesMap(): Promise<Map<string, string>> {
  const aliasMap = new Map<string, string>();
  try {
    const rows = await sql`
      SELECT alias_name as "aliasName", canonical_name as "canonicalName" 
      FROM university_aliases
    `;
    rows.forEach(r => {
      aliasMap.set(r.aliasName.trim().toLowerCase(), r.canonicalName);
    });
  } catch (e) {
    console.error("Error loading aliases map:", e);
  }
  return aliasMap;
}

// Helper to replace raw university names in a standings response
function applyAliasesToStandings(data: any, aliases: Map<string, string>) {
  if (!data || !data.standings) return;

  const mapRow = (row: any) => {
    if (row.institution) {
      const key = row.institution.trim().toLowerCase();
      if (aliases.has(key)) {
        row.institution = aliases.get(key);
      }
    }
    if (row.skippedTeams && Array.isArray(row.skippedTeams)) {
      row.skippedTeams.forEach(mapRow);
    }
  };

  data.standings.forEach(mapRow);
}

// Get all saved contests
route.get("/all", async (c) => {
  try {
    const result = await sql`
      SELECT sc.provider, sc.slug, sc.title, sc.starts_at as "startsAt", sc.duration_minutes as "durationMinutes", sc.saved_at as "savedAt", 
             COALESCE(sc.published, false) as "published",
             EXISTS (
               SELECT 1 FROM saved_standings ss 
               WHERE ss.provider = sc.provider AND ss.slug = sc.slug
             ) as "isSaved"
      FROM saved_contests sc
      ORDER BY sc.starts_at DESC
    `;
    return c.json({ success: true, contests: result });
  } catch (error: any) {
    console.error("Error getting saved contests:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get saved standings for a specific contest (automatically resolves aliases)
route.get("/", async (c) => {
  const provider = c.req.query("provider");
  const slug = c.req.query("slug");
  
  if (!provider || !slug) {
    return c.json({ error: "Missing provider or slug" }, 400);
  }
  
  try {
    const result = await sql`
      SELECT data, saved_at as "savedAt" 
      FROM saved_standings 
      WHERE provider = ${provider} AND slug = ${slug}
    `;
    if (result.length > 0) {
      const data = result[0].data;
      
      // Apply university alias mapping
      const aliases = await getAliasesMap();
      applyAliasesToStandings(data, aliases);
      
      return c.json({ success: true, saved: true, data, savedAt: result[0].savedAt });
    }
    return c.json({ success: true, saved: false });
  } catch (error: any) {
    console.error("Error getting saved standings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Save or update standings and contest metadata
route.post("/save", async (c) => {
  try {
    const { provider, slug, data } = await c.req.json();
    if (!provider || !slug || !data) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    const contest = data.contest;
    if (!contest) {
      return c.json({ error: "Missing contest metadata inside data payload" }, 400);
    }
    
    // Begin transaction
    await sql.begin(async (sql) => {
      // 1. Insert/Update saved_standings
      await sql`
        INSERT INTO saved_standings (provider, slug, data, saved_at)
        VALUES (${provider}, ${slug}, ${data}, NOW())
        ON CONFLICT (provider, slug)
        DO UPDATE SET data = EXCLUDED.data, saved_at = EXCLUDED.saved_at
      `;
      
      // 2. Insert/Update saved_contests
      const startsAtVal = contest.startsAt ? new Date(contest.startsAt) : null;
      const durationVal = parseInt(contest.durationMinutes, 10) || 0;
      
      await sql`
        INSERT INTO saved_contests (provider, slug, title, starts_at, duration_minutes, saved_at)
        VALUES (${provider}, ${slug}, ${contest.title}, ${startsAtVal}, ${durationVal}, NOW())
        ON CONFLICT (provider, slug)
        DO UPDATE SET 
          title = EXCLUDED.title, 
          starts_at = EXCLUDED.starts_at, 
          duration_minutes = EXCLUDED.duration_minutes,
          saved_at = EXCLUDED.saved_at
      `;
    });
    
    return c.json({ success: true, message: "Standings and contest saved successfully" });
  } catch (error: any) {
    console.error("Error saving standings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete saved standings and contest metadata
route.post("/delete", async (c) => {
  try {
    const { provider, slug } = await c.req.json();
    if (!provider || !slug) {
      return c.json({ error: "Missing provider or slug" }, 400);
    }
    
    await sql.begin(async (sql) => {
      await sql`
        DELETE FROM saved_standings 
        WHERE provider = ${provider} AND slug = ${slug}
      `;
      await sql`
        DELETE FROM saved_contests 
        WHERE provider = ${provider} AND slug = ${slug}
      `;
    });
    
    return c.json({ success: true, message: "Saved standings and contest deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting standings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get list status (whether the contests list is saved in DB)
route.get("/list-status", async (c) => {
  try {
    const result = await sql`
      SELECT saved_at as "savedAt" 
      FROM saved_lists 
      WHERE list_name = 'contests_list'
    `;
    if (result.length > 0) {
      return c.json({ success: true, saved: true, savedAt: result[0].savedAt });
    }
    return c.json({ success: true, saved: false });
  } catch (error: any) {
    console.error("Error getting list status:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Save all contests list
route.post("/save-list", async (c) => {
  try {
    const { contests } = await c.req.json();
    if (!contests || !Array.isArray(contests)) {
      return c.json({ error: "Missing contests array" }, 400);
    }

    await sql.begin(async (sql) => {
      // 1. Mark contests_list as saved
      await sql`
        INSERT INTO saved_lists (list_name, saved_at)
        VALUES ('contests_list', NOW())
        ON CONFLICT (list_name)
        DO UPDATE SET saved_at = EXCLUDED.saved_at
      `;

      // 2. Insert all contests metadata
      for (const contest of contests) {
        const startsAtVal = contest.startsAt ? new Date(contest.startsAt) : null;
        const durationVal = parseInt(contest.durationMinutes, 10) || 0;

        await sql`
          INSERT INTO saved_contests (provider, slug, title, starts_at, duration_minutes, saved_at)
          VALUES (${contest.provider}, ${contest.slug}, ${contest.title}, ${startsAtVal}, ${durationVal}, NOW())
          ON CONFLICT (provider, slug)
          DO UPDATE SET 
            title = EXCLUDED.title, 
            starts_at = EXCLUDED.starts_at, 
            duration_minutes = EXCLUDED.duration_minutes,
            saved_at = EXCLUDED.saved_at
        `;
      }
    });

    return c.json({ success: true, message: "Contests list saved successfully" });
  } catch (error: any) {
    console.error("Error saving contests list:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete/unsave contests list (cleaning up unsaved metadata)
route.post("/delete-list", async (c) => {
  try {
    await sql.begin(async (sql) => {
      // 1. Delete contests_list tracking
      await sql`
        DELETE FROM saved_lists 
        WHERE list_name = 'contests_list'
      `;

      // 2. Clean up saved_contests that don't have matching saved standings
      await sql`
        DELETE FROM saved_contests
        WHERE (provider, slug) NOT IN (
          SELECT provider, slug FROM saved_standings
        )
      `;
    });

    return c.json({ success: true, message: "Contests list unsaved successfully" });
  } catch (error: any) {
    console.error("Error deleting contests list:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get published contests (public-facing)
route.get("/published", async (c) => {
  try {
    const result = await sql`
      SELECT provider, slug, title, starts_at as "startsAt", duration_minutes as "durationMinutes", saved_at as "savedAt"
      FROM saved_contests
      WHERE published = true
      ORDER BY starts_at DESC
    `;
    return c.json({ success: true, contests: result });
  } catch (error: any) {
    console.error("Error getting published contests:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Toggle publish state for a contest
route.post("/toggle-publish", async (c) => {
  try {
    const { provider, slug } = await c.req.json();
    if (!provider || !slug) {
      return c.json({ error: "Missing provider or slug" }, 400);
    }

    const result = await sql`
      UPDATE saved_contests
      SET published = NOT COALESCE(published, false)
      WHERE provider = ${provider} AND slug = ${slug}
      RETURNING COALESCE(published, false) as "published"
    `;

    if (result.length === 0) {
      return c.json({ error: "Contest not found" }, 404);
    }

    return c.json({ success: true, published: result[0].published });
  } catch (error: any) {
    console.error("Error toggling publish:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get combined standings of all universities across published contests (automatically resolves aliases)
route.get("/combined-universities", async (c) => {
  try {
    // 1. Fetch standings only from published contests
    const standingsRows = await sql`
      SELECT ss.provider, ss.slug, ss.data 
      FROM saved_standings ss
      INNER JOIN saved_contests sc ON ss.provider = sc.provider AND ss.slug = sc.slug
      WHERE sc.published = true
    `;
    
    if (standingsRows.length === 0) {
      return c.json({ success: true, contests: [], universities: [] });
    }

    // 2. Load alias mapping
    const aliases = await getAliasesMap();

    // 3. Process each contest and assign ranks to universities within that contest
    const contestsList: Array<{ provider: string, slug: string, title: string }> = [];
    const universityMap = new Map<string, any>();

    for (const row of standingsRows) {
      const provider = row.provider;
      const slug = row.slug;
      const data = row.data;
      const contestTitle = data.contest?.title || slug;
      
      const contestKey = `${provider}-${slug}`;
      contestsList.push({ provider, slug, title: contestTitle });

      // Group teams by institution in this contest
      const uniInContestMap = new Map<string, { score: number, penalty: number, teams: number }>();
      
      const standings = data.standings || [];
      standings.forEach((team: any) => {
        let inst = team.institution || 'Unknown';
        
        // Resolve canonical name
        const key = inst.trim().toLowerCase();
        if (aliases.has(key)) {
          inst = aliases.get(key)!;
        }

        if (!uniInContestMap.has(inst)) {
          uniInContestMap.set(inst, { score: 0, penalty: 0, teams: 0 });
        }
        const stats = uniInContestMap.get(inst)!;
        stats.score += team.score || 0;
        stats.penalty += team.penalty || 0;
        stats.teams += 1;

        if (team.skippedTeams && Array.isArray(team.skippedTeams)) {
          team.skippedTeams.forEach((skip: any) => {
            let skipInst = skip.institution || 'Unknown';
            const skipKey = skipInst.trim().toLowerCase();
            if (aliases.has(skipKey)) {
              skipInst = aliases.get(skipKey)!;
            }

            stats.score += skip.score || 0;
            stats.penalty += skip.penalty || 0;
            stats.teams += 1;
          });
        }
      });

      // Sort universities in this contest to determine rank
      const sortedUnisInContest = Array.from(uniInContestMap.entries())
        .map(([uniName, stats]) => ({ uniName, ...stats }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.penalty - b.penalty;
        });

      // Populate overall map
      sortedUnisInContest.forEach((uni, idx) => {
        const rank = idx + 1;
        const instName = uni.uniName;

        if (!universityMap.has(instName)) {
          universityMap.set(instName, {
            university: instName,
            totalScore: 0,
            totalPenalty: 0,
            totalTeams: 0,
            performances: {}
          });
        }

        const overall = universityMap.get(instName)!;
        overall.totalScore += uni.score;
        overall.totalPenalty += uni.penalty;
        overall.totalTeams += uni.teams;
        overall.performances[contestKey] = {
          rank,
          score: uni.score,
          penalty: uni.penalty,
          teams: uni.teams
        };
      });
    }

    // Sort universities overall
    const sortedUniversities = Array.from(universityMap.values())
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.totalPenalty - b.totalPenalty;
      });

    return c.json({
      success: true,
      contests: contestsList,
      universities: sortedUniversities
    });
  } catch (error: any) {
    console.error("Error calculating combined university standings:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Manage university aliases: GET all mappings
route.get("/aliases", async (c) => {
  try {
    const result = await sql`
      SELECT id, alias_name as "aliasName", canonical_name as "canonicalName"
      FROM university_aliases
      ORDER BY canonical_name, alias_name
    `;
    return c.json({ success: true, aliases: result });
  } catch (error: any) {
    console.error("Error getting aliases:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Manage university aliases: MERGE/SAVE an alias mapping
route.post("/aliases/merge", async (c) => {
  try {
    const { aliasName, canonicalName } = await c.req.json();
    if (!aliasName || !canonicalName) {
      return c.json({ error: "Missing aliasName or canonicalName" }, 400);
    }

    const trimmedAlias = aliasName.trim();
    let targetCanonical = canonicalName.trim();

    if (trimmedAlias === targetCanonical) {
      return c.json({ error: "Cannot alias a university to itself" }, 400);
    }

    // Resolve ultimate canonical name to prevent chaining (in case target is already an alias)
    const visited = new Set<string>();
    while (true) {
      if (visited.has(targetCanonical)) {
        break; // Prevent infinite loop
      }
      visited.add(targetCanonical);

      // Query if the target is registered as an alias pointing to another name
      const resolved = await sql`
        SELECT canonical_name as "canonicalName" 
        FROM university_aliases 
        WHERE alias_name = ${targetCanonical}
      `;
      if (resolved.length > 0) {
        targetCanonical = resolved[0].canonicalName.trim();
      } else {
        break;
      }
    }

    if (trimmedAlias === targetCanonical) {
      return c.json({ error: "Cyclic dependency: Cannot merge because it creates a circular reference" }, 400);
    }

    await sql.begin(async (sql) => {
      // 1. Insert/Update alias mapping pointing directly to the resolved canonical name
      await sql`
        INSERT INTO university_aliases (alias_name, canonical_name)
        VALUES (${trimmedAlias}, ${targetCanonical})
        ON CONFLICT (alias_name)
        DO UPDATE SET canonical_name = EXCLUDED.canonical_name
      `;

      // 2. Flat merge links: if any existing aliases pointed to this source, redirect them directly to the resolved target
      await sql`
        UPDATE university_aliases 
        SET canonical_name = ${targetCanonical} 
        WHERE LOWER(canonical_name) = ${trimmedAlias.toLowerCase()}
      `;
    });

    return c.json({ success: true, message: `Successfully aliased '${trimmedAlias}' to '${targetCanonical}'` });
  } catch (error: any) {
    console.error("Error merging aliases:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Manage university aliases: SPLIT/DELETE an alias mapping
route.post("/aliases/split", async (c) => {
  try {
    const { aliasName } = await c.req.json();
    if (!aliasName) {
      return c.json({ error: "Missing aliasName" }, 400);
    }

    await sql`
      DELETE FROM university_aliases 
      WHERE alias_name = ${aliasName.trim()}
    `;

    return c.json({ success: true, message: `Successfully removed alias for '${aliasName}'` });
  } catch (error: any) {
    console.error("Error splitting alias:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all distinct raw university names found across all saved standings
route.get("/raw-universities", async (c) => {
  try {
    const standingsRows = await sql`
      SELECT data 
      FROM saved_standings
    `;
    
    const uniSet = new Set<string>();

    standingsRows.forEach(row => {
      const standings = row.data?.standings || [];
      standings.forEach((team: any) => {
        if (team.institution) {
          uniSet.add(team.institution.trim());
        }
        if (team.skippedTeams && Array.isArray(team.skippedTeams)) {
          team.skippedTeams.forEach((skip: any) => {
            if (skip.institution) {
              uniSet.add(skip.institution.trim());
            }
          });
        }
      });
    });

    return c.json({ success: true, rawUniversities: Array.from(uniSet).sort() });
  } catch (error: any) {
    console.error("Error getting raw universities:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all distinct raw team names found across all saved standings
route.get("/raw-teams", async (c) => {
  try {
    const standingsRows = await sql`
      SELECT data 
      FROM saved_standings
    `;
    
    const teamSet = new Set<string>();

    standingsRows.forEach(row => {
      const standings = row.data?.standings || [];
      standings.forEach((team: any) => {
        if (team.teamName) {
          teamSet.add(team.teamName.trim());
        }
        if (team.skippedTeams && Array.isArray(team.skippedTeams)) {
          team.skippedTeams.forEach((skip: any) => {
            if (skip.teamName) {
              teamSet.add(skip.teamName.trim());
            }
          });
        }
      });
    });

    return c.json({ success: true, rawTeams: Array.from(teamSet).sort() });
  } catch (error: any) {
    console.error("Error getting raw teams:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /blacklist - Get all blacklisted team names
route.get("/blacklist", async (c) => {
  try {
    const rows = await sql`
      SELECT team_name as "teamName" 
      FROM team_blacklist
      ORDER BY team_name ASC
    `;
    const blacklist = rows.map(r => r.teamName);
    return c.json({ success: true, blacklist });
  } catch (error: any) {
    console.error("Error getting team blacklist:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /blacklist/add - Add a team name to the blacklist
route.post("/blacklist/add", async (c) => {
  try {
    const { teamName } = await c.req.json();
    if (!teamName) {
      return c.json({ error: "Missing teamName" }, 400);
    }
    
    await sql`
      INSERT INTO team_blacklist (team_name)
      VALUES (${teamName.trim()})
      ON CONFLICT (team_name) DO NOTHING
    `;
    return c.json({ success: true, message: `Successfully blacklisted team '${teamName}'` });
  } catch (error: any) {
    console.error("Error adding team to blacklist:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /blacklist/remove - Remove a team name from the blacklist
route.post("/blacklist/remove", async (c) => {
  try {
    const { teamName } = await c.req.json();
    if (!teamName) {
      return c.json({ error: "Missing teamName" }, 400);
    }
    
    await sql`
      DELETE FROM team_blacklist 
      WHERE LOWER(team_name) = ${teamName.trim().toLowerCase()}
    `;
    return c.json({ success: true, message: `Successfully removed team '${teamName}' from blacklist` });
  } catch (error: any) {
    console.error("Error removing team from blacklist:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default route;
