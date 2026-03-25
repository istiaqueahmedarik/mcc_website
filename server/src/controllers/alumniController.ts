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

async function requireAdmin(c: any) {
  const { id, email } = c.get('jwtPayload') || {}
  if (!id || !email) return null
  const user = await sql`select id from users where id = ${id} and email = ${email} and admin = true`
  if (user.length === 0) return null
  return user[0]
}

function toNullableText(value: any) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function toNullableYear(value: any) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isInteger(num)) return null
  return num
}

function buildPublicMemberPayload(row: any) {
  const designation = toNullableText(row.designation)
  const company = toNullableText(row.company_name)

  return {
    id: row.id,
    name: row.full_name,
    position_in_club: toNullableText(row.position_in_club),
    club_position_year: toNullableYear(row.club_position_year),
    designation,
    company_name: company,
    headline: designation && company ? `${designation} @ ${company}` : (designation || company || null),
    image_url: toNullableText(row.image_url),
    linkedin_url: toNullableText(row.linkedin_url),
    cf_handle: toNullableText(row.cf_handle),
    highlight: Boolean(row.highlight),
  }
}

export const getAlumniPublic = async (c: any) => {
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
    const cfExpr = columns.has('cf_handle') ? sql`cf_handle` : sql`null`
    const highlightExpr = columns.has('highlight') ? sql`highlight` : sql`false`

    const [batches, members] = await Promise.all([
      sql`select id, year, label, motto from alumni_batch order by year desc, id desc`,
      sql`
        select
          id,
          batch_id,
          full_name,
          ${positionExpr} as position_in_club,
          ${clubYearExpr} as club_position_year,
          ${designationExpr} as designation,
          ${companyExpr} as company_name,
          image_url,
          linkedin_url,
          ${cfExpr} as cf_handle,
          ${highlightExpr} as highlight
        from alumni_member
        order by full_name, id
      `,
    ])

    const membersByBatch: Record<string, any[]> = {}
    for (const row of members) {
      const key = String(row.batch_id)
      if (!membersByBatch[key]) membersByBatch[key] = []
      membersByBatch[key].push(buildPublicMemberPayload(row))
    }

    const result = batches.map((batch) => ({
      id: batch.id,
      year: batch.year,
      batch: batch.label || `Batch ${batch.year}`,
      label: batch.label,
      motto: batch.motto,
      members: (membersByBatch[String(batch.id)] || []).sort((a, b) => a.name.localeCompare(b.name)),
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
      insert into alumni_batch (year, label, motto)
      values (${toNullableYear(body.year)}, ${toNullableText(body.label)}, ${toNullableText(body.motto)})
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
        year = ${toNullableYear(body.year)},
        label = ${toNullableText(body.label)},
        motto = ${toNullableText(body.motto)}
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
    const body = await c.req.json()
    const positionInClub = toNullableText(body.position_in_club)
    const designation = toNullableText(body.designation)
    const companyName = toNullableText(body.company_name)
    const currentPosition = [designation, companyName].filter(Boolean).join(' @ ') || null

    const data: Record<string, any> = {
      batch_id: body.batch_id,
      full_name: toNullableText(body.full_name),
      image_url: toNullableText(body.image_url),
      linkedin_url: toNullableText(body.linkedin_url),
      highlight: body.highlight ?? false,
    }

    if (columns.has('position_in_club')) data.position_in_club = positionInClub
    else if (columns.has('role')) data.role = positionInClub
    if (columns.has('club_position_year')) data.club_position_year = toNullableYear(body.club_position_year)
    if (columns.has('designation')) data.designation = designation
    if (columns.has('company_name')) data.company_name = companyName
    if (columns.has('current_position')) data.current_position = currentPosition
    if (columns.has('cf_handle')) data.cf_handle = toNullableText(body.cf_handle)

    const cols = Object.keys(data)
    const vals = Object.values(data)
    let colFrag: any = sql``
    let valFrag: any = sql``
    cols.forEach((col, idx) => {
      colFrag = idx === 0 ? sql`${sql(col)}` : sql`${colFrag}, ${sql(col)}`
      valFrag = idx === 0 ? sql`${vals[idx]}` : sql`${valFrag}, ${vals[idx]}`
    })

    const result = await sql`insert into alumni_member (${colFrag}) values (${valFrag}) returning *`
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
    const body = await c.req.json()
    if (!body.id) return c.json({ error: 'Missing id' }, 400)
    const positionInClub = toNullableText(body.position_in_club)
    const designation = toNullableText(body.designation)
    const companyName = toNullableText(body.company_name)
    const currentPosition = [designation, companyName].filter(Boolean).join(' @ ') || null

    const data: Record<string, any> = {
      batch_id: body.batch_id,
      full_name: toNullableText(body.full_name),
      image_url: toNullableText(body.image_url),
      linkedin_url: toNullableText(body.linkedin_url),
      highlight: body.highlight ?? false,
    }

    if (columns.has('position_in_club')) data.position_in_club = positionInClub
    else if (columns.has('role')) data.role = positionInClub
    if (columns.has('club_position_year')) data.club_position_year = toNullableYear(body.club_position_year)
    if (columns.has('designation')) data.designation = designation
    if (columns.has('company_name')) data.company_name = companyName
    if (columns.has('current_position')) data.current_position = currentPosition
    if (columns.has('cf_handle')) data.cf_handle = toNullableText(body.cf_handle)

    const entries = Object.entries(data)
    let setFrag: any = sql``
    entries.forEach(([k, v], idx) => {
      const frag = sql`${sql(k)} = ${v}`
      setFrag = idx === 0 ? frag : sql`${setFrag}, ${frag}`
    })

    const result = await sql`update alumni_member set ${setFrag} where id = ${body.id} returning *`
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
