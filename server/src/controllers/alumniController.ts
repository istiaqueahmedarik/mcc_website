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
    list = raw.split(/->|→|\|/).map(v => v.trim()).filter(Boolean)
  }

  if (list.length === 0) list = company ? ['MIST', company] : ['MIST']
  if (list.length > 0 && list[0].toLowerCase() !== 'mist') list = ['MIST', ...list]
  if (company && list[list.length - 1]?.toLowerCase() !== company.toLowerCase()) list.push(company)

  return list
}

async function requireAdmin(c: any) {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return null
  const user = await sql`select id from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) return null
  return user[0]
}

function buildAlumniPayload(row: any) {
  const meta = parseBioMeta(row.bio)
  const company = (row.company_name ?? meta.current_company ?? meta.company ?? '').toString().trim() || null
  const designation = (row.designation ?? meta.designation ?? '').toString().trim() || null
  const positionInClub = (row.position_in_club ?? row.role ?? '').toString().trim() || null
  const location = (meta.location ?? '').toString().trim() || null
  const email = (meta.email ?? '').toString().trim() || null
  const phone = (meta.phone ?? '').toString().trim() || null
  const linkedinUrl = (meta.linkedin_url ?? row.linkedin_url ?? '').toString().trim() || null
  const githubOrFacebook = (row.github_url ?? '').toString().trim()
  const facebookFromMeta = (meta.facebook_url ?? meta.facebook ?? '').toString().trim()
  const facebookUrl = facebookFromMeta || (githubOrFacebook.includes('facebook.com') ? githubOrFacebook : null)
  const headline = designation && company ? `${designation} @ ${company}` : row.current_position

  return {
    id: row.id,
    name: row.full_name,
    role: positionInClub,
    position_in_club: positionInClub,
    designation,
    company_name: company,
    now: headline,
    current_position: row.current_position,
    current_company: company,
    location,
    email,
    phone,
    linkedin_url: linkedinUrl,
    facebook_url: facebookUrl,
    career_path: normalizeCareerPath(meta, company),
    bio_summary: (meta.about ?? meta.bio_summary ?? '').toString().trim() || null,
    image_url: row.image_url,
    highlight: row.highlight,
    sort_order: row.sort_order,
  }
}

export const getAlumniPublic = async (c: any) => {
  try {
    const columns = await getAlumniMemberColumns()
    const hasProfessionalFields =
      columns.has('position_in_club') && columns.has('designation') && columns.has('company_name')

    const [batches, members] = await Promise.all([
      sql`select id, year, label, motto, sort_order from alumni_batch where is_active = true order by year desc, id desc`,
      hasProfessionalFields
        ? sql`select id, batch_id, full_name, role, position_in_club, designation, company_name, current_position, bio, image_url, linkedin_url, github_url, highlight, sort_order from alumni_member where is_active = true order by full_name, id`
        : sql`select id, batch_id, full_name, role, current_position, bio, image_url, linkedin_url, github_url, highlight, sort_order from alumni_member where is_active = true order by full_name, id`,
    ])

    const membersByBatch: Record<string, any[]> = {}
    for (const m of members) {
      const bid = String(m.batch_id)
      if (!membersByBatch[bid]) membersByBatch[bid] = []
      membersByBatch[bid].push(buildAlumniPayload(m))
    }

    const result = batches.map(b => ({
      id: b.id,
      year: b.year,
      batch: b.label || `Batch ${b.year}`,
      label: b.label,
      motto: b.motto,
      sort_order: b.sort_order,
      members: (membersByBatch[String(b.id)] || []).sort((a, x) => a.name.localeCompare(x.name)),
    }))
    return c.json({ batches: result })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to load alumni' }, 500)
  }
}

export const listAdminAlumniBatches = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const result = await sql`select * from alumni_batch order by year desc, id desc`
    return c.json({ result })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to list alumni batches' }, 500)
  }
}

export const createAdminAlumniBatch = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = await c.req.json()
    const result = await sql`
      insert into alumni_batch (year, label, motto, is_active)
      values (${body.year}, ${body.label}, ${body.motto || null}, ${body.is_active ?? true})
      returning *
    `
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to create alumni batch' }, 400)
  }
}

export const updateAdminAlumniBatch = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = await c.req.json()
    if (!body.id) return c.json({ error: 'Missing id' }, 400)
    const result = await sql`
      update alumni_batch
      set
        year = ${body.year},
        label = ${body.label},
        motto = ${body.motto || null},
        is_active = ${body.is_active ?? true}
      where id = ${body.id}
      returning *
    `
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to update alumni batch' }, 400)
  }
}

export const deleteAdminAlumniBatch = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = await c.req.json()
    if (!body.id) return c.json({ error: 'Missing id' }, 400)
    const result = await sql`delete from alumni_batch where id = ${body.id} returning *`
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to delete alumni batch' }, 400)
  }
}

export const listAdminAlumniMembers = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const result = await sql`select * from alumni_member order by full_name, id`
    return c.json({ result })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to list alumni members' }, 500)
  }
}

export const createAdminAlumniMember = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const columns = await getAlumniMemberColumns()
    const hasProfessionalFields =
      columns.has('position_in_club') && columns.has('designation') && columns.has('company_name')
    const body = await c.req.json()
    const role = body.position_in_club || body.role || null
    const currentPosition = body.current_position || [body.designation, body.company_name].filter(Boolean).join(' @ ')
    const result = hasProfessionalFields
      ? await sql`
          insert into alumni_member
          (batch_id, full_name, role, position_in_club, designation, company_name, current_position, bio, image_url, linkedin_url, github_url, highlight, is_active)
          values
          (${body.batch_id}, ${body.full_name}, ${role}, ${body.position_in_club || null}, ${body.designation || null}, ${body.company_name || null}, ${currentPosition || null}, ${body.bio || null}, ${body.image_url || null}, ${body.linkedin_url || null}, ${body.github_url || null}, ${body.highlight ?? false}, ${body.is_active ?? true})
          returning *
        `
      : await sql`
          insert into alumni_member
          (batch_id, full_name, role, current_position, bio, image_url, linkedin_url, github_url, highlight, is_active)
          values
          (${body.batch_id}, ${body.full_name}, ${role}, ${currentPosition || null}, ${body.bio || null}, ${body.image_url || null}, ${body.linkedin_url || null}, ${body.github_url || null}, ${body.highlight ?? false}, ${body.is_active ?? true})
          returning *
        `
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to create alumni member' }, 400)
  }
}

export const updateAdminAlumniMember = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const columns = await getAlumniMemberColumns()
    const hasProfessionalFields =
      columns.has('position_in_club') && columns.has('designation') && columns.has('company_name')
    const body = await c.req.json()
    if (!body.id) return c.json({ error: 'Missing id' }, 400)
    const role = body.position_in_club || body.role || null
    const currentPosition = body.current_position || [body.designation, body.company_name].filter(Boolean).join(' @ ')
    const result = hasProfessionalFields
      ? await sql`
          update alumni_member
          set
            batch_id = ${body.batch_id},
            full_name = ${body.full_name},
            role = ${role},
            position_in_club = ${body.position_in_club || null},
            designation = ${body.designation || null},
            company_name = ${body.company_name || null},
            current_position = ${currentPosition || null},
            bio = ${body.bio || null},
            image_url = ${body.image_url || null},
            linkedin_url = ${body.linkedin_url || null},
            github_url = ${body.github_url || null},
            highlight = ${body.highlight ?? false},
            is_active = ${body.is_active ?? true}
          where id = ${body.id}
          returning *
        `
      : await sql`
          update alumni_member
          set
            batch_id = ${body.batch_id},
            full_name = ${body.full_name},
            role = ${role},
            current_position = ${currentPosition || null},
            bio = ${body.bio || null},
            image_url = ${body.image_url || null},
            linkedin_url = ${body.linkedin_url || null},
            github_url = ${body.github_url || null},
            highlight = ${body.highlight ?? false},
            is_active = ${body.is_active ?? true}
          where id = ${body.id}
          returning *
        `
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to update alumni member' }, 400)
  }
}

export const deleteAdminAlumniMember = async (c: any) => {
  const admin = await requireAdmin(c)
  if (!admin) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = await c.req.json()
    if (!body.id) return c.json({ error: 'Missing id' }, 400)
    const result = await sql`delete from alumni_member where id = ${body.id} returning *`
    return c.json({ result: result[0] })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Failed to delete alumni member' }, 400)
  }
}
