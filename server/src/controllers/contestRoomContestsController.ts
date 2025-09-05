import sql from '../db'

export const insertContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id, contest_id, name } = await c.req.json()
    try {
        const result = await sql`INSERT INTO "Contest_room_contests" (room_id, contest_id, contest_name) VALUES (${room_id}, ${contest_id},${name}) RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const getAllContestRoomContests = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email}`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
        const result = await sql`SELECT * FROM "Contest_room_contests" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id } = await c.req.json()
    try {
        const room_res = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${contest_room_contest_id}`
        if (room_res.length === 0) {
            return c.json({ error: 'Room not found' }, 400)
        }
        const name = room_res[0]['Room Name']
        const result = await sql`SELECT * FROM "Contest_room_contests" WHERE room_id = ${contest_room_contest_id} ORDER BY created_at ASC`
        return c.json({ result, success: true, name })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Not found' }, 400)
    }
}

// export const getContestDetal

export const updateContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id, room_id, contest_id, weight } = await c.req.json()
    try {
        const result = await sql`UPDATE "Contest_room_contests" SET room_id = ${room_id}, contest_id = ${contest_id}, weight = ${weight} WHERE id = ${contest_room_contest_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'error' }, 400)
    }
}

export const deleteContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id } = await c.req.json()
    try {
        const result = await sql`DELETE FROM "Contest_room_contests" WHERE id = ${contest_room_contest_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Something went wrong' }, 400)
    }
}
