import { loadEnvConfig } from '@next/env';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

/** Loads .env, .env.local and NODE_ENV-specific files like Next.js does. */
export function loadEnvironment() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
}

export function migrationDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and configure the PostgreSQL connection string.',
    );
  }
  return url;
}

export const migrationsFolder = path.join(process.cwd(), 'drizzle');

export type JournalEntry = { idx: number; when: number; tag: string };

export async function readJournal(): Promise<JournalEntry[]> {
  const raw = await readFile(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8');
  const journal = JSON.parse(raw) as { entries: JournalEntry[] };
  return journal.entries;
}

/** Returns the `created_at` millisecond markers of migrations recorded in the database. */
export async function appliedMigrations(sql: postgres.Sql): Promise<number[]> {
  const exists = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as exists`;
  if (!exists[0]?.exists) return [];
  const rows = await sql<{ created_at: string }[]>`
    select created_at from drizzle.__drizzle_migrations order by created_at asc`;
  return rows.map((row) => Number(row.created_at));
}

export function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}

export function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(host);
  } catch {
    return false;
  }
}

export function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}
