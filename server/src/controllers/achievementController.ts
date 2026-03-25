import sql from '../db'

export const insertAchievement = async (c: any) => {
  const jwtPayload = c.get('jwtPayload')

  console.log('jwtPayload: ', jwtPayload)

  if (!jwtPayload) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { id, email } = jwtPayload
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const result =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (result.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { title, image, description, date, tags, intro, is_Featured } = await c.req.json()

  let parsedTags: string[] = [];
  if (typeof tags === "string") {
    try {
      parsedTags = JSON.parse(tags);
    } catch {
      parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  }

  try {
    await sql.begin(async (sql) => {

      // Insert achievement
      const result1 = await sql`
        INSERT INTO achievements (title, image, description, date, intro)
        VALUES (${title}, ${image}, ${description}, ${new Date(date).toISOString()}, ${intro})
        RETURNING id
      `;

      const achId = result1[0].id;

      //If is_Featured is true, insert achId into featured_achievements
      if (is_Featured) {
        await sql`
          INSERT INTO featured_achievements (achievement_id)
          VALUES (${achId})
          ON CONFLICT DO NOTHING
        `;
      }

      // Insert tags
      await sql`
        INSERT INTO tags (name)
        SELECT * FROM UNNEST(${parsedTags}::text[])
        ON CONFLICT (name) DO NOTHING
      `;

      // Fetch tag ids
      const result2 = await sql`
        SELECT id FROM tags WHERE name = ANY(${parsedTags}::text[])
      `;
      const tagIds = result2.map((row: any) => row.id);

      // Insert into achievement_tags table
      await sql`
        INSERT INTO achievement_tags (achievement_id, tag_id)
        SELECT ${achId}, UNNEST(${tagIds}::int[])
        ON CONFLICT DO NOTHING
      `;

    });
    return c.json({ success: true, message: 'Achievement inserted successfully' });
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const updateAchievement = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const result =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (result.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { ach_id, title, image, description, date, tags, intro, is_Featured } = await c.req.json()

  let parsedTags: string[] = [];
  if (typeof tags === "string") {
    try {
      parsedTags = JSON.parse(tags);
    } catch {
      parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  }

  try {
    await sql.begin(async (sql) => {

      // Update achievement
      await sql`
        UPDATE achievements
        SET title = ${title}, image = ${image}, description = ${description}, date = ${new Date(date).toISOString()}, intro = ${intro}
        WHERE id = ${ach_id}
      `;

      // Insert into featured_achievements if is_Featured is true, otherwise delete from featured_achievements
      if (is_Featured) {
        await sql`
          INSERT INTO featured_achievements (achievement_id)
          VALUES (${ach_id})
          ON CONFLICT DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM featured_achievements WHERE achievement_id = ${ach_id}
        `;
      }

      // Insert tags
      await sql`
        INSERT INTO tags (name)
        SELECT * FROM UNNEST(${parsedTags}::text[])
        ON CONFLICT (name) DO NOTHING
      `;

      // Fetch tag ids
      const result2 = await sql`
        SELECT id FROM tags WHERE name = ANY(${parsedTags}::text[])
      `;
      const tagIds = result2.map((row: any) => row.id);

      // Delete old achievement_tags entries
      await sql`
        DELETE FROM achievement_tags WHERE achievement_id = ${ach_id}
      `;

      // Insert new achievement_tags entries
      await sql`
        INSERT INTO achievement_tags (achievement_id, tag_id)
        SELECT ${ach_id}, UNNEST(${tagIds}::int[])
        ON CONFLICT DO NOTHING
      `;

    });
    return c.json({ success: true, message: 'Achievement updated successfully' });
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const deleteAchievement = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const result =
    await sql`select * from users where id = ${id} and email = ${email} and admin = true`
  if (result.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { ach_id } = await c.req.json()
  try {
    const result =
      await sql`DELETE FROM achievements WHERE id = ${ach_id} RETURNING *`
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getAchievements = async (c: any) => {
  const limit = c.req.query('limit') || '10'
  const offset = c.req.query('offset') || '0'
  try {
    const result = await sql`
      SELECT pagination.*,
      COALESCE(t.tag_names, '{}'::text[]) AS tag_names,
      (f.achievement_id IS NOT NULL) AS is_featured
      FROM (
        SELECT *
        FROM achievements
        ORDER BY date DESC, id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ) pagination

      LEFT JOIN featured_achievements f
        ON pagination.id = f.achievement_id

      LEFT JOIN (
        SELECT 
          achievement_tags.achievement_id,
          ARRAY_AGG(tags.name) AS tag_names
        FROM achievement_tags
        JOIN tags 
          ON tags.id = achievement_tags.tag_id
        GROUP BY achievement_tags.achievement_id
      ) t
      ON pagination.id = t.achievement_id

      ORDER BY pagination.date DESC, pagination.id DESC;
    `;
    // console.log('result: ', result);
    return c.json({ result });

  } catch (error) {
    console.log("error: ", error);
    return c.json({ error: "error" }, 400);
  }
};

export const getAchievement = async (c: any) => {
  const { id } = await c.req.json()
  try {
    const result = await sql`
      SELECT achievements.*,
        COALESCE(
          ARRAY_AGG(tags.name) FILTER (WHERE tags.name IS NOT NULL),
          '{}'::text[]
        ) AS tag_names,
        (f.achievement_id IS NOT NULL) AS is_featured
      FROM achievements

      LEFT JOIN featured_achievements f
        ON achievements.id = f.achievement_id

      LEFT JOIN achievement_tags 
        ON achievements.id = achievement_tags.achievement_id

      LEFT JOIN tags 
        ON tags.id = achievement_tags.tag_id

      WHERE achievements.id = ${id}

      GROUP BY achievements.id, f.achievement_id;
    `
    // console.log('result: ', result)
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getAchievementNumber = async (c: any) => {
  try {
    const result = await sql`SELECT COUNT(*) FROM achievements`
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getFeaturedAchievements = async (c: any) => {
  const limit = c.req.query('limit') || '12'
  // console.log('getFeaturedAchievements called with limit: ', limit)
  try {
    const result = await sql`
      SELECT a.*
      FROM achievements a
      JOIN featured_achievements f
      ON a.id = f.achievement_id
      ORDER BY f.created_at DESC
      LIMIT ${limit};
    `;
    // console.log('result: ', result)
    return c.json({ result })
  }
  catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getAchievementTags = async (c: any) => {
  // console.log('getAchievementTags called')
  try {
    const result = await sql`SELECT * FROM tags`
    // console.log('result: ', result)
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}