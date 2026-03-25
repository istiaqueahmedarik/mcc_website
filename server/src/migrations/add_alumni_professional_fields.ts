import sql from '../db'

async function migrate() {
  try {
    console.log('🔄 Ensuring alumni professional fields exist...')

    const columns = await sql`
      select column_name
      from information_schema.columns
      where table_name = 'alumni_member'
    `
    const has = new Set(columns.map((c: any) => c.column_name))

    if (!has.has('position_in_club')) {
      await sql`alter table alumni_member add column position_in_club text`
      console.log('✅ Added column: position_in_club')
    }

    if (!has.has('designation')) {
      await sql`alter table alumni_member add column designation text`
      console.log('✅ Added column: designation')
    }

    if (!has.has('company_name')) {
      await sql`alter table alumni_member add column company_name text`
      console.log('✅ Added column: company_name')
    }

    await sql`
      update alumni_member
      set
        position_in_club = coalesce(nullif(position_in_club, ''), role),
        designation = coalesce(nullif(designation, ''), split_part(current_position, ' @ ', 1)),
        company_name = coalesce(nullif(company_name, ''), nullif(split_part(current_position, ' @ ', 2), ''))
    `

    console.log('✅ Alumni professional fields migration complete')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

migrate()
