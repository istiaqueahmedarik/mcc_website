import sql from '../db'

export const getAlumniPublic = async (c: any) => {
    try {
        const [batches, members] = await Promise.all([
            sql`select id, year, label, motto, sort_order from alumni_batch where is_active = true order by year desc, sort_order`,
            sql`select id, batch_id, full_name, role, current_position, image_url, highlight, sort_order from alumni_member where is_active = true order by sort_order, full_name`
        ])
        const membersByBatch: Record<string, any[]> = {}
        for (const m of members) {
            const bid = String(m.batch_id)
            if (!membersByBatch[bid]) membersByBatch[bid] = []
            membersByBatch[bid].push({
                id: m.id,
                name: m.full_name,
                role: m.role,
                now: m.current_position,
                image_url: m.image_url,
                highlight: m.highlight,
                sort_order: m.sort_order
            })
        }
        const result = batches.map(b => ({
            id: b.id,
            year: b.year,
            batch: b.label || `Batch ${b.year}`,
            label: b.label,
            motto: b.motto,
            sort_order: b.sort_order,
            members: (membersByBatch[String(b.id)] || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
        }))
        return c.json({ batches: result })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to load alumni' }, 500)
    }
}
