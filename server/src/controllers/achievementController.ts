import sql from '../db'

const insertAchievement = async (c: any) => {
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

export { insertAchievement }
