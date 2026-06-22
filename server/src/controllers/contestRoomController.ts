import sql from '../db'
import { ensureContestRoomSchema } from '../utils/ensureContestRoomSchema'

const normalizeContestType = (value: any) => {
    const normalized = String(value || '').trim().toUpperCase()
    if (normalized === 'TSC' || normalized === 'TPC' || normalized === 'TFC') return normalized
    return 'TFC'
}

const clampPercentage = (value: any, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    if (numeric < 0) return 0
    if (numeric > 100) return 100
    return numeric
}

const resolveRoomSettings = async (payload: any, existingRow: any = null, roomIdForUpdate: string | null = null) => {
    const contestType = normalizeContestType(payload?.contest_type ?? existingRow?.contest_type)

    let tfcRoomRaw = payload?.tfc_room_id
    if (tfcRoomRaw === undefined) tfcRoomRaw = existingRow?.tfc_room_id ?? null
    const tfcRoomId = typeof tfcRoomRaw === 'string' && tfcRoomRaw.trim().length > 0
        ? tfcRoomRaw.trim()
        : null

    const tfcPercentage = clampPercentage(
        payload?.tfc_percentage ?? existingRow?.tfc_percentage ?? 0,
        0
    )
    const defaultTsc = 100 - tfcPercentage
    const tscPercentage = clampPercentage(
        payload?.tsc_percentage ?? existingRow?.tsc_percentage ?? defaultTsc,
        defaultTsc
    )

    if (contestType !== 'TSC') {
        return {
            contestType,
            tfcRoomId: null,
            tfcPercentage: 0,
            tscPercentage: 100,
            error: null,
        }
    }

    if (roomIdForUpdate && tfcRoomId && String(tfcRoomId) === String(roomIdForUpdate)) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'A TSC room cannot reference itself as TFC room',
        }
    }

    if (tfcPercentage > 0 && !tfcRoomId) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'tfc_room_id is required when tfc_percentage is greater than 0',
        }
    }

    if (!tfcRoomId) {
        return {
            contestType,
            tfcRoomId: null,
            tfcPercentage,
            tscPercentage,
            error: null,
        }
    }

    const linked = await sql`SELECT id, contest_type FROM public."Contest_report_room" WHERE id=${tfcRoomId} LIMIT 1`
    if (linked.length === 0) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'Selected TFC room not found',
        }
    }

    if (normalizeContestType(linked[0].contest_type) !== 'TFC') {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'Selected reference room must be of type TFC',
        }
    }

    return {
        contestType,
        tfcRoomId,
        tfcPercentage,
        tscPercentage,
        error: null,
    }
}

export const insertContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    await ensureContestRoomSchema()

    const payload = await c.req.json()
    const { room_name } = payload
    if (!room_name || !String(room_name).trim()) {
        return c.json({ error: 'room_name required' }, 400)
    }

    const settings = await resolveRoomSettings(payload)
    if (settings.error) {
        return c.json({ error: settings.error }, 400)
    }

    try {
        const result = await sql`
            INSERT INTO "Contest_report_room" ("Room Name", contest_type, tfc_room_id, tfc_percentage, tsc_percentage)
            VALUES (${String(room_name).trim()}, ${settings.contestType}, ${settings.tfcRoomId}, ${settings.tfcPercentage}, ${settings.tscPercentage})
            RETURNING *
        `
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getAllContestRooms = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    await ensureContestRoomSchema()

    try {
        const result = await sql`SELECT * FROM "Contest_report_room" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id } = await c.req.json()
    await ensureContestRoomSchema()
    try {
        const result = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${room_id}`
        return c.json({ result, success: true })
    } catch (error) {
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

    await ensureContestRoomSchema()

    const payload = await c.req.json()
    const { room_id, room_name } = payload
    if (!room_id) {
        return c.json({ error: 'room_id required' }, 400)
    }

    const currentRows = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${room_id} LIMIT 1`
    if (currentRows.length === 0) {
        return c.json({ error: 'Room not found' }, 404)
    }

    const currentRow = currentRows[0]
    const nextRoomName = typeof room_name === 'string' && room_name.trim().length > 0
        ? room_name.trim()
        : currentRow['Room Name']

    const settings = await resolveRoomSettings(payload, currentRow, room_id)
    if (settings.error) {
        return c.json({ error: settings.error }, 400)
    }

    try {
        const result = await sql`
            UPDATE "Contest_report_room"
            SET
                "Room Name" = ${nextRoomName},
                contest_type = ${settings.contestType},
                tfc_room_id = ${settings.tfcRoomId},
                tfc_percentage = ${settings.tfcPercentage},
                tsc_percentage = ${settings.tscPercentage}
            WHERE id = ${room_id}
            RETURNING *
        `
        return c.json({ result, success: true })
    } catch (error) {
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

    if (!room_id) {
        return c.json({ error: 'room_id required' }, 400)
    }

    try {
        const linkedCollection = await sql`
            SELECT id
            FROM public.team_collections
            WHERE room_id=${room_id}
            LIMIT 1
        `
        if (linkedCollection.length > 0) {
            return c.json({ error: 'Cannot delete room with existing team collections. Delete those collections first.' }, 400)
        }

        await sql`DELETE FROM "Contest_room_contests" WHERE room_id=${room_id}`
        await sql`DELETE FROM public."Public_contest_report" WHERE "Shared_contest_id"=${room_id}`

        const result = await sql`DELETE FROM "Contest_report_room" WHERE id = ${room_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error: any) {
        return c.json({ error: error?.message || 'Something went wrong' }, 400)
    }
}
