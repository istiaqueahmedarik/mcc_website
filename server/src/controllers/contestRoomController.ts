import sql from '../db'

export const insertContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_name } = await c.req.json()
    try {
        const result = await sql`INSERT INTO "Contest_report_room" ("Room Name") VALUES (${room_name}) RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const getAllContestRooms = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email}`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
        const result = await sql`SELECT * FROM "Contest_report_room" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id } = await c.req.json()
    try {
        const result = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${room_id}`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Room not found' }, 400)
    }
}

export const updateContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id, room_name } = await c.req.json()
    try {
        const result = await sql`UPDATE "Contest_report_room" SET "Room Name" = ${room_name} WHERE id = ${room_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const deleteContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id } = await c.req.json()
    try {
        const result = await sql`DELETE FROM "Contest_report_room" WHERE id = ${room_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Something went wrong' }, 400)
    }
}
