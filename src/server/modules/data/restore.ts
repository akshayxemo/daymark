import { randomUUID } from 'node:crypto';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { q } from '@/server/db/sql';
import type { DbExecutor, Transaction } from '@/server/db/client';
import { localImports, tasks, userSettings, workSessions, workspaces } from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, ValidationError } from '@/server/http/errors';
import { recordActivity, recordAudit } from '../activity/record';
import { EXPORT_FORMAT, EXPORT_VERSION, tableSpecs } from './tables';

const uuid = z.uuid();
const rowSchema = z.record(z.string(), z.unknown());

export const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int().min(1).max(EXPORT_VERSION),
  exportId: uuid,
  exportedAt: z.iso.datetime({ offset: true }),
  data: z.record(z.string(), z.array(rowSchema).max(200000)),
});
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

export type RestoreSummary = Record<string, number>;

/** Validates structure and internal relationships without writing anything. */
export function previewRestore(raw: unknown): {
  envelope: ExportEnvelope;
  summary: RestoreSummary;
} {
  const parsed = exportEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      'This file is not a valid Daymark export.',
      parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  const envelope = parsed.data;
  const ids = new Set<string>();
  const summary: RestoreSummary = {};
  for (const spec of tableSpecs) {
    const rows = envelope.data[spec.key] ?? [];
    summary[spec.key] = spec.exportOnly ? 0 : rows.length;
    if (!spec.id) continue;
    for (const row of rows) {
      const id = row[spec.id];
      if (typeof id !== 'string' || !uuid.safeParse(id).success) {
        throw new ValidationError(`A ${spec.key} record has an invalid identifier.`);
      }
      ids.add(id);
    }
  }
  for (const spec of tableSpecs) {
    if (spec.exportOnly) continue;
    const refs = spec.key === 'tasks' ? [...spec.refs, 'parentTaskId'] : spec.refs;
    for (const row of envelope.data[spec.key] ?? []) {
      for (const column of refs) {
        const value = row[column];
        if (value === null || value === undefined) continue;
        if (typeof value !== 'string' || !ids.has(value)) {
          throw new ValidationError(
            `A ${spec.key} record references ${column} that is not part of this export.`,
          );
        }
      }
    }
  }
  return { envelope, summary };
}

function toInsertRow(
  spec: (typeof tableSpecs)[number],
  row: Record<string, unknown>,
  userId: string,
  map: Map<string, string>,
): Record<string, unknown> {
  const columns = getTableColumns(spec.table) as Record<string, PgColumn>;
  const out: Record<string, unknown> = {};
  for (const [name, column] of Object.entries(columns)) {
    if (name === 'userId') {
      out.userId = userId;
      continue;
    }
    if (!(name in row)) continue;
    let value = row[name];
    if (name === spec.id || spec.refs.includes(name)) {
      value = value === null || value === undefined ? null : map.get(String(value));
    }
    if (value !== null && value !== undefined && column.columnType === 'PgTimestamp') {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime()))
        throw new ValidationError(`Invalid timestamp in ${spec.key}.${name}.`);
      value = date;
    }
    out[name] = value;
  }
  return out;
}

async function insertChunked(
  tx: Transaction,
  spec: (typeof tableSpecs)[number],
  rows: Record<string, unknown>[],
) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    try {
      await tx.insert(spec.table).values(chunk as never);
    } catch (error) {
      const code = (error as { cause?: { code?: string } })?.cause?.code;
      throw new ValidationError(
        `The ${spec.key} records could not be restored${code ? ` (database rule ${code})` : ''}. Nothing was imported.`,
      );
    }
  }
}

/**
 * Restores an export into the signed-in account inside one transaction.
 * Every identifier is replaced, ownership is forced to the current user, and
 * the composite foreign keys therefore guarantee nothing can attach to
 * another account. Importing the same export twice is rejected.
 */
