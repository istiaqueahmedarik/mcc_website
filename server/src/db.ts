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

// Test connection on startup
sql`SELECT 1`.then(() => {
  console.log('✅ Database connection established successfully');
  if (isSupabaseTransactionMode) {
    console.log('🔄 Using Supabase transaction mode (prepared statements disabled)');
  } else {
    console.log('📋 Using session mode or direct connection (prepared statements enabled)');
  }
}).catch((error) => {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
});

export default sql;
