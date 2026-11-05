import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { q } from '@/server/db/sql';
import type { DbExecutor, Transaction } from '@/server/db/client';
import {
  activityEvents,
  deliveryRecords,
  developmentReferences,
  projects,
  repositories,
  tags,
  taskDependencies,
  taskPhaseHistory,
  taskPhases,
  taskPlans,
  taskRepositories,
  taskStatusHistory,
  taskStatuses,
  taskTags,
  taskTypes,
  tasks,
  timeEntries,
  workSessions,
} from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '@/server/http/errors';
import type {
  CarryOverInput,
  ChangePhaseInput,
  ChangeStatusInput,
  CreateTaskInput,
  ListTasksQuery,
  PlanTaskInput,
  UpdateTaskInput,
} from '@/lib/validation/tasks';
import { recordActivity, recordAudit } from '../activity/record';
import { stopActiveSessionForTask } from '../time/engine';
import { nextTaskNumber } from '../users/service';
import { getWorkspace, getWorkspaceConfiguration } from '../workspaces/service';

export type TaskRow = typeof tasks.$inferSelect;
export type TagRef = { id: string; name: string; color: string | null };
export type StatusRef = {
  id: string;
  name: string;
  key: string | null;
  category: string;
  color: string | null;
  isInitial: boolean;
  isTerminal: boolean;
  isActive: boolean;
  countsAsCompleted: boolean;
  stopsTimer: boolean;
};

export type TaskSummary = {
  id: string;
  taskNumber: number;
  reference: string;
  title: string;
  description: string;
  workspaceId: string;
  projectId: string | null;
  projectName: string | null;
  parentTaskId: string | null;
  taskTypeId: string;
  taskTypeName: string;
  statusId: string;
  status: StatusRef;
  phaseId: string | null;
  phaseName: string | null;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number | null;
  plannedDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
  subtaskCount: number;
  completedSubtaskCount: number;
};

export function taskReference(taskNumber: number): string {
  return `DM-${taskNumber}`;
}

/* ------------------------------------------------------------------ */
/* Shared selection                                                    */
/* ------------------------------------------------------------------ */

const tagsJson = sql<
  TagRef[]
>`coalesce((select json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) order by t.name) from task_tags tt join tags t on t.id = tt.tag_id where tt.task_id = ${q(tasks.id)}), '[]'::json)`;
const subtaskCount = sql<number>`(select count(*)::int from tasks c where c.parent_task_id = ${q(tasks.id)} and c.archived_at is null)`;
const completedSubtaskCount = sql<number>`(select count(*)::int from tasks c join task_statuses s on s.id = c.status_id where c.parent_task_id = ${q(tasks.id)} and c.archived_at is null and s.counts_as_completed)`;

function summaryQuery(db: DbExecutor) {
  return db
    .select({
      task: tasks,
      status: {
        id: taskStatuses.id,
        name: taskStatuses.name,
        key: taskStatuses.key,
        category: taskStatuses.category,
        color: taskStatuses.color,
        isInitial: taskStatuses.isInitial,
        isTerminal: taskStatuses.isTerminal,
        isActive: taskStatuses.isActive,
        countsAsCompleted: taskStatuses.countsAsCompleted,
        stopsTimer: taskStatuses.stopsTimer,
      },
      phaseName: taskPhases.name,
      taskTypeName: taskTypes.name,
      projectName: projects.name,
      tags: tagsJson,
      subtaskCount,
      completedSubtaskCount,
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .innerJoin(taskTypes, eq(tasks.taskTypeId, taskTypes.id))
    .leftJoin(taskPhases, eq(tasks.phaseId, taskPhases.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id));
}

type SummaryRow = Awaited<ReturnType<ReturnType<typeof summaryQuery>['execute']>>[number];

function toSummary(row: SummaryRow): TaskSummary {
  const task = row.task;
  return {
    id: task.id,
    taskNumber: task.taskNumber,
    reference: taskReference(task.taskNumber),
    title: task.title,
    description: task.description,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    projectName: row.projectName,
    parentTaskId: task.parentTaskId,
    taskTypeId: task.taskTypeId,
    taskTypeName: row.taskTypeName,
    statusId: task.statusId,
    status: row.status,
    phaseId: task.phaseId,
    phaseName: row.phaseName,
    priority: task.priority as TaskSummary['priority'],
    estimatedMinutes: task.estimatedMinutes,
    plannedDate: task.plannedDate,
    dueDate: task.dueDate,
    completedAt: task.completedAt?.toISOString() ?? null,
    position: task.position,
    archivedAt: task.archivedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    tags: row.tags ?? [],
    subtaskCount: row.subtaskCount,
    completedSubtaskCount: row.completedSubtaskCount,
  };
}

export async function getTaskSummary(
  db: DbExecutor,
  userId: string,
  taskId: string,
): Promise<TaskSummary> {
  const [row] = await summaryQuery(db)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .limit(1);
  if (!row) throw new NotFoundError('Task not found.');
  return toSummary(row);
}

export async function getTaskRow(db: DbExecutor, userId: string, taskId: string): Promise<TaskRow> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .limit(1);
  if (!row) throw new NotFoundError('Task not found.');
  return row;
}

async function lockTask(tx: Transaction, userId: string, taskId: string): Promise<TaskRow> {
  const [row] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .for('update');
  if (!row) throw new NotFoundError('Task not found.');
  return row;
}

async function statusById(db: DbExecutor, workspaceId: string, statusId: string) {
  const [row] = await db
    .select()
    .from(taskStatuses)
    .where(and(eq(taskStatuses.workspaceId, workspaceId), eq(taskStatuses.id, statusId)))
    .limit(1);
  return row ?? null;
}

async function assertProjectInWorkspace(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  projectId: string,
) {
  const [row] = await db
    .select({ id: projects.id, archivedAt: projects.archivedAt })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new ValidationError('The project does not belong to this workspace.', [
      { path: 'projectId', message: 'Choose a project from the same workspace.' },
    ]);
  }
}

