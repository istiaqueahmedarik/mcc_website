import sql from '../db'
import { isValidFormulaIdentifier } from '../services/contestFormula'

const normalizeText = (value: unknown, maxLength = 500) => String(value ?? '').trim().slice(0, maxLength)

const formulaKeyForContest = (contestId: string) => {
    const normalized = `c${contestId}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 48)
    return isValidFormulaIdentifier(normalized) ? normalized : 'contest'
}

async function nextContestFormulaKey(roomId: string, contestId: string) {
    const base = formulaKeyForContest(contestId)
    const rows = await sql`
        SELECT formula_key
        FROM public."Contest_room_contests"
        WHERE room_id = ${roomId}
          AND formula_key LIKE ${`${base}%`}
        UNION
        SELECT formula_key
        FROM public.contest_report_merge_groups
        WHERE room_id = ${roomId}
          AND formula_key LIKE ${`${base}%`}
    `
    const used = new Set(rows.map((row: any) => String(row.formula_key)))
    if (!used.has(base)) return base
    for (let index = 2; index < 1000; index += 1) {
        const suffix = `_${index}`
        const candidate = `${base.slice(0, 48 - suffix.length)}${suffix}`
        if (!used.has(candidate)) return candidate
    }
    throw new Error('Unable to allocate a contest formula key')
}

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
    const normalizedName = normalizeText(name, 180)

    if (!normalizedRoomId || !normalizedContestId || !normalizedName) {
        return c.json({ error: 'room_id, contest_id and name are required' }, 400)
    }

    if (!/^\d+$/.test(normalizedContestId)) {
        return c.json({ error: 'contest_id must be numeric' }, 400)
    }

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

        const formulaKey = await nextContestFormulaKey(normalizedRoomId, normalizedContestId)
        const result = await sql`
            INSERT INTO "Contest_room_contests" (room_id, contest_id, contest_name, formula_key)
            VALUES (${normalizedRoomId}, ${normalizedContestId}, ${normalizedName}, ${formulaKey})
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
