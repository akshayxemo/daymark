/**
 * Reports which migrations are applied and which are pending without
 * changing anything. Exits with code 1 when migrations are pending so CI and
 * deployment hooks can use it as a check.
 *
 *   pnpm db:status
 */
import postgres from 'postgres';
import {
  appliedMigrations,
  describeTarget,
  loadEnvironment,
  migrationDatabaseUrl,
  readJournal,
} from './_shared';

async function main() {
  loadEnvironment();
  const url = migrationDatabaseUrl();
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const journal = await readJournal();
    const applied = await appliedMigrations(sql);
    console.log(`Database: ${describeTarget(url)}`);
    for (const entry of journal) {
      const state = applied.includes(entry.when) ? 'applied' : 'PENDING';
      console.log(`  [${state.padEnd(7)}] ${entry.tag}`);
    }
    const unknown = applied.filter((marker) => !journal.some((entry) => entry.when === marker));
    if (unknown.length) {
      console.log(
        `  Warning: ${unknown.length} migration(s) recorded in the database are not in ./drizzle.`,
      );
    }
    const pending = journal.filter((entry) => !applied.includes(entry.when)).length;
    console.log(
      pending ? `${pending} migration(s) pending. Run: pnpm db:migrate` : 'Schema is up to date.',
    );
    process.exitCode = pending ? 1 : 0;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('Status check failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
