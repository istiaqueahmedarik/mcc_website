/**
 * Migration: Add cf_handle column to alumni_member table
 * This allows storing Codeforces handles for alumni members
 */
import sql from '../db'

async function migrate() {
    try {
        console.log('🔄 Adding cf_handle column to alumni_member table...')

        // Check if column already exists
        const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alumni_member' 
      AND column_name = 'cf_handle'
    `

        if (checkColumn.length > 0) {
            console.log('✅ Column cf_handle already exists in alumni_member table')
            return
        }

        // Add the column
        await sql`
      ALTER TABLE alumni_member 
      ADD COLUMN cf_handle TEXT
    `

        console.log('✅ Successfully added cf_handle column to alumni_member table')
        console.log('📝 You can now add Codeforces handles via the admin CMS')

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        await sql.end()
    }
}

migrate()
