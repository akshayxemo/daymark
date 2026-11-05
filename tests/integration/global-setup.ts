import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { createDatabase } from '../../src/server/db/client';
import { loadTestEnv } from '../env';

/**
 * Prepares the integration-test database once per run: drops everything and
 * re-applies the migrations from ./drizzle so tests always run against the
 * schema that ships with the repository.
 */
export default async function globalSetup() {
  loadTestEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Start PostgreSQL with `docker compose up -d db` and configure .env.local (see .env.example).',
    );
  }
  const { db, sql } = createDatabase(url, { max: 1 });
  try {
    await sql.unsafe('drop schema if exists drizzle cascade');
    await sql.unsafe('drop schema public cascade');
    await sql.unsafe('create schema public');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
