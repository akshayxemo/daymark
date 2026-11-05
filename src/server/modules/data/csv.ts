import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import type { DbExecutor } from '@/server/db/client';
import {
  activityEvents,
  deliveryRecords,
  projects,
  repositories,
  taskPhases,
  taskStatuses,
  taskTypes,
  tasks,
  workspaces,
} from '@/server/db/schema';
import { localDay } from '@/server/db/sql';
import { listTimeRecords } from '../time/service';

/**
 * Quotes a value for CSV and neutralises spreadsheet formula injection by
 * prefixing cells that start with =, +, -, @, tab or carriage return.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export type CsvType = 'tasks' | 'time' | 'deliveries' | 'activity';

export async function exportCsv(
  db: DbExecutor,
  userId: string,
  type: CsvType,
  options: { from?: string; to?: string; timezone: string },
): Promise<string> {
  switch (type) {
    case 'tasks': {
      const rows = await db
        .select({
          number: tasks.taskNumber,
          title: tasks.title,
          workspace: workspaces.name,
          project: projects.name,
          type: taskTypes.name,
          status: taskStatuses.name,
          phase: taskPhases.name,
          priority: tasks.priority,
          estimate: tasks.estimatedMinutes,
          planned: tasks.plannedDate,
          due: tasks.dueDate,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          archivedAt: tasks.archivedAt,
        })
        .from(tasks)
        .innerJoin(workspaces, eq(workspaces.id, tasks.workspaceId))
        .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
        .innerJoin(taskTypes, eq(taskTypes.id, tasks.taskTypeId))
        .leftJoin(projects, eq(projects.id, tasks.projectId))
        .leftJoin(taskPhases, eq(taskPhases.id, tasks.phaseId))
        .where(eq(tasks.userId, userId))
        .orderBy(asc(tasks.taskNumber));
      return toCsv(
        [
          'Reference',
          'Title',
          'Workspace',
          'Project',
          'Type',
          'Status',
          'Phase',
          'Priority',
          'Estimate (min)',
          'Planned',
          'Due',
          'Completed at',
          'Created at',
          'Archived at',
        ],
        rows.map((r) => [
          `DM-${r.number}`,
          r.title,
          r.workspace,
          r.project,
          r.type,
          r.status,
          r.phase,
          r.priority,
          r.estimate,
          r.planned,
          r.due,
          r.completedAt,
          r.createdAt,
          r.archivedAt,
        ]),
      );
    }
    case 'time': {
      const records = await listTimeRecords(
        db,
        userId,
        { from: options.from, to: options.to, limit: 100000, offset: 0 },
        options.timezone,
      );
      return toCsv(
        [
          'Date',
          'Kind',
          'Task',
          'Title',
          'Project',
          'Phase',
          'Started at',
          'Ended at',
          'Minutes',
          'Description',
        ],
        records.map((r) => [
          r.workDate,
          r.kind,
          `DM-${r.taskNumber}`,
          r.taskTitle,
          r.projectName,
          r.phaseName,
          r.startedAt,
          r.endedAt,
          Math.round(r.durationSeconds / 60),
          r.description,
        ]),
      );
    }
    case 'deliveries': {
      const rows = await db
        .select({
          deliveredAt: deliveryRecords.deliveredAt,
          type: deliveryRecords.deliveryType,
          environment: deliveryRecords.environment,
          status: deliveryRecords.deliveryStatus,
          number: tasks.taskNumber,
          title: tasks.title,
          repository: repositories.name,
          branch: deliveryRecords.branchName,
          version: deliveryRecords.version,
          url: deliveryRecords.referenceUrl,
          notes: deliveryRecords.notes,
        })
        .from(deliveryRecords)
        .innerJoin(tasks, eq(tasks.id, deliveryRecords.taskId))
        .leftJoin(repositories, eq(repositories.id, deliveryRecords.repositoryId))
        .where(eq(deliveryRecords.userId, userId))
        .orderBy(desc(deliveryRecords.deliveredAt));
      return toCsv(
        [
          'Delivered at',
          'Type',
          'Environment',
          'Outcome',
          'Task',
          'Title',
          'Repository',
          'Branch',
          'Version',
          'Link',
          'Notes',
        ],
        rows.map((r) => [
          r.deliveredAt,
          r.type,
          r.environment,
          r.status,
          `DM-${r.number}`,
          r.title,
          r.repository,
          r.branch,
          r.version,
          r.url,
          r.notes,
        ]),
      );
    }
    case 'activity': {
      const day = localDay(activityEvents.occurredAt, options.timezone);
      const conditions = [eq(activityEvents.userId, userId)];
      if (options.from) conditions.push(gte(day, options.from));
      if (options.to) conditions.push(lte(day, options.to));
      const rows = await db
        .select({
          occurredAt: activityEvents.occurredAt,
          type: activityEvents.eventType,
          summary: activityEvents.summary,
          detail: activityEvents.detail,
          workspace: workspaces.name,
        })
        .from(activityEvents)
        .leftJoin(
          workspaces,
          and(eq(workspaces.id, activityEvents.workspaceId), isNull(workspaces.archivedAt)),
        )
        .where(and(...conditions))
        .orderBy(desc(activityEvents.occurredAt))
        .limit(100000);
      return toCsv(
        ['Occurred at', 'Event', 'Summary', 'Detail', 'Workspace'],
        rows.map((r) => [r.occurredAt, r.type, r.summary, r.detail, r.workspace]),
      );
    }
  }
}
