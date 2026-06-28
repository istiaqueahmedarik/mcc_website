import postgres, { Sql } from 'postgres';

const connectionString: string | undefined = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Check if using Supabase transaction mode (port 6543)
const isSupabaseTransactionMode = connectionString.includes(':6543');

const sql: Sql = postgres(connectionString, {
  // Disable prepared statements for Supabase transaction mode compatibility
  // Transaction mode pooling doesn't support prepared statements
  prepare: !isSupabaseTransactionMode,

  // Connection pool configuration
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds

  // Enhanced error handling
  onnotice: (notice) => {
    console.log('PostgreSQL Notice:', notice);
  },

  // Debug mode - set to false in production
  debug: process.env.NODE_ENV === 'development' ? false : false,

  // Transform configuration for better error handling
  transform: {
    undefined: null, // Transform undefined values to null
  },
});

// Test connection and auto-initialize tables on startup
sql`SELECT 1`.then(async () => {
  console.log('✅ Database connection established successfully');
  if (isSupabaseTransactionMode) {
    console.log('🔄 Using Supabase transaction mode (prepared statements disabled)');
  } else {
    console.log('📋 Using session mode or direct connection (prepared statements enabled)');
  }

  // Auto-create required caching tables if they don't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS saved_contests (
          id SERIAL PRIMARY KEY,
          provider VARCHAR(50) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          starts_at TIMESTAMP WITH TIME ZONE,
          duration_minutes INTEGER NOT NULL,
          saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (provider, slug)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS saved_standings (
          id SERIAL PRIMARY KEY,
          provider VARCHAR(50) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (provider, slug)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS saved_lists (
          list_name VARCHAR(100) PRIMARY KEY,
          saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS university_aliases (
          id SERIAL PRIMARY KEY,
          alias_name VARCHAR(255) NOT NULL UNIQUE,
          canonical_name VARCHAR(255) NOT NULL
      )
    `;
    // Legacy cleanup: delete old BAPS entries saved with a numeric ID slug
    await sql`
      DELETE FROM saved_standings 
      WHERE provider = 'baps' AND slug ~ '^[0-9]+$'
    `;
    await sql`
      DELETE FROM saved_contests 
      WHERE provider = 'baps' AND slug ~ '^[0-9]+$'
    `;
    // Add published column if it doesn't exist
    try {
      await sql`ALTER TABLE saved_contests ADD COLUMN published BOOLEAN DEFAULT false`;
      console.log('✅ Added published column to saved_contests');
    } catch (e: any) {
      // Column already exists — ignore
    }
    console.log('✅ Caching database tables verified/initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize caching database tables:', error.message);
  }
}).catch((error) => {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
});

export default sql;
