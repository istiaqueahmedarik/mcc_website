import sql from '../db'

function parseBioMeta(raw: any) {
    if (!raw) return {}
    if (typeof raw === 'object') return raw
    if (typeof raw !== 'string') return {}

    const text = raw.trim()
    if (!text) return {}

    try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object') return parsed
    } catch {
        // Fallback: treat legacy plain-text bio as summary text.
        return { about: text }
    }

    return {}
}

function normalizeCareerPath(meta: Record<string, any>, company: string | null) {
    const raw = meta.career_path ?? meta.careerPath ?? null
    let list: string[] = []

    if (Array.isArray(raw)) {
        list = raw.map(v => String(v ?? '').trim()).filter(Boolean)
    } else if (typeof raw === 'string') {
        list = raw
            .split(/->|→|\|/)
            .map(v => v.trim())
            .filter(Boolean)
    }

    if (list.length === 0) {
        list = company ? ['MIST', company] : ['MIST']
    }

    if (list.length > 0 && list[0].toLowerCase() !== 'mist') {
        list = ['MIST', ...list]
    }

    if (company && list[list.length - 1]?.toLowerCase() !== company.toLowerCase()) {
        list.push(company)
    }

    return list
}

export const getAlumniPublic = async (c: any) => {
    try {
        const [batches, members] = await Promise.all([
            sql`select id, year, label, motto, sort_order from alumni_batch where is_active = true order by year desc, sort_order`,
            sql`select id, batch_id, full_name, role, current_position, bio, image_url, linkedin_url, github_url, highlight, sort_order from alumni_member where is_active = true order by sort_order, full_name`
        ])
        const membersByBatch: Record<string, any[]> = {}
        for (const m of members) {
            const meta = parseBioMeta(m.bio)
            const company = (meta.current_company ?? meta.company ?? '').toString().trim() || null
            const location = (meta.location ?? '').toString().trim() || null
            const email = (meta.email ?? '').toString().trim() || null
            const phone = (meta.phone ?? '').toString().trim() || null
            const linkedinUrl = (meta.linkedin_url ?? m.linkedin_url ?? '').toString().trim() || null
            const githubOrFacebook = (m.github_url ?? '').toString().trim()
            const facebookFromMeta = (meta.facebook_url ?? meta.facebook ?? '').toString().trim()
            const facebookUrl = facebookFromMeta || (githubOrFacebook.includes('facebook.com') ? githubOrFacebook : null)

            const bid = String(m.batch_id)
            if (!membersByBatch[bid]) membersByBatch[bid] = []
            membersByBatch[bid].push({
                id: m.id,
                name: m.full_name,
                role: m.role,
                now: m.current_position,
                current_company: company,
                location,
                email,
                phone,
                linkedin_url: linkedinUrl,
                facebook_url: facebookUrl,
                career_path: normalizeCareerPath(meta, company),
                bio_summary: (meta.about ?? meta.bio_summary ?? '').toString().trim() || null,
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