export async function restoreUserData(
  db: DbExecutor,
  userId: string,
  raw: unknown,
): Promise<RestoreSummary> {
  const { envelope, summary } = previewRestore(raw);
  return withTransaction(db, async (tx) => {
    const fingerprint = `export:${envelope.exportId}`;
    const [already] = await tx
      .select({ id: localImports.id })
      .from(localImports)
      .where(and(eq(localImports.userId, userId), eq(localImports.fingerprint, fingerprint)))
      .limit(1);
    if (already)
      throw new ConflictError('This export has already been imported into your account.');

    // Fresh identifiers for every row, decided up front so references resolve in any order.
    const map = new Map<string, string>();
    for (const spec of tableSpecs) {
      if (!spec.id || spec.exportOnly) continue;
      for (const row of envelope.data[spec.key] ?? []) map.set(String(row[spec.id]), randomUUID());
    }

    const data = structuredClone(envelope.data);

    // Workspace slugs are unique per user: rename clashes instead of failing.
    const existing = await tx
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.userId, userId));
    const taken = new Set(existing.map((row) => row.slug));
    for (const row of data.workspaces ?? []) {
      let slug = String(row.slug ?? 'workspace');
      if (taken.has(slug)) {
        let i = 2;
        while (taken.has(`${slug}-imported-${i}`)) i += 1;
        slug = `${slug}-imported-${i}`;
        row.name = `${row.name} (imported)`;
      }
      taken.add(slug);
      row.slug = slug;
      if (existing.length) row.isDefault = false;
    }

    // Task numbers are unique per user: allocate a fresh block.
    const taskRows = data.tasks ?? [];
    const [settings] = await tx
      .update(userSettings)
      .set({ nextTaskNumber: sql`${userSettings.nextTaskNumber} + ${taskRows.length}` })
      .where(eq(userSettings.userId, userId))
      .returning({ next: userSettings.nextTaskNumber });
    let number = (settings?.next ?? taskRows.length + 1) - taskRows.length;
    const parents: [string, string][] = [];
    for (const row of [...taskRows].sort((a, b) => Number(a.taskNumber) - Number(b.taskNumber))) {
      row.taskNumber = number++;
      if (row.parentTaskId)
        parents.push([map.get(String(row.id))!, map.get(String(row.parentTaskId))!]);
      row.parentTaskId = null;
    }

    // Only one active timer per user: imported running or paused sessions are closed.
    for (const row of data.workSessions ?? []) {
      if (row.status === 'running' || row.status === 'paused') {
        row.status = 'completed';
        row.endedAt = row.endedAt ?? envelope.exportedAt;
      }
    }
    for (const row of data.workSessionIntervals ?? []) {
      if (!row.endedAt) row.endedAt = envelope.exportedAt;
    }

    for (const spec of tableSpecs) {
      if (spec.exportOnly) continue;
      const rows = (data[spec.key] ?? []).map((row) => toInsertRow(spec, row, userId, map));
      if (rows.length) await insertChunked(tx, spec, rows);
    }
    for (const [childId, parentId] of parents) {
      await tx
        .update(tasks)
        .set({ parentTaskId: parentId })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, childId)));
    }
    // Sessions that were still running at export time get their duration from the intervals.
    const reopened = (data.workSessions ?? [])
      .filter((row) => Number(row.durationSeconds) === 0)
      .map((row) => map.get(String(row.id))!);
    if (reopened.length) {
      await tx
        .update(workSessions)
        .set({
          durationSeconds: sql`coalesce((select sum(extract(epoch from (i.ended_at - i.started_at)))::int from work_session_intervals i where i.session_id = ${q(workSessions.id)}), 0)`,
        })
        .where(and(eq(workSessions.userId, userId), inArray(workSessions.id, reopened)));
    }

    await tx.insert(localImports).values({ userId, fingerprint, summary });
    await recordAudit(tx, {
      userId,
      action: 'data.imported',
      entityType: 'account',
      after: { exportId: envelope.exportId, summary },
    });
    await recordActivity(tx, {
      userId,
      eventType: 'data.imported',
      entityType: 'account',
      summary: `Data restored from an export · ${summary.tasks ?? 0} tasks, ${summary.workspaces ?? 0} workspaces`,
      detail: `Exported ${envelope.exportedAt.slice(0, 10)}`,
    });
    return summary;
  });
}
