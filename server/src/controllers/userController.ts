import sql from '../db'

export const getVjudgeId = async (c: any) => {
  const { id, email } = c.get('jwtPayload')
  if (!id || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const user =
    await sql`select * from users where id = ${id} and email = ${email}`
  if (user.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const result = await sql`select vjudge_id from users where id = ${id}`

    return c.json({ vjudge_id: result[0].vjudge_id })
  } catch (error) {
    console.log(error)
    return c.json({ erro: 'error' }, 400)
  }
}