async function assertParentInWorkspace(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  parentTaskId: string,
  selfId?: string,
) {
  if (selfId && parentTaskId === selfId) {
    throw new ValidationError('A task cannot be its own parent.', [
      { path: 'parentTaskId', message: 'Choose another task.' },
    ]);
  }
  const [row] = await db
    .select({ id: tasks.id, parentTaskId: tasks.parentTaskId })
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), eq(tasks.workspaceId, workspaceId), eq(tasks.id, parentTaskId)),
    )
    .limit(1);
  if (!row) {
    throw new ValidationError('The parent task does not belong to this workspace.', [
      { path: 'parentTaskId', message: 'Choose a task from the same workspace.' },
    ]);
  }
  if (selfId) {
    // Walk up the chain to make sure the new parent is not a descendant of this task.
    let cursor = row.parentTaskId;
    let guard = 0;
    while (cursor && guard < 100) {
      if (cursor === selfId) {
        throw new ValidationError('That would create a loop in the subtask hierarchy.', [
          { path: 'parentTaskId', message: 'Choose another task.' },
        ]);
      }
      const [next] = await db
        .select({ parentTaskId: tasks.parentTaskId })
        .from(tasks)
        .where(eq(tasks.id, cursor))
        .limit(1);
      cursor = next?.parentTaskId ?? null;
      guard += 1;
    }
  }
}

async function assertTagsInWorkspace(db: DbExecutor, workspaceId: string, tagIds: string[]) {
  if (!tagIds.length) return;
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.workspaceId, workspaceId), inArray(tags.id, tagIds)));
  if (rows.length !== new Set(tagIds).size) {
    throw new ValidationError('Some tags do not belong to this workspace.', [
      { path: 'tagIds', message: 'Use tags from the same workspace.' },
    ]);
  }
}

async function replaceTags(tx: Transaction, userId: string, task: TaskRow, tagIds: string[]) {
  await assertTagsInWorkspace(tx, task.workspaceId, tagIds);
  await tx.delete(taskTags).where(eq(taskTags.taskId, task.id));
  const unique = [...new Set(tagIds)];
  if (unique.length) {
    await tx
      .insert(taskTags)
      .values(
        unique.map((tagId) => ({ userId, workspaceId: task.workspaceId, taskId: task.id, tagId })),
      );
  }
}

/* ------------------------------------------------------------------ */
/* Listing and search                                                  */
/* ------------------------------------------------------------------ */

