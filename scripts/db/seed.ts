/**
 * Seeds the database.
 *
 *   pnpm db:seed             Ensures every workspace has the default statuses,
 *                            task types and phases. Safe to run repeatedly.
 *   pnpm db:seed --demo      Also creates a clearly fictional demo account with
 *                            sample workspaces, tasks, time and deliveries.
 *                            Refused with NODE_ENV=production unless --force.
 *
 * Demo credentials: demo@daymark.local / value of DEMO_PASSWORD
 * (default "daymark-demo-2026"). Change or delete the account before exposing
 * an installation publicly.
 */
import { isNull } from 'drizzle-orm';
import { createDatabase } from '../../src/server/db/client';
import { workspaces } from '../../src/server/db/schema';
import { getEnv } from '../../src/server/config/env';
import { createAuth } from '../../src/server/auth/auth';
import { createMailer } from '../../src/server/auth/mail';
import { ensureWorkspaceDefaults } from '../../src/server/modules/workspaces/service';
import { seedDemoData } from '../../src/server/modules/demo/seed';
import { todayIn } from '../../src/lib/dates';
import { describeTarget, hasFlag, loadEnvironment, migrationDatabaseUrl } from './_shared';

async function main() {
  loadEnvironment();
  const url = migrationDatabaseUrl();
  const { db, sql } = createDatabase(url, { max: 2 });
  try {
    console.log(`Database: ${describeTarget(url)}`);
    const rows = await db.select().from(workspaces).where(isNull(workspaces.archivedAt));
    let repaired = 0;
    for (const workspace of rows) {
      const created = await ensureWorkspaceDefaults(db, workspace);
      repaired += created.statuses + created.taskTypes + created.phases;
    }
    console.log(
      `Default configuration checked for ${rows.length} workspace(s)` +
        (repaired ? `; ${repaired} missing default row(s) added.` : '; nothing missing.'),
    );
    console.log('New workspaces receive their defaults automatically when they are created.');

    if (hasFlag('--demo')) {
      if (process.env.NODE_ENV === 'production' && !hasFlag('--force')) {
        throw new Error(
          'Refusing to create demo data with NODE_ENV=production. Pass --force only for throwaway databases.',
        );
      }
      const env = getEnv();
      const auth = createAuth({ db, env, mailer: createMailer(env) });
      const password = process.env.DEMO_PASSWORD || 'daymark-demo-2026';
      const result = await seedDemoData(db, {
        auth,
        today: todayIn(env.DEFAULT_TIMEZONE),
        password,
      });
      if (result.created) {
        console.log(
          `Demo account created: ${result.email} (password from DEMO_PASSWORD or the documented default).`,
        );
      } else {
        console.log(
          `Demo account already exists (${result.email}); nothing changed. Run pnpm db:reset first to recreate it.`,
        );
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
