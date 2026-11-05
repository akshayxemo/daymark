/**
 * DEVELOPMENT ONLY. Drops every table and re-applies all migrations.
 *
 *   pnpm db:reset            # local databases only
 *   pnpm db:reset --force    # required for non-local hosts (never for production data)
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from '../../src/server/db/client';
import {
  describeTarget,
  hasFlag,
  isLocalDatabase,
  loadEnvironment,
  migrationDatabaseUrl,
  migrationsFolder,
} from './_shared';

async function main() {
  loadEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset refuses to run with NODE_ENV=production.');
  }
  const url = migrationDatabaseUrl();
  if (!isLocalDatabase(url) && !hasFlag('--force')) {
    throw new Error(
      `Refusing to reset a non-local database (${describeTarget(url)}). Pass --force only if you are certain it holds no real data.`,
    );
  }
  const { db, sql } = createDatabase(url, { max: 1 });
  try {
    console.log(`Resetting ${describeTarget(url)} ...`);
    await sql.unsafe('drop schema if exists drizzle cascade');
    await sql.unsafe('drop schema public cascade');
    await sql.unsafe('create schema public');
    await migrate(db, { migrationsFolder });
    console.log(
      'Schema recreated from migrations. Run `pnpm db:seed` to add default configuration or demo data.',
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('Reset failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
