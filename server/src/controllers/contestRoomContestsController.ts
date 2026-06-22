import sql from '../db'
import { ensureContestRoomSchema } from '../utils/ensureContestRoomSchema'
import { ensureContestRoomContestsSchema } from '../utils/ensureContestRoomContestsSchema'

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

    const normalizedRoomId = String(room_id || '').trim()
    const normalizedContestId = String(contest_id || '').trim()
    const normalizedName = String(name || '').trim()

    if (!normalizedRoomId || !normalizedContestId || !normalizedName) {
        return c.json({ error: 'room_id, contest_id and name are required' }, 400)
    }

    if (!/^\d+$/.test(normalizedContestId)) {
        return c.json({ error: 'contest_id must be numeric' }, 400)
    }

    await ensureContestRoomContestsSchema()

    try {
        const roomExists = await sql`SELECT id FROM "Contest_report_room" WHERE id=${normalizedRoomId} LIMIT 1`
        if (roomExists.length === 0) {
            return c.json({ error: 'Room not found' }, 404)
        }

        const existing = await sql`
            SELECT *
            FROM "Contest_room_contests"
            WHERE room_id = ${normalizedRoomId} AND contest_id = ${normalizedContestId}
            LIMIT 1
        `
        if (existing.length > 0) {
            return c.json({ result: existing, success: true })
        }

        const result = await sql`
            INSERT INTO "Contest_room_contests" (room_id, contest_id, contest_name)
            VALUES (${normalizedRoomId}, ${normalizedContestId}, ${normalizedName})
            RETURNING *
        `
        return c.json({ result, success: true })
    } catch (error: any) {
        const message = error?.message || 'Failed to insert contest'
        return c.json({ error: message }, 400)
    }
}

export const getAllContestRoomContests = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    await ensureContestRoomContestsSchema()

    try {
        const result = await sql`SELECT * FROM "Contest_room_contests" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id } = await c.req.json()
    await ensureContestRoomSchema()
    await ensureContestRoomContestsSchema()
    try {
        const room_res = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${contest_room_contest_id}`
        if (room_res.length === 0) {
            return c.json({ error: 'Room not found' }, 400)
        }
        const room = room_res[0]
        const name = room['Room Name']
        const result = await sql`SELECT * FROM "Contest_room_contests" WHERE room_id = ${contest_room_contest_id} ORDER BY created_at ASC`
        return c.json({ result, success: true, name, room })
    } catch (error) {
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

    await ensureContestRoomContestsSchema()

    try {
        const result = await sql`UPDATE "Contest_room_contests" SET room_id = ${room_id}, contest_id = ${contest_id}, weight = ${weight} WHERE id = ${contest_room_contest_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error) {
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
        return c.json({ error: 'Something went wrong' }, 400)
    }
}
