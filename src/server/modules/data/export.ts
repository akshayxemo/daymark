import { randomUUID } from 'node:crypto';
import { eq, getTableColumns } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '@/server/db/client';
import { user, userSettings } from '@/server/db/schema';
import { EXPORT_FORMAT, EXPORT_VERSION, tableSpecs } from './tables';

export type DaymarkExport = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportId: string;
  exportedAt: string;
  account: { name: string; email: string };
  settings: Record<string, unknown> | null;
  data: Record<string, Record<string, unknown>[]>;
};

/**
 * Application-level export of every record the user owns. This is a portable
 * archive for restoring into a Daymark account, not a PostgreSQL backup.
 */
export async function exportUserData(db: DbExecutor, userId: string): Promise<DaymarkExport> {
  const [account] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const data: DaymarkExport['data'] = {};
  for (const spec of tableSpecs) {
    const columns = getTableColumns(spec.table) as Record<string, PgColumn>;
    const owner = columns.userId!;
    const rows = await db.select().from(spec.table).where(eq(owner, userId));
    data[spec.key] = (rows as Record<string, unknown>[]).map(({ userId: _owner, ...rest }) => rest);
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportId: randomUUID(),
    exportedAt: new Date().toISOString(),
    account: { name: account?.name ?? '', email: account?.email ?? '' },
    settings: settings ? (({ userId: _owner, ...rest }) => rest)(settings) : null,
    data,
  };
}
