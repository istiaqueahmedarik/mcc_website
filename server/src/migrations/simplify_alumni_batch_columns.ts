import sql from '../db'

async function migrate() {
  try {
    console.log('🔄 Simplifying alumni_batch schema...')

    await sql`
      update alumni_batch
      set label = concat('Batch ', id)
      where label is null or btrim(label) = ''
    `
    await sql`alter table alumni_batch alter column label set not null`
    await sql`alter table alumni_batch drop column if exists year`
    await sql`alter table alumni_batch drop column if exists motto`

    console.log('✅ alumni_batch schema simplified successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

migrate()
