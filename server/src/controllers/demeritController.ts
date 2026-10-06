import { Context } from 'hono'
import sql from '../db'
import { markGlobalContestReportsStaleForVjudgeContests } from '../services/globalContestReportSnapshotService'

export const getDemeritsByContest = async (c: Context) => {
    try {
        const { contest_id } = await c.req.json()

        if (!contest_id) {
            return c.json({ error: 'Contest ID is required' }, 400)
        }

        const demerits = await sql`
            SELECT * FROM "Demerit" 
            WHERE contest_id = ${contest_id}
            ORDER BY created_at DESC
        `

        return c.json({ success: true, data: demerits })
    } catch (error) {
        console.error('Error fetching demerits by contest:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const getDemeritsByVjudgeContest = async (c: Context) => {
    try {
        const { vjudge_id, contest_id } = await c.req.json()

        if (!vjudge_id || !contest_id) {
            return c.json({ error: 'VJudge ID and Contest ID are required' }, 400)
        }

        const demerits = await sql`
            SELECT * FROM "Demerit" 
            WHERE vjudge_id = ${vjudge_id} AND contest_id = ${contest_id}
            ORDER BY created_at DESC
        `

        return c.json({ success: true, data: demerits })
    } catch (error) {
        console.error('Error fetching demerits by vjudge and contest:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const createDemerit = async (c: Context) => {
    try {
        const { id, email } = c.get('jwtPayload')
        if (!id || !email) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // Check if user is admin
        const user = await sql`
            SELECT admin FROM users 
            WHERE id = ${id} AND email = ${email}
        `

        if (user.length === 0 || !user[0].admin) {
            return c.json({ error: 'Admin access required' }, 403)
        }

        const { contest_id, vjudge_id, demerit_point, reason } = await c.req.json()

        if (!contest_id || !vjudge_id || !demerit_point || !reason) {
            return c.json({ error: 'All fields are required' }, 400)
        }

        const demerit = await sql.begin(async (tx) => {
            const inserted = await tx`
                INSERT INTO "Demerit" (contest_id, vjudge_id, demerit_point, reason)
                VALUES (${contest_id}, ${vjudge_id}, ${demerit_point}, ${reason})
                RETURNING *
            `
            await markGlobalContestReportsStaleForVjudgeContests(tx, [String(contest_id)])
            return inserted
        })

        return c.json({ success: true, data: demerit[0] })
    } catch (error) {
        console.error('Error creating demerit:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const updateDemerit = async (c: Context) => {
    try {
        const { id, email } = c.get('jwtPayload')
        if (!id || !email) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // Check if user is admin
        const user = await sql`
            SELECT admin FROM users 
            WHERE id = ${id} AND email = ${email}
        `

        if (user.length === 0 || !user[0].admin) {
            return c.json({ error: 'Admin access required' }, 403)
        }

        const { demerit_id, contest_id, vjudge_id, demerit_point, reason } = await c.req.json()

        if (!demerit_id || !contest_id || !vjudge_id || !demerit_point || !reason) {
            return c.json({ error: 'All fields are required' }, 400)
        }

        const demerit = await sql.begin(async (tx) => {
            const current = await tx`
                SELECT contest_id
                FROM "Demerit"
                WHERE id = ${demerit_id}
                FOR UPDATE
            `
            if (current.length === 0) return []
            const updated = await tx`
                UPDATE "Demerit"
                SET contest_id = ${contest_id}, vjudge_id = ${vjudge_id},
                    demerit_point = ${demerit_point}, reason = ${reason}
                WHERE id = ${demerit_id}
                RETURNING *
            `
            await markGlobalContestReportsStaleForVjudgeContests(tx, [
                String(current[0].contest_id),
                String(contest_id),
            ])
            return updated
        })

        if (demerit.length === 0) {
            return c.json({ error: 'Demerit not found' }, 404)
        }

        return c.json({ success: true, data: demerit[0] })
    } catch (error) {
        console.error('Error updating demerit:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const deleteDemerit = async (c: Context) => {
    try {
        const { id, email } = c.get('jwtPayload')
        if (!id || !email) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // Check if user is admin
        const user = await sql`
            SELECT admin FROM users 
            WHERE id = ${id} AND email = ${email}
        `

        if (user.length === 0 || !user[0].admin) {
            return c.json({ error: 'Admin access required' }, 403)
        }

        const { demerit_id } = await c.req.json()

        if (!demerit_id) {
            return c.json({ error: 'Demerit ID is required' }, 400)
        }

        const deletedDemerit = await sql.begin(async (tx) => {
            const deleted = await tx`
                DELETE FROM "Demerit"
                WHERE id = ${demerit_id}
                RETURNING *
            `
            if (deleted.length > 0) {
                await markGlobalContestReportsStaleForVjudgeContests(tx, [String(deleted[0].contest_id)])
            }
            return deleted
        })

        if (deletedDemerit.length === 0) {
            return c.json({ error: 'Demerit not found' }, 404)
        }

        return c.json({ success: true, data: deletedDemerit[0] })
    } catch (error) {
        console.error('Error deleting demerit:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}

export const getAllDemerits = async (c: Context) => {
    try {
        const { id, email } = c.get('jwtPayload')
        if (!id || !email) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // Check if user is admin
        const user = await sql`
            SELECT admin FROM users 
            WHERE id = ${id} AND email = ${email}
        `

        if (user.length === 0 || !user[0].admin) {
            return c.json({ error: 'Admin access required' }, 403)
        }

        const demerits = await sql`
            SELECT d.*, u.full_name as user_name
            FROM "Demerit" d
            LEFT JOIN users u ON d.vjudge_id = u.vjudge_id
            ORDER BY d.created_at DESC
        `

        return c.json({ success: true, data: demerits })
    } catch (error) {
        console.error('Error fetching all demerits:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}
