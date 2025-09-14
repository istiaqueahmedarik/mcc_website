import sql from '../db'

// Utility to check admin based on jwtPayload in context
async function requireAdmin(c: any) {
    const { id, email } = c.get('jwtPayload') || {}
    if (!id || !email) {
        return null
    }
    const user = await sql`select id from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) return null
    return user[0]
}

export const getLandingPublic = async (c: any) => {
    try {
        const features = await sql`select id, title, description, position from landing_features where active = true order by position, id`
        const stats = await sql`select id, title, value, suffix, position from landing_stats where active = true order by position, id`
        const timeline = await sql`select id, year, title, body, position from landing_timeline where active = true order by position, id`
        const alumni = await sql`select id, name, title, quote, image_url, position from landing_testimonials where active = true order by position, id`
        return c.json({ features, stats, timeline, alumni })
    } catch (e) {
        console.error('Landing public data load failed:', e)
        return c.json({ error: 'Failed to load landing data' }, 500)
    }
}

async function insertRow(table: string, fields: Record<string, any>) {
    const cols = Object.keys(fields)
    const values = Object.values(fields)
    if (cols.length === 0) return []
    const colIdents = cols.map(c => sql(c))
    let valsFragment: any = sql``
    values.forEach((v, idx) => {
        if (idx === 0) valsFragment = sql`${v}`
        else valsFragment = sql`${valsFragment}, ${v}`
    })
    let colsFragment: any = sql``
    colIdents.forEach((cIdent, idx) => {
        if (idx === 0) colsFragment = cIdent
        else colsFragment = sql`${colsFragment}, ${cIdent}`
    })
    return await sql`INSERT INTO ${sql(table)} (${colsFragment}) VALUES (${valsFragment}) RETURNING *`
}

async function updateRow(table: string, id: number, fields: Record<string, any>) {
    const entries = Object.entries(fields)
    if (entries.length === 0) return []
    const fragments = entries.map(([k, v]) => sql`${sql(k)} = ${v}`)
    // Manually interleave commas
    let setFragment: any = sql``
    fragments.forEach((frag, idx) => {
        if (idx === 0) setFragment = frag
        else setFragment = sql`${setFragment}, ${frag}`
    })
    return await sql`UPDATE ${sql(table)} SET ${setFragment} WHERE id = ${id} RETURNING *`
}

async function deleteRow(table: string, id: number) {
    return await sql`DELETE FROM ${sql(table)} WHERE id = ${id} RETURNING *`
}

function makeCrud(table: string, allowedInsert: string[], allowedUpdate: string[]) {
    return {
        create: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json()
            const data: Record<string, any> = {}
            for (const k of allowedInsert) if (k in body) data[k] = body[k]
            try {
                const rows = await insertRow(table, data)
                return c.json({ result: rows[0] })
            } catch (e) {
                console.error(e)
                return c.json({ error: 'Create failed' }, 400)
            }
        },
        update: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json()
            const { id, ...rest } = body
            if (!id) return c.json({ error: 'Missing id' }, 400)
            const data: Record<string, any> = {}
            for (const k of allowedUpdate) if (k in rest) data[k] = (rest as any)[k]
            try {
                const rows = await updateRow(table, Number(id), data)
                return c.json({ result: rows[0] })
            } catch (e) {
                console.error(e)
                return c.json({ error: 'Update failed' }, 400)
            }
        },
        delete: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json()
            const { id } = body
            if (!id) return c.json({ error: 'Missing id' }, 400)
            try {
                const rows = await deleteRow(table, Number(id))
                return c.json({ result: rows[0] })
            } catch (e) {
                console.error(e)
                return c.json({ error: 'Delete failed' }, 400)
            }
        },
        list: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            try {
                const rows = await sql`select * from ${sql(table)} order by position, id`
                return c.json({ result: rows })
            } catch (e) {
                console.error(e)
                return c.json({ error: 'List failed' }, 400)
            }
        },
    }
}

function makeCrudWithOrder(table: string, allowedInsert: string[], allowedUpdate: string[], orderCol: string) {
    return {
        create: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json()
            const data: Record<string, any> = {}
            for (const k of allowedInsert) if (k in body) data[k] = body[k]
            try { const rows = await insertRow(table, data); return c.json({ result: rows[0] }) } catch (e) { console.error(e); return c.json({ error: 'Create failed' }, 400) }
        },
        update: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json(); const { id, ...rest } = body; if (!id) return c.json({ error: 'Missing id' }, 400)
            const data: Record<string, any> = {}; for (const k of allowedUpdate) if (k in rest) data[k] = (rest as any)[k]
            try { const rows = await updateRow(table, Number(id), data); return c.json({ result: rows[0] }) } catch (e) { console.error(e); return c.json({ error: 'Update failed' }, 400) }
        },
        delete: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json(); const { id } = body; if (!id) return c.json({ error: 'Missing id' }, 400)
            try { const rows = await deleteRow(table, Number(id)); return c.json({ result: rows[0] }) } catch (e) { console.error(e); return c.json({ error: 'Delete failed' }, 400) }
        },
        list: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            try { const rows = await sql`select * from ${sql(table)} order by ${sql(orderCol)}, id`; return c.json({ result: rows }) } catch (e) { console.error(e); return c.json({ error: 'List failed' }, 400) }
        }
    }
}

export const featuresCrud = makeCrud(
    'landing_features',
    ['title', 'description', 'position', 'active'],
    ['title', 'description', 'position', 'active'],
)
export const statsCrud = makeCrud(
    'landing_stats',
    ['title', 'value', 'suffix', 'position', 'active'],
    ['title', 'value', 'suffix', 'position', 'active'],
)
export const timelineCrud = makeCrud(
    'landing_timeline',
    ['year', 'title', 'body', 'position', 'active'],
    ['year', 'title', 'body', 'position', 'active'],
)
export const alumniCrud = makeCrud(
    'landing_testimonials',
    ['name', 'title', 'quote', 'image_url', 'position', 'active'],
    ['name', 'title', 'quote', 'image_url', 'position', 'active'],
)
export const alumniBatchCrud = makeCrudWithOrder(
    'alumni_batch',
    ['year', 'label', 'motto', 'sort_order', 'is_active'],
    ['year', 'label', 'motto', 'sort_order', 'is_active'],
    'sort_order'
)
export const alumniMemberCrud = makeCrudWithOrder(
    'alumni_member',
    ['batch_id', 'full_name', 'role', 'current_position', 'bio', 'image_url', 'linkedin_url', 'github_url', 'highlight', 'sort_order', 'is_active'],
    ['batch_id', 'full_name', 'role', 'current_position', 'bio', 'image_url', 'linkedin_url', 'github_url', 'highlight', 'sort_order', 'is_active'],
    'sort_order'
)
