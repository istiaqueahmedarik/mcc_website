import sql from '../db'

let alumniMemberColumnsCache: Set<string> | null = null

async function getAlumniMemberColumns() {
    if (alumniMemberColumnsCache) return alumniMemberColumnsCache
    const rows = await sql`
        select column_name
        from information_schema.columns
        where table_name = 'alumni_member'
    `
    alumniMemberColumnsCache = new Set(rows.map((r: any) => r.column_name))
    return alumniMemberColumnsCache
}

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
        const columns = await getAlumniMemberColumns()
        const positionExpr = columns.has('position_in_club')
            ? sql`position_in_club`
            : columns.has('role')
                ? sql`role`
                : sql`null`
        const clubYearExpr = columns.has('club_position_year') ? sql`club_position_year` : sql`null`
        const designationExpr = columns.has('designation')
            ? sql`designation`
            : columns.has('current_position')
                ? sql`nullif(split_part(current_position, ' @ ', 1), '')`
                : sql`null`
        const companyExpr = columns.has('company_name')
            ? sql`company_name`
            : columns.has('current_position')
                ? sql`nullif(split_part(current_position, ' @ ', 2), '')`
                : sql`null`
        const highlightWhere = columns.has('highlight') ? sql`where m.highlight = true` : sql``

        const [features, stats, timeline, highlightedMembers] = await Promise.all([
            sql`select id, title, description, position from landing_features where active = true order by position, id`,
            sql`select id, title, value, suffix, position from landing_stats where active = true order by position, id`,
            sql`select id, year, title, body, position from landing_timeline where active = true order by position, id`,
            sql`
                select
                    m.id,
                    m.full_name,
                    ${positionExpr} as position_in_club,
                    ${clubYearExpr} as club_position_year,
                    ${designationExpr} as designation,
                    ${companyExpr} as company_name,
                    m.image_url,
                    b.label as batch_label
                from alumni_member m
                left join alumni_batch b on b.id = m.batch_id
                ${highlightWhere}
                order by b.id desc, m.full_name, m.id
            `
        ])

        const alumni = highlightedMembers.map((m: any) => {
            const designation = (m.designation ?? '').toString().trim()
            const company = (m.company_name ?? '').toString().trim()
            const positionInClub = (m.position_in_club ?? '').toString().trim()
            const clubYear = Number.isInteger(Number(m.club_position_year)) ? Number(m.club_position_year) : null

            const batchTitle = m.batch_label
                ? `${m.batch_label}`
                : 'MIST Alumni'

            const titleCore = designation && company
                ? `${designation} @ ${company}`
                : (designation || company || 'Alumni')

            return {
                id: `member-${m.id}`,
                name: m.full_name,
                title: `${batchTitle} • ${titleCore}`,
                quote: positionInClub
                    ? `${positionInClub}${clubYear ? ` ${clubYear}` : ''}`
                    : 'Alumni spotlight',
                image_url: m.image_url,
                company,
                role: designation || 'Alumni',
            }
        })

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

async function updateRow(table: string, id: number | string, fields: Record<string, any>) {
    const entries = Object.entries(fields)
    if (entries.length === 0) return []
    const fragments = entries.map(([k, v]) => sql`${sql(k)} = ${v}`)
    let setFragment: any = sql``
    fragments.forEach((frag, idx) => {
        if (idx === 0) setFragment = frag
        else setFragment = sql`${setFragment}, ${frag}`
    })
    return await sql`UPDATE ${sql(table)} SET ${setFragment} WHERE id = ${id} RETURNING *`
}

async function deleteRow(table: string, id: number | string) {
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
                const rows = await updateRow(table, id, data)
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
                const rows = await deleteRow(table, id)
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
            try { const rows = await updateRow(table, id, data); return c.json({ result: rows[0] }) } catch (e) { console.error(e); return c.json({ error: 'Update failed' }, 400) }
        },
        delete: async (c: any) => {
            const admin = await requireAdmin(c)
            if (!admin) return c.json({ error: 'Unauthorized' }, 401)
            const body = await c.req.json(); const { id } = body; if (!id) return c.json({ error: 'Missing id' }, 400)
            try { const rows = await deleteRow(table, id); return c.json({ result: rows[0] }) } catch (e) { console.error(e); return c.json({ error: 'Delete failed' }, 400) }
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
export const alumniBatchCrud = makeCrudWithOrder(
    'alumni_batch',
    ['label'],
    ['label'],
    'id'
)
export const alumniMemberCrud = makeCrudWithOrder(
    'alumni_member',
    ['batch_id', 'full_name', 'position_in_club', 'club_position_year', 'designation', 'company_name', 'image_url', 'linkedin_url', 'cf_handle', 'highlight'],
    ['batch_id', 'full_name', 'position_in_club', 'club_position_year', 'designation', 'company_name', 'image_url', 'linkedin_url', 'cf_handle', 'highlight'],
    'full_name'
)
