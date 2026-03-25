import sql from '../db'

async function migrate() {
  try {
    console.log('🔄 Fixing alumni_member schema...')

    // 1. Rename club_position to position_in_club if it exists and target doesn't
    const columns = await sql`
      select column_name
      from information_schema.columns
      where table_name = 'alumni_member'
    `
    const colSet = new Set(columns.map((r: any) => r.column_name))

    if (colSet.has('club_position') && !colSet.has('position_in_club')) {
      await sql`alter table alumni_member rename column club_position to position_in_club`
      console.log('Renamed club_position to position_in_club')
    } else if (!colSet.has('position_in_club')) {
      await sql`alter table alumni_member add column position_in_club text`
      console.log('Added position_in_club column')
    }

    // 2. Add club_position_year
    if (!colSet.has('club_position_year')) {
      await sql`alter table alumni_member add column club_position_year integer`
      console.log('Added club_position_year column')
    }

    // 3. Add designation and company_name, migrate data from current_position
    if (!colSet.has('designation')) {
        await sql`alter table alumni_member add column designation text`
        console.log('Added designation column')
    }
    if (!colSet.has('company_name')) {
        await sql`alter table alumni_member add column company_name text`
        console.log('Added company_name column')
    }

    // Migrate data if current_position exists and has data
    if (colSet.has('current_position')) {
        console.log('Migrating data from current_position...')
        await sql`
            update alumni_member
            set 
                designation = split_part(current_position, ' @ ', 1),
                company_name = split_part(current_position, ' @ ', 2)
            where current_position is not null and designation is null
        `
        // Optional: Drop current_position later, but keeping for safety now
    }

    console.log('✅ alumni_member schema fixed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

migrate()
