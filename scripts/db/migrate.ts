/**
 * Applies every pending SQL migration in ./drizzle to the configured database.
 *
 *   pnpm db:migrate
 *
 * Uses DATABASE_URL_UNPOOLED when set (direct connection), otherwise
 * DATABASE_URL. Safe to run repeatedly: already applied migrations are skipped.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from '../../src/server/db/client';
import {
  appliedMigrations,
  describeTarget,
  loadEnvironment,
  migrationDatabaseUrl,
  migrationsFolder,
  readJournal,
} from './_shared';

async function main() {
  loadEnvironment();
  const url = migrationDatabaseUrl();
  const { db, sql } = createDatabase(url, { max: 1 });
  try {
    const journal = await readJournal();
    const before = await appliedMigrations(sql);
    const pending = journal.filter((entry) => !before.includes(entry.when));
    console.log(`Database: ${describeTarget(url)}`);
    console.log(
      `Migrations on disk: ${journal.length}, applied: ${before.length}, pending: ${pending.length}`,
    );
    if (pending.length === 0) {
      console.log('Nothing to do. Schema is up to date.');
      return;
    }
    for (const entry of pending) console.log(`  -> ${entry.tag}`);
    await migrate(db, { migrationsFolder });
    const after = await appliedMigrations(sql);
    console.log(`Done. ${after.length - before.length} migration(s) applied.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