export async function listTasks(
  db: DbExecutor,
  userId: string,
  query: ListTasksQuery,
): Promise<{ items: TaskSummary[]; total: number }> {
  const conditions: SQL[] = [eq(tasks.userId, userId)];
  if (query.workspaceId) conditions.push(eq(tasks.workspaceId, query.workspaceId));
  if (query.projectId) conditions.push(eq(tasks.projectId, query.projectId));
  if (query.parentTaskId) conditions.push(eq(tasks.parentTaskId, query.parentTaskId));
  if (query.topLevelOnly) conditions.push(isNull(tasks.parentTaskId));
  if (query.statusId) conditions.push(eq(tasks.statusId, query.statusId));
  if (query.statusCategory) conditions.push(eq(taskStatuses.category, query.statusCategory));
  if (query.phaseId) conditions.push(eq(tasks.phaseId, query.phaseId));
  if (query.priority) conditions.push(eq(tasks.priority, query.priority));
  if (query.tagId) {
    conditions.push(
      sql`exists (select 1 from ${taskTags} where ${q(taskTags.taskId)} = ${q(tasks.id)} and ${q(taskTags.tagId)} = ${query.tagId})`,
    );
  }
  if (query.search) {
    const term = `%${query.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const numeric = query.search.match(/^(?:dm-)?(\d+)$/i);
    const parts: SQL[] = [ilike(tasks.title, term), ilike(tasks.description, term)];
    if (numeric) parts.push(eq(tasks.taskNumber, Number(numeric[1])));
    conditions.push(or(...parts)!);
  }
  if (query.plannedFrom) conditions.push(gte(tasks.plannedDate, query.plannedFrom));
  if (query.plannedTo) conditions.push(lte(tasks.plannedDate, query.plannedTo));
  if (query.dueFrom) conditions.push(gte(tasks.dueDate, query.dueFrom));
  if (query.dueTo) conditions.push(lte(tasks.dueDate, query.dueTo));
  if (query.completed === true) conditions.push(eq(taskStatuses.countsAsCompleted, true));
  if (query.completed === false) conditions.push(eq(taskStatuses.countsAsCompleted, false));
  if (!query.includeArchived) conditions.push(isNull(tasks.archivedAt));

  const direction = query.order === 'asc' ? asc : desc;
  const orderBy = (() => {
    switch (query.sort) {
      case 'created':
        return [direction(tasks.createdAt)];
      case 'planned':
        return [direction(tasks.plannedDate), direction(tasks.position), desc(tasks.createdAt)];
      case 'due':
        return [direction(tasks.dueDate), desc(tasks.createdAt)];
      case 'priority':
        return [
          direction(sql`case ${tasks.priority} when 'high' then 3 when 'medium' then 2 else 1 end`),
          desc(tasks.updatedAt),
        ];
      case 'title':
        return [direction(tasks.title)];
      case 'number':
        return [direction(tasks.taskNumber)];
      default:
        return [direction(tasks.updatedAt)];
    }
  })();

  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    summaryQuery(db)
      .where(where)
      .orderBy(...orderBy)
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
      .where(where),
  ]);
  return { items: rows.map(toSummary), total };
}

/** Tasks planned for a specific date (daily planner / "My day"). */
export async function tasksPlannedOn(
  db: DbExecutor,
  userId: string,
  date: string,
  workspaceId?: string,
) {
  const conditions = [
    eq(tasks.userId, userId),
    eq(tasks.plannedDate, date),
    isNull(tasks.archivedAt),
  ];
  if (workspaceId) conditions.push(eq(tasks.workspaceId, workspaceId));
  const rows = await summaryQuery(db)
    .where(and(...conditions))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
  return rows.map(toSummary);
}

/* ------------------------------------------------------------------ */
/* Create / update                                                     */
/* ------------------------------------------------------------------ */

export async function createTask(
  db: DbExecutor,
  userId: string,
  input: CreateTaskInput,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const workspace = await getWorkspace(tx, userId, input.workspaceId);
    if (workspace.archivedAt)
      throw new ConflictError('This workspace is archived. Restore it to add tasks.');
    const config = await getWorkspaceConfiguration(tx, userId, workspace.id);

    const type = input.taskTypeId
      ? config.taskTypes.find((row) => row.id === input.taskTypeId)
      : (config.taskTypes.find((row) => row.isDefault) ?? config.taskTypes[0]);
    if (!type) {
      throw new ValidationError('Task type not found in this workspace.', [
        { path: 'taskTypeId', message: 'Choose a task type from this workspace.' },
      ]);
    }
    const initial = config.statuses.find((row) => row.isInitial) ?? config.statuses[0];
    const status = input.statusId
      ? config.statuses.find((row) => row.id === input.statusId)
      : input.plannedDate
        ? (config.statuses.find((row) => row.key === 'planned') ?? initial)
        : initial;
    if (!status) {
      throw new ValidationError('Status not found in this workspace.', [
        { path: 'statusId', message: 'Choose a status from this workspace.' },
      ]);
    }
    const phase = input.phaseId ? config.phases.find((row) => row.id === input.phaseId) : undefined;
    if (input.phaseId && !phase) {
      throw new ValidationError('Phase not found in this workspace.', [
        { path: 'phaseId', message: 'Choose a phase from this workspace.' },
      ]);
    }
    if (input.projectId) await assertProjectInWorkspace(tx, userId, workspace.id, input.projectId);
    if (input.parentTaskId)
      await assertParentInWorkspace(tx, userId, workspace.id, input.parentTaskId);

    const taskNumber = await nextTaskNumber(tx, userId);
    const now = new Date();
    const [task] = await tx
      .insert(tasks)
      .values({
        userId,
        workspaceId: workspace.id,
        projectId: input.projectId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        taskTypeId: type.id,
        statusId: status.id,
        phaseId: phase?.id ?? null,
        taskNumber,
        title: input.title,
        description: input.description ?? '',
        priority: input.priority ?? 'medium',
        estimatedMinutes: input.estimatedMinutes ?? null,
        plannedDate: input.plannedDate ?? null,
        dueDate: input.dueDate ?? null,
        completedAt: status.countsAsCompleted ? now : null,
      })
      .returning();

    if (input.plannedDate) {
      await tx.insert(taskPlans).values({
        userId,
        taskId: task!.id,
        plannedDate: input.plannedDate,
        plannedMinutes: input.estimatedMinutes ?? null,
        reason: 'initial',
      });
    }
    await tx.insert(taskStatusHistory).values({
      userId,
      taskId: task!.id,
      previousStatusId: null,
      previousStatusName: null,
      newStatusId: status.id,
      newStatusName: status.name,
      changedAt: now,
    });
    if (phase) {
      await tx.insert(taskPhaseHistory).values({
        userId,
        taskId: task!.id,
        previousPhaseId: null,
        previousPhaseName: null,
        newPhaseId: phase.id,
        newPhaseName: phase.name,
        changedAt: now,
      });
    }
    if (input.tagIds?.length) await replaceTags(tx, userId, task!, input.tagIds);
    await recordActivity(tx, {
      userId,
      workspaceId: workspace.id,
      taskId: task!.id,
      projectId: task!.projectId,
      eventType: 'task.created',
      entityType: 'task',
      entityId: task!.id,
      summary: `Task created: ${task!.title}`,
      detail: `${taskReference(taskNumber)} · ${status.name}`,
      metadata: { statusId: status.id, plannedDate: input.plannedDate ?? null },
      occurredAt: now,
    });
    return getTaskSummary(tx, userId, task!.id);
  });
}

export async function updateTask(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before editing it.');
    if (input.projectId)
      await assertProjectInWorkspace(tx, userId, task.workspaceId, input.projectId);
    if (input.parentTaskId)
      await assertParentInWorkspace(tx, userId, task.workspaceId, input.parentTaskId, task.id);
    if (input.taskTypeId) {
      const [type] = await tx
        .select({ id: taskTypes.id })
        .from(taskTypes)
        .where(and(eq(taskTypes.workspaceId, task.workspaceId), eq(taskTypes.id, input.taskTypeId)))
        .limit(1);
      if (!type) {
        throw new ValidationError('Task type not found in this workspace.', [
          { path: 'taskTypeId', message: 'Choose a task type from this workspace.' },
        ]);
      }
    }

    const next = {
      title: input.title ?? task.title,
      description: input.description ?? task.description,
      projectId: input.projectId === undefined ? task.projectId : input.projectId,
      parentTaskId: input.parentTaskId === undefined ? task.parentTaskId : input.parentTaskId,
      taskTypeId: input.taskTypeId ?? task.taskTypeId,
      priority: input.priority ?? task.priority,
      estimatedMinutes:
        input.estimatedMinutes === undefined ? task.estimatedMinutes : input.estimatedMinutes,
      dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
      position: input.position ?? task.position,
    };
    await tx
      .update(tasks)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(tasks.id, task.id));
    if (input.tagIds) await replaceTags(tx, userId, task, input.tagIds);

    const events: {
      eventType: string;
      summary: string;
      detail?: string;
      metadata?: Record<string, unknown>;
    }[] = [];
    if (next.priority !== task.priority) {
      events.push({
        eventType: 'task.priority_changed',
        summary: `Priority changed to ${next.priority}`,
        detail: `${task.title} · was ${task.priority}`,
        metadata: { previous: task.priority, next: next.priority },
      });
    }
    if (next.dueDate !== task.dueDate) {
      events.push({
        eventType: 'task.deadline_changed',
        summary: next.dueDate ? `Due date set to ${next.dueDate}` : 'Due date removed',
        detail: `${task.title}${task.dueDate ? ` · was ${task.dueDate}` : ''}`,
        metadata: { previous: task.dueDate, next: next.dueDate },
      });
    }
    if (next.projectId !== task.projectId) {
      const names = await tx
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(
          inArray(
            projects.id,
            [task.projectId, next.projectId].filter((id): id is string => Boolean(id)),
          ),
        );
      const nameOf = (id: string | null) =>
        names.find((row) => row.id === id)?.name ?? 'No project';
      events.push({
        eventType: 'task.project_changed',
        summary: `Project changed from ${nameOf(task.projectId)} to ${nameOf(next.projectId)}`,
        detail: task.title,
        metadata: { previous: task.projectId, next: next.projectId },
      });
    }
    const otherChanges =
      next.title !== task.title ||
      next.description !== task.description ||
      next.estimatedMinutes !== task.estimatedMinutes ||
      next.taskTypeId !== task.taskTypeId ||
      next.parentTaskId !== task.parentTaskId ||
      Boolean(input.tagIds);
    if (otherChanges && events.length === 0) {
      events.push({
        eventType: 'task.updated',
        summary: 'Task details updated',
        detail: next.title,
      });
    }
    for (const event of events) {
      await recordActivity(tx, {
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        projectId: next.projectId,
        entityType: 'task',
        entityId: task.id,
        ...event,
      });
    }
    return getTaskSummary(tx, userId, task.id);
  });
}

/* ------------------------------------------------------------------ */
/* Lifecycle: status, phase, planning                                  */
/* ------------------------------------------------------------------ */

/**
 * The task lifecycle transaction: validate, read the previous state, update,
 * write history, write the activity event, audit when applicable, stop the
 * timer when required, and commit everything or nothing.
 */
export async function changeTaskStatus(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: ChangeStatusInput,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before changing its status.');
    const status = await statusById(tx, task.workspaceId, input.statusId);
    if (!status || status.archivedAt) {
      throw new ValidationError('Status not found in this workspace.', [
        { path: 'statusId', message: 'Choose a status from this workspace.' },
      ]);
    }
    if (status.id === task.statusId) return getTaskSummary(tx, userId, task.id);
    const previous = await statusById(tx, task.workspaceId, task.statusId);
    const now = new Date();
    const completedAt = status.countsAsCompleted ? (task.completedAt ?? now) : null;

    await tx
      .update(tasks)
      .set({ statusId: status.id, completedAt, updatedAt: now })
      .where(eq(tasks.id, task.id));
    await tx.insert(taskStatusHistory).values({
      userId,
      taskId: task.id,
      previousStatusId: previous?.id ?? null,
      previousStatusName: previous?.name ?? null,
      newStatusId: status.id,
      newStatusName: status.name,
      reason: input.reason ?? null,
      changedAt: now,
    });
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.status_changed',
      entityType: 'task',
      entityId: task.id,
      summary: `${task.title} → ${status.name}`,
      detail: input.reason ?? (previous ? `was ${previous.name}` : ''),
      metadata: {
        previousStatusId: previous?.id ?? null,
        previousStatusName: previous?.name ?? null,
        newStatusId: status.id,
        newStatusName: status.name,
      },
      occurredAt: now,
    });
    if (status.countsAsCompleted && !previous?.countsAsCompleted) {
      await recordActivity(tx, {
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        projectId: task.projectId,
        eventType: 'task.completed',
        entityType: 'task',
        entityId: task.id,
        summary: `Task completed: ${task.title}`,
        detail: taskReference(task.taskNumber),
        occurredAt: now,
      });
    }
    if (previous?.isTerminal && !status.isTerminal) {
      await recordAudit(tx, {
        userId,
        action: 'task.reopened',
        entityType: 'task',
        entityId: task.id,
        before: { statusId: previous.id, statusName: previous.name, completedAt: task.completedAt },
        after: { statusId: status.id, statusName: status.name, completedAt },
      });
    }
    if (status.stopsTimer) {
      await stopActiveSessionForTask(tx, userId, task.id, {
        taskTitle: task.title,
        workspaceId: task.workspaceId,
        reason: `Status changed to ${status.name}`,
      });
    }
    return getTaskSummary(tx, userId, task.id);
  });
}

export async function changeTaskPhase(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: ChangePhaseInput,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before changing its phase.');
    let phase: typeof taskPhases.$inferSelect | null = null;
    if (input.phaseId) {
      const [row] = await tx
        .select()
        .from(taskPhases)
        .where(and(eq(taskPhases.workspaceId, task.workspaceId), eq(taskPhases.id, input.phaseId)))
        .limit(1);
      if (!row || row.archivedAt) {
        throw new ValidationError('Phase not found in this workspace.', [
          { path: 'phaseId', message: 'Choose a phase from this workspace.' },
        ]);
      }
      phase = row;
    }
    if ((phase?.id ?? null) === task.phaseId) return getTaskSummary(tx, userId, task.id);
    const [previous] = task.phaseId
      ? await tx.select().from(taskPhases).where(eq(taskPhases.id, task.phaseId)).limit(1)
      : [null];
    const now = new Date();
    await tx
      .update(tasks)
      .set({ phaseId: phase?.id ?? null, updatedAt: now })
      .where(eq(tasks.id, task.id));
    await tx.insert(taskPhaseHistory).values({
      userId,
      taskId: task.id,
      previousPhaseId: previous?.id ?? null,
      previousPhaseName: previous?.name ?? null,
      newPhaseId: phase?.id ?? null,
      newPhaseName: phase?.name ?? null,
      notes: input.notes ?? null,
      changedAt: now,
    });
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.phase_changed',
      entityType: 'task',
      entityId: task.id,
      summary: phase ? `Phase changed to ${phase.name}` : 'Phase cleared',
      detail: `${task.title}${previous ? ` · was ${previous.name}` : ''}${input.notes ? ` · ${input.notes}` : ''}`,
      metadata: {
        previousPhaseId: previous?.id ?? null,
        previousPhaseName: previous?.name ?? null,
        newPhaseId: phase?.id ?? null,
        newPhaseName: phase?.name ?? null,
      },
      occurredAt: now,
    });
    return getTaskSummary(tx, userId, task.id);
  });
}

/** Records a planning decision without erasing earlier plans. */
export async function planTask(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: PlanTaskInput,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before planning it.');
    if (task.plannedDate === input.plannedDate && input.plannedMinutes === undefined) {
      return getTaskSummary(tx, userId, task.id);
    }
    const reason =
      input.plannedDate === null
        ? 'unplanned'
        : (input.reason ?? (task.plannedDate ? 'moved' : 'initial'));
    const now = new Date();
    await tx
      .update(tasks)
      .set({ plannedDate: input.plannedDate, updatedAt: now })
      .where(eq(tasks.id, task.id));
    await tx.insert(taskPlans).values({
      userId,
      taskId: task.id,
      plannedDate: input.plannedDate,
      previousPlannedDate: task.plannedDate,
      plannedMinutes:
        input.plannedMinutes === undefined ? task.estimatedMinutes : input.plannedMinutes,
      reason,
      createdAt: now,
    });
    const eventType =
      reason === 'carryover'
        ? 'task.carried_over'
        : reason === 'unplanned'
          ? 'task.unplanned'
          : 'task.planned';
    const summary =
      reason === 'unplanned'
        ? `Removed from the plan${task.plannedDate ? ` for ${task.plannedDate}` : ''}`
        : task.plannedDate
          ? `${reason === 'carryover' ? 'Carried over' : 'Moved'} from ${task.plannedDate} to ${input.plannedDate}`
          : `Planned for ${input.plannedDate}`;
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType,
      entityType: 'task',
      entityId: task.id,
      summary,
      detail: task.title,
      metadata: { previousPlannedDate: task.plannedDate, plannedDate: input.plannedDate, reason },
      occurredAt: now,
    });
    return getTaskSummary(tx, userId, task.id);
  });
}

export async function carryOverTasks(db: DbExecutor, userId: string, input: CarryOverInput) {
  if (input.toDate <= input.fromDate) {
    throw new ValidationError('Carry tasks forward to a later date.', [
      { path: 'toDate', message: 'Must be after the original date.' },
    ]);
  }
  const conditions = [
    eq(tasks.userId, userId),
    eq(tasks.plannedDate, input.fromDate),
    isNull(tasks.archivedAt),
    eq(taskStatuses.countsAsCompleted, false),
    eq(taskStatuses.isTerminal, false),
  ];
  if (input.workspaceId) conditions.push(eq(tasks.workspaceId, input.workspaceId));
  if (input.taskIds?.length) conditions.push(inArray(tasks.id, input.taskIds));
  const candidates = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(and(...conditions));
  const moved: string[] = [];
  for (const candidate of candidates) {
    await planTask(db, userId, candidate.id, { plannedDate: input.toDate, reason: 'carryover' });
    moved.push(candidate.id);
  }
  return { moved: moved.length, taskIds: moved };
}

export async function setTaskArchived(
  db: DbExecutor,
  userId: string,
  taskId: string,
  archived: boolean,
) {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    if (Boolean(task.archivedAt) === archived) return getTaskSummary(tx, userId, task.id);
    await tx
      .update(tasks)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(tasks.id, task.id));
    if (archived) {
      await stopActiveSessionForTask(tx, userId, task.id, {
        taskTitle: task.title,
        workspaceId: task.workspaceId,
        reason: 'Task archived',
      });
    }
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: archived ? 'task.archived' : 'task.restored',
      entityType: 'task',
      entityId: task.id,
      summary: `Task ${archived ? 'archived' : 'restored'}: ${task.title}`,
      detail: archived ? 'History, time and references were kept.' : '',
    });
    return getTaskSummary(tx, userId, task.id);
  });
}

export async function duplicateTask(
  db: DbExecutor,
  userId: string,
  taskId: string,
): Promise<TaskSummary> {
  return withTransaction(db, async (tx) => {
    const source = await getTaskSummary(tx, userId, taskId);
    return createTask(tx, userId, {
      workspaceId: source.workspaceId,
      title: `Copy of ${source.title}`.slice(0, 200),
      description: source.description,
      projectId: source.projectId,
      parentTaskId: source.parentTaskId,
      taskTypeId: source.taskTypeId,
      priority: source.priority,
      estimatedMinutes: source.estimatedMinutes,
      dueDate: source.dueDate,
      tagIds: source.tags.map((tag) => tag.id),
    });
  });
}

/* ------------------------------------------------------------------ */
/* Dependencies                                                        */
/* ------------------------------------------------------------------ */

export async function addDependency(
  db: DbExecutor,
  userId: string,
  taskId: string,
  dependsOnTaskId: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    const other = await getTaskRow(tx, userId, dependsOnTaskId);
    if (task.id === other.id) throw new ValidationError('A task cannot depend on itself.');
    if (task.workspaceId !== other.workspaceId) {
      throw new ValidationError('Dependencies must stay within one workspace.');
    }
    // Cycle check: does `other` already depend (transitively) on `task`?
    const visited = new Set<string>();
    let frontier = [other.id];
    while (frontier.length && visited.size < 2000) {
      const edges = await tx
        .select({ dependsOnTaskId: taskDependencies.dependsOnTaskId })
        .from(taskDependencies)
        .where(inArray(taskDependencies.taskId, frontier));
      frontier = [];
      for (const edge of edges) {
        if (edge.dependsOnTaskId === task.id) {
          throw new ConflictError('That dependency would create a cycle.');
        }
        if (!visited.has(edge.dependsOnTaskId)) {
          visited.add(edge.dependsOnTaskId);
          frontier.push(edge.dependsOnTaskId);
        }
      }
    }
    const [row] = await tx
      .insert(taskDependencies)
      .values({ userId, workspaceId: task.workspaceId, taskId: task.id, dependsOnTaskId: other.id })
      .onConflictDoNothing()
      .returning();
    if (row) {
      await recordActivity(tx, {
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        projectId: task.projectId,
        eventType: 'task.dependency_added',
        entityType: 'task_dependency',
        entityId: row.id,
        summary: `Now waits on ${taskReference(other.taskNumber)}: ${other.title}`,
        detail: task.title,
        metadata: { dependsOnTaskId: other.id },
      });
    }
    return listDependencies(tx, userId, task.id);
  });
}

export async function removeDependency(
  db: DbExecutor,
  userId: string,
  taskId: string,
  dependsOnTaskId: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await lockTask(tx, userId, taskId);
    const deleted = await tx
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.userId, userId),
          eq(taskDependencies.taskId, task.id),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
        ),
      )
      .returning({ id: taskDependencies.id });
    if (deleted.length) {
      await recordActivity(tx, {
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        projectId: task.projectId,
        eventType: 'task.dependency_removed',
        entityType: 'task_dependency',
        entityId: deleted[0]!.id,
        summary: 'Dependency removed',
        detail: task.title,
        metadata: { dependsOnTaskId },
      });
    }
    return listDependencies(tx, userId, task.id);
  });
}

export type DependencyRef = {
  taskId: string;
  taskNumber: number;
  reference: string;
  title: string;
  statusName: string;
  completed: boolean;
};

export async function listDependencies(db: DbExecutor, userId: string, taskId: string) {
  const outgoing = await db
    .select({
      taskId: tasks.id,
      taskNumber: tasks.taskNumber,
      title: tasks.title,
      statusName: taskStatuses.name,
      completed: taskStatuses.countsAsCompleted,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .where(and(eq(taskDependencies.userId, userId), eq(taskDependencies.taskId, taskId)));
  const incoming = await db
    .select({
      taskId: tasks.id,
      taskNumber: tasks.taskNumber,
      title: tasks.title,
      statusName: taskStatuses.name,
      completed: taskStatuses.countsAsCompleted,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.taskId))
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .where(and(eq(taskDependencies.userId, userId), eq(taskDependencies.dependsOnTaskId, taskId)));
  const decorate = (row: Omit<DependencyRef, 'reference'>): DependencyRef => ({
    ...row,
    reference: taskReference(row.taskNumber),
  });
  return { dependsOn: outgoing.map(decorate), blocks: incoming.map(decorate) };
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function getTaskDetail(db: DbExecutor, userId: string, taskId: string) {
  const summary = await getTaskSummary(db, userId, taskId);
  const [
    subtasks,
    dependencies,
    statusHistory,
    phaseHistory,
    plans,
    sessions,
    entries,
    repos,
    references,
    deliveries,
    timeline,
  ] = await Promise.all([
    summaryQuery(db)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.parentTaskId, taskId), isNull(tasks.archivedAt)),
      )
      .orderBy(asc(tasks.position), asc(tasks.createdAt)),
    listDependencies(db, userId, taskId),
    db
      .select()
      .from(taskStatusHistory)
      .where(eq(taskStatusHistory.taskId, taskId))
      .orderBy(desc(taskStatusHistory.changedAt)),
    db
      .select()
      .from(taskPhaseHistory)
      .where(eq(taskPhaseHistory.taskId, taskId))
      .orderBy(desc(taskPhaseHistory.changedAt)),
    db
      .select()
      .from(taskPlans)
      .where(eq(taskPlans.taskId, taskId))
      .orderBy(desc(taskPlans.createdAt)),
    db
      .select({
        id: workSessions.id,
        startedAt: workSessions.startedAt,
        endedAt: workSessions.endedAt,
        durationSeconds: workSessions.durationSeconds,
        description: workSessions.description,
        status: workSessions.status,
        phaseName: taskPhases.name,
      })
      .from(workSessions)
      .leftJoin(taskPhases, eq(workSessions.phaseId, taskPhases.id))
      .where(and(eq(workSessions.taskId, taskId), ne(workSessions.status, 'cancelled')))
      .orderBy(desc(workSessions.startedAt))
      .limit(200),
    db
      .select({
        id: timeEntries.id,
        workDate: timeEntries.workDate,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        durationSeconds: timeEntries.durationSeconds,
        description: timeEntries.description,
        phaseName: taskPhases.name,
      })
      .from(timeEntries)
      .leftJoin(taskPhases, eq(timeEntries.phaseId, taskPhases.id))
      .where(and(eq(timeEntries.taskId, taskId), isNull(timeEntries.deletedAt)))
      .orderBy(desc(timeEntries.workDate))
      .limit(200),
    db
      .select({
        link: taskRepositories,
        repositoryName: repositories.name,
        repositoryUrl: repositories.repositoryUrl,
        provider: repositories.provider,
      })
      .from(taskRepositories)
      .innerJoin(repositories, eq(repositories.id, taskRepositories.repositoryId))
      .where(eq(taskRepositories.taskId, taskId))
      .orderBy(asc(taskRepositories.createdAt)),
    db
      .select()
      .from(developmentReferences)
      .where(eq(developmentReferences.taskId, taskId))
      .orderBy(asc(developmentReferences.createdAt)),
    db
      .select({ record: deliveryRecords, repositoryName: repositories.name })
      .from(deliveryRecords)
      .leftJoin(repositories, eq(repositories.id, deliveryRecords.repositoryId))
      .where(eq(deliveryRecords.taskId, taskId))
      .orderBy(desc(deliveryRecords.deliveredAt)),
    db
      .select()
      .from(activityEvents)
      .where(and(eq(activityEvents.userId, userId), eq(activityEvents.taskId, taskId)))
      .orderBy(desc(activityEvents.occurredAt))
      .limit(100),
  ]);
  const trackedSeconds =
    sessions
      .filter((row) => row.status === 'completed')
      .reduce((n, row) => n + row.durationSeconds, 0) +
    entries.reduce((n, row) => n + row.durationSeconds, 0);
  return {
    ...summary,
    trackedSeconds,
    subtasks: subtasks.map(toSummary),
    dependencies,
    statusHistory,
    phaseHistory,
    plans,
    sessions,
    timeEntries: entries,
    repositories: repos.map((row) => ({
      ...row.link,
      repositoryName: row.repositoryName,
      repositoryUrl: row.repositoryUrl,
      provider: row.provider,
    })),
    references,
    deliveries: deliveries.map((row) => ({ ...row.record, repositoryName: row.repositoryName })),
    timeline,
  };
}

export type TaskDetail = Awaited<ReturnType<typeof getTaskDetail>>;

/** Lightweight search used by the command palette. */
export async function searchTasks(db: DbExecutor, userId: string, term: string, limit = 10) {
  const { items } = await listTasks(db, userId, {
    search: term,
    limit,
    offset: 0,
    sort: 'updated',
    order: 'desc',
    completed: undefined,
    includeArchived: undefined,
    topLevelOnly: undefined,
  });
  return items;
}

/** Counts used by the shell sidebar. */
export async function openTaskCounts(db: DbExecutor, userId: string) {
  return db
    .select({
      workspaceId: tasks.workspaceId,
      open: sql<number>`count(*) filter (where ${taskStatuses.countsAsCompleted} = false and ${taskStatuses.isTerminal} = false)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(and(eq(tasks.userId, userId), isNull(tasks.archivedAt)))
    .groupBy(tasks.workspaceId);
}
