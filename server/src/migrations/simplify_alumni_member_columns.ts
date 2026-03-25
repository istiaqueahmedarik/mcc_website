import sql from '../db'

async function migrate() {
  try {
    console.log('🔄 Simplifying alumni_member schema...')

    await sql`alter table alumni_member add column if not exists club_position_year integer`
    await sql`alter table alumni_member add column if not exists cf_handle text`

    await sql`alter table alumni_member drop column if exists role`
    await sql`alter table alumni_member drop column if exists current_position`
    await sql`alter table alumni_member drop column if exists bio`
    await sql`alter table alumni_member drop column if exists github_url`
    await sql`alter table alumni_member drop column if exists sort_order`

    console.log('✅ alumni_member schema simplified successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

migrate()
