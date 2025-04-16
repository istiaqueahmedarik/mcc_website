import postgres, { Sql } from 'postgres';

const connectionString: string | undefined = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql: Sql = postgres(connectionString);

export default sql;
