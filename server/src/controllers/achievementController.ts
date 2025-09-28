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
  const { title, image, description, date } = await c.req.json()

  try {
    const result =
      await sql`INSERT INTO achievements (title, image, description, date)
      VALUES (${title}, ${image}, ${description}, ${new Date(
        date,
      ).toISOString()})
      RETURNING *`

    return c.json({ result })
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
  const { ach_id, title, image, description, date } = await c.req.json()

  try {
    const result =
      await sql`UPDATE achievements SET title = ${title}, image = ${image}, description = ${description}, date = ${new Date(
        date,
      ).toISOString()} WHERE id = ${ach_id} RETURNING *`

    return c.json({ result })
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
  try {
    const result = await sql`SELECT * FROM achievements ORDER BY date DESC`
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}

export const getAchievement = async (c: any) => {
  const { id } = await c.req.json()
  try {
    const result = await sql`SELECT * FROM achievements WHERE id = ${id}`
    // console.log('result: ', result)
    return c.json({ result })
  } catch (error) {
    console.log('error: ', error)
    return c.json({ error: 'error' }, 400)
  }
}
