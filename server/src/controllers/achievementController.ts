import sql from '../db'

export const insertAchievement = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
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
      VALUES (${title}, ${image}, ${description}, ${new Date(date).toISOString()})
      RETURNING *`

    return c.json({ result })
  } catch (error) {
    return c.json({ erro: 'error' }, 400)
  }
}

export const getAchievements = async (c: any) => {
  try {
    const result = await sql`SELECT * FROM achievements`
    return c.json({ result })
  } catch (error) {
    return c.json({ erro: 'error' }, 400)
  }
}