import sql from '../db'



const isAdmin = async (id: any, email: any) => {
    if (!id || !email) return false
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    return user.length > 0
}

export const createCustomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload') || {}
    if (!(await isAdmin(id, email))) return c.json({ error: 'Unauthorized' }, 401)
    try {
        const body = await c.req.json()
        const { name, platform, link, description, start_time, end_time } = body
        if (!name || !start_time || !end_time) return c.json({ error: 'Missing fields' }, 400)
        const result = await sql`INSERT INTO custom_contests (name, platform, link, description, start_time, end_time) VALUES (${name}, ${platform || null}, ${link || null}, ${description || null}, ${start_time}, ${end_time}) RETURNING *`
        return c.json({ result: result[0], success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Something went wrong' }, 500)
    }
}

export const getActiveCustomContests = async (c: any) => {
    try {
        const result = await sql`SELECT * FROM custom_contests WHERE is_active = true AND end_time > NOW() ORDER BY start_time ASC`
        return c.json({ result, success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Something went wrong' }, 500)
    }
}

export const getAllCustomContests = async (c: any) => {
    const { id, email } = c.get('jwtPayload') || {}
    if (!(await isAdmin(id, email))) return c.json({ error: 'Unauthorized' }, 401)
    try {
        const result = await sql`SELECT * FROM custom_contests ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Something went wrong' }, 500)
    }
}

export const updateCustomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload') || {}
    if (!(await isAdmin(id, email))) return c.json({ error: 'Unauthorized' }, 401)
    try {
        const body = await c.req.json()
        const { contest_id, name, platform, link, description, start_time, end_time, is_active } = body
        if (!contest_id) return c.json({ error: 'Missing contest_id' }, 400)
        const existing = await sql`SELECT * FROM custom_contests WHERE id = ${contest_id}`
        if (existing.length === 0) return c.json({ error: 'Not found' }, 404)
        const result = await sql`UPDATE custom_contests SET name = ${name ?? existing[0].name}, platform = ${platform ?? existing[0].platform}, link = ${link ?? existing[0].link}, description = ${description ?? existing[0].description}, start_time = ${start_time ?? existing[0].start_time}, end_time = ${end_time ?? existing[0].end_time}, is_active = ${is_active ?? existing[0].is_active}, updated_at = NOW() WHERE id = ${contest_id} RETURNING *`
        return c.json({ result: result[0], success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Something went wrong' }, 500)
    }
}

export const deleteCustomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload') || {}
    if (!(await isAdmin(id, email))) return c.json({ error: 'Unauthorized' }, 401)
    try {
        const body = await c.req.json()
        const { contest_id } = body
        if (!contest_id) return c.json({ error: 'Missing contest_id' }, 400)
        const result = await sql`DELETE FROM custom_contests WHERE id = ${contest_id} RETURNING *`
        return c.json({ result: result[0], success: true })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Something went wrong' }, 500)
    }
}
