import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Only initialize when a server feature requests it: the existing local demo
// must remain usable while a PostgreSQL instance is being configured.
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDatabase() {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for server-backed features');
  const sql = postgres(url, { max: 1, prepare: false });
  database = drizzle(sql, { schema });
  return database;
}
