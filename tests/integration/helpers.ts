import { randomUUID } from 'node:crypto';
import { createDatabase, type DatabaseClient } from '../../src/server/db/client';
import { user, userSettings } from '../../src/server/db/schema';
import { getEnv, resetEnvCache } from '../../src/server/config/env';
import { createAuth, type Auth } from '../../src/server/auth/auth';
import type { Mailer, MailMessage } from '../../src/server/auth/mail/types';
import { createWorkspace } from '../../src/server/modules/workspaces/service';

let handle: ReturnType<typeof createDatabase> | undefined;

export function testDb(): DatabaseClient {
  if (!handle) {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('TEST_DATABASE_URL is not set.');
    handle = createDatabase(url, { max: 4 });
  }
  return handle.db;
}

export async function truncateAll() {
  const db = testDb();
  const tables = await handle!.sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'`;
  if (!tables.length) return;
  const names = tables.map((row) => `"${row.table_name}"`).join(', ');
  await handle!.sql.unsafe(`truncate table ${names} restart identity cascade`);
  void db;
}

export async function closeTestDatabase() {
  await handle?.sql.end({ timeout: 5 });
  handle = undefined;
}

/** Inserts a user directly (no password) for service-level tests. */
export async function createTestUser(name = 'Test User', email?: string) {
  const db = testDb();
  const id = randomUUID();
  const [row] = await db
    .insert(user)
    .values({ id, name, email: email ?? `${id.slice(0, 8)}@example.test`, emailVerified: true })
    .returning();
  await db.insert(userSettings).values({ userId: id, timezone: 'UTC' });
  return row!;
}

export async function createTestWorkspace(
  userId: string,
  name = 'Office',
  kind: 'professional' | 'personal' | 'learning' | 'custom' = 'professional',
) {
  return createWorkspace(testDb(), userId, {
    name,
    description: '',
    kind,
    icon: 'briefcase',
    color: 'accent',
  });
}

/** Captures outgoing emails so auth flows can be verified without a provider. */
export function createCapturingMailer(): Mailer & { messages: MailMessage[] } {
  const messages: MailMessage[] = [];
  return {
    name: 'capture',
    messages,
    async send(message) {
      messages.push(message);
    },
  };
}

export function createTestAuth(mailer: Mailer = createCapturingMailer()): Auth {
  resetEnvCache();
  const env = getEnv();
  return createAuth({ db: testDb(), env, mailer });
}

/** Extracts the first absolute URL from an email body. */
export function firstLink(message: MailMessage): string {
  const match = message.text.match(/https?:\/\/\S+/);
  if (!match) throw new Error('No link found in email.');
  return match[0];
}
