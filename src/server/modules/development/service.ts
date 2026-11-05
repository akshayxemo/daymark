import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { q } from '@/server/db/sql';
import type { DbExecutor } from '@/server/db/client';
import {
  deliveryRecords,
  developmentReferences,
  projects,
  repositories,
  taskRepositories,
  tasks,
} from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '@/server/http/errors';
import type {
  CreateRepositoryInput,
  DeliveryRecordInput,
  DevelopmentReferenceInput,
  TaskRepositoryInput,
  UpdateRepositoryInput,
} from '@/lib/validation/development';
import { recordActivity } from '../activity/record';
import { getTaskRow, taskReference } from '../tasks/service';
import { getWorkspace } from '../workspaces/service';

/* ------------------------------------------------------------------ */
/* Repositories                                                        */
/* ------------------------------------------------------------------ */

export async function getRepository(db: DbExecutor, userId: string, repositoryId: string) {
  const [row] = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.userId, userId), eq(repositories.id, repositoryId)))
    .limit(1);
  if (!row) throw new NotFoundError('Repository not found.');
  return row;
}

export async function listRepositories(
  db: DbExecutor,
  userId: string,
  options: { workspaceId?: string; includeArchived?: boolean } = {},
) {
  const conditions = [eq(repositories.userId, userId)];
  if (options.workspaceId) conditions.push(eq(repositories.workspaceId, options.workspaceId));
  if (!options.includeArchived) conditions.push(isNull(repositories.archivedAt));
  return db
    .select({
      repository: repositories,
      taskCount: sql<number>`(select count(distinct ${q(taskRepositories.taskId)})::int from ${taskRepositories} where ${q(taskRepositories.repositoryId)} = ${q(repositories.id)})`,
      deliveryCount: sql<number>`(select count(*)::int from ${deliveryRecords} where ${q(deliveryRecords.repositoryId)} = ${q(repositories.id)} and ${q(deliveryRecords.deliveryStatus)} = 'successful')`,
    })
    .from(repositories)
    .where(and(...conditions))
    .orderBy(asc(repositories.archivedAt), asc(repositories.name))
    .then((rows) =>
      rows.map((row) => ({
        ...row.repository,
        taskCount: row.taskCount,
        deliveryCount: row.deliveryCount,
      })),
    );
}

function duplicateRepository(error: unknown): unknown {
  if ((error as { code?: string } | undefined)?.code === '23505') {
    return new ValidationError('A repository with this name already exists in the workspace.', [
      { path: 'name', message: 'Repository names must be unique within a workspace.' },
    ]);
  }
  return error;
}

export async function createRepository(
  db: DbExecutor,
  userId: string,
  input: CreateRepositoryInput,
) {
  return withTransaction(db, async (tx) => {
    const workspace = await getWorkspace(tx, userId, input.workspaceId);
    try {
      const [row] = await tx
        .insert(repositories)
        .values({
          userId,
          workspaceId: workspace.id,
          name: input.name,
          owner: input.owner ?? null,
          provider: input.provider,
          repositoryUrl: input.repositoryUrl ?? '',
          defaultBranch: input.defaultBranch ?? null,
          description: input.description ?? '',
        })
        .returning();
      await recordActivity(tx, {
        userId,
        workspaceId: workspace.id,
        eventType: 'repository.created',
        entityType: 'repository',
        entityId: row!.id,
        summary: `Repository added: ${row!.name}`,
        detail: row!.repositoryUrl,
      });
      return row!;
    } catch (error) {
      throw duplicateRepository(error);
    }
  });
}

export async function updateRepository(
  db: DbExecutor,
  userId: string,
  repositoryId: string,
  input: UpdateRepositoryInput,
) {
  return withTransaction(db, async (tx) => {
    const current = await getRepository(tx, userId, repositoryId);
    try {
      const [row] = await tx
        .update(repositories)
        .set({
          name: input.name ?? current.name,
          owner: input.owner === undefined ? current.owner : input.owner,
          provider: input.provider ?? current.provider,
          repositoryUrl: input.repositoryUrl ?? current.repositoryUrl,
          defaultBranch:
            input.defaultBranch === undefined ? current.defaultBranch : input.defaultBranch,
          description: input.description ?? current.description,
          updatedAt: new Date(),
        })
        .where(eq(repositories.id, repositoryId))
        .returning();
      await recordActivity(tx, {
        userId,
        workspaceId: current.workspaceId,
        eventType: 'repository.updated',
        entityType: 'repository',
        entityId: repositoryId,
        summary: `Repository updated: ${row!.name}`,
      });
      return row!;
    } catch (error) {
      throw duplicateRepository(error);
    }
  });
}

export async function setRepositoryArchived(
  db: DbExecutor,
  userId: string,
  repositoryId: string,
  archived: boolean,
) {
  return withTransaction(db, async (tx) => {
    const current = await getRepository(tx, userId, repositoryId);
    const [row] = await tx
      .update(repositories)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(repositories.id, repositoryId))
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: current.workspaceId,
      eventType: archived ? 'repository.archived' : 'repository.restored',
      entityType: 'repository',
      entityId: repositoryId,
      summary: `Repository ${archived ? 'archived' : 'restored'}: ${current.name}`,
    });
    return row!;
  });
}

/* ------------------------------------------------------------------ */
/* Task ↔ repository links                                             */
/* ------------------------------------------------------------------ */

async function repositoryInWorkspace(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  repositoryId: string,
) {
  const [row] = await db
    .select()
    .from(repositories)
    .where(
      and(
        eq(repositories.userId, userId),
        eq(repositories.workspaceId, workspaceId),
        eq(repositories.id, repositoryId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new ValidationError('The repository does not belong to this workspace.', [
      { path: 'repositoryId', message: 'Choose a repository from the task’s workspace.' },
    ]);
  }
  return row;
}

export async function addTaskRepository(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: TaskRepositoryInput,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const repository = await repositoryInWorkspace(
      tx,
      userId,
      task.workspaceId,
      input.repositoryId,
    );
    const [row] = await tx
      .insert(taskRepositories)
      .values({
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        repositoryId: repository.id,
        codebaseName: input.codebaseName ?? null,
        branchName: input.branchName ?? null,
        branchUrl: input.branchUrl ?? null,
        workStatus: input.workStatus,
        notes: input.notes ?? '',
      })
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.repository_linked',
      entityType: 'task_repository',
      entityId: row!.id,
      summary: `Linked repository ${repository.name}${input.branchName ? ` · ${input.branchName}` : ''}`,
      detail: task.title,
      metadata: { repositoryId: repository.id, branchName: input.branchName ?? null },
    });
    return row!;
  });
}

export async function updateTaskRepository(
  db: DbExecutor,
  userId: string,
  taskId: string,
  linkId: string,
  input: Partial<Omit<TaskRepositoryInput, 'repositoryId'>>,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const [current] = await tx
      .select()
      .from(taskRepositories)
      .where(
        and(
          eq(taskRepositories.userId, userId),
          eq(taskRepositories.taskId, task.id),
          eq(taskRepositories.id, linkId),
        ),
      )
      .limit(1);
    if (!current) throw new NotFoundError('Repository link not found.');
    const [row] = await tx
      .update(taskRepositories)
      .set({
        codebaseName: input.codebaseName === undefined ? current.codebaseName : input.codebaseName,
        branchName: input.branchName === undefined ? current.branchName : input.branchName,
        branchUrl: input.branchUrl === undefined ? current.branchUrl : input.branchUrl,
        workStatus: input.workStatus ?? current.workStatus,
        notes: input.notes ?? current.notes,
        updatedAt: new Date(),
      })
      .where(eq(taskRepositories.id, linkId))
      .returning();
    const branchChanged = input.branchName !== undefined && input.branchName !== current.branchName;
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: branchChanged ? 'task.branch_changed' : 'task.repository_updated',
      entityType: 'task_repository',
      entityId: linkId,
      summary: branchChanged
        ? `Branch changed${current.branchName ? ` from ${current.branchName}` : ''} to ${input.branchName ?? '(none)'}`
        : `Repository link updated${row!.workStatus ? ` · ${row!.workStatus.replace('_', ' ')}` : ''}`,
      detail: task.title,
      metadata: {
        previousBranch: current.branchName,
        branchName: row!.branchName,
        workStatus: row!.workStatus,
      },
    });
    return row!;
  });
}

export async function removeTaskRepository(
  db: DbExecutor,
  userId: string,
  taskId: string,
  linkId: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const deleted = await tx
      .delete(taskRepositories)
      .where(
        and(
          eq(taskRepositories.userId, userId),
          eq(taskRepositories.taskId, task.id),
          eq(taskRepositories.id, linkId),
        ),
      )
      .returning();
    if (!deleted.length) throw new NotFoundError('Repository link not found.');
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.repository_unlinked',
      entityType: 'task_repository',
      entityId: linkId,
      summary: 'Repository link removed',
      detail: task.title,
    });
  });
}

/* ------------------------------------------------------------------ */
/* External references                                                 */
/* ------------------------------------------------------------------ */

const referenceLabels: Record<string, string> = {
  jira: 'Jira',
  pull_request: 'Pull request',
  commit: 'Commit',
  issue: 'Issue',
  documentation: 'Documentation',
  other: 'Reference',
};

export async function addReference(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: DevelopmentReferenceInput,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    if (input.repositoryId)
      await repositoryInWorkspace(tx, userId, task.workspaceId, input.repositoryId);
    const [row] = await tx
      .insert(developmentReferences)
      .values({
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        repositoryId: input.repositoryId ?? null,
        referenceType: input.referenceType,
        referenceId: input.referenceId ?? null,
        title: input.title ?? null,
        url: input.url ?? null,
      })
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.reference_added',
      entityType: 'development_reference',
      entityId: row!.id,
      summary: `${referenceLabels[input.referenceType] ?? 'Reference'} added${input.referenceId ? `: ${input.referenceId}` : ''}`,
      detail: task.title,
      metadata: { referenceType: input.referenceType },
    });
    return row!;
  });
}

export async function removeReference(
  db: DbExecutor,
  userId: string,
  taskId: string,
  referenceId: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const deleted = await tx
      .delete(developmentReferences)
      .where(
        and(
          eq(developmentReferences.userId, userId),
          eq(developmentReferences.taskId, task.id),
          eq(developmentReferences.id, referenceId),
        ),
      )
      .returning();
    if (!deleted.length) throw new NotFoundError('Reference not found.');
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'task.reference_removed',
      entityType: 'development_reference',
      entityId: referenceId,
      summary: `${referenceLabels[deleted[0]!.referenceType] ?? 'Reference'} removed`,
      detail: task.title,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Delivery records                                                    */
/* ------------------------------------------------------------------ */

const deliveryLabels: Record<string, string> = {
  merged: 'Merged',
  deployed: 'Deployed',
  verified: 'Production verified',
};

export async function recordDelivery(
  db: DbExecutor,
  userId: string,
  taskId: string,
  input: DeliveryRecordInput,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    if (input.repositoryId)
      await repositoryInWorkspace(tx, userId, task.workspaceId, input.repositoryId);
    const deliveredAt = input.deliveredAt ? new Date(input.deliveredAt) : new Date();
    const [row] = await tx
      .insert(deliveryRecords)
      .values({
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        repositoryId: input.repositoryId ?? null,
        deliveryType: input.deliveryType,
        environment: input.environment,
        deliveryStatus: input.deliveryStatus,
        branchName: input.branchName ?? null,
        version: input.version ?? null,
        referenceUrl: input.referenceUrl ?? null,
        deliveredAt,
        notes: input.notes ?? '',
      })
      .returning();
    const label =
      input.deliveryType === 'verified' ? 'Verified' : deliveryLabels[input.deliveryType];
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: `delivery.${input.deliveryType}`,
      entityType: 'delivery_record',
      entityId: row!.id,
      summary: `${label} · ${input.environment}${input.version ? ` · ${input.version}` : ''}${
        input.deliveryStatus !== 'successful' ? ` (${input.deliveryStatus})` : ''
      }`,
      detail: `${taskReference(task.taskNumber)} ${task.title}`,
      metadata: {
        deliveryType: input.deliveryType,
        environment: input.environment,
        deliveryStatus: input.deliveryStatus,
      },
      occurredAt: deliveredAt,
    });
    return row!;
  });
}

export async function updateDelivery(
  db: DbExecutor,
  userId: string,
  taskId: string,
  deliveryId: string,
  input: Partial<DeliveryRecordInput>,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const [current] = await tx
      .select()
      .from(deliveryRecords)
      .where(
        and(
          eq(deliveryRecords.userId, userId),
          eq(deliveryRecords.taskId, task.id),
          eq(deliveryRecords.id, deliveryId),
        ),
      )
      .limit(1);
    if (!current) throw new NotFoundError('Delivery record not found.');
    if (input.repositoryId)
      await repositoryInWorkspace(tx, userId, task.workspaceId, input.repositoryId);
    const [row] = await tx
      .update(deliveryRecords)
      .set({
        repositoryId: input.repositoryId === undefined ? current.repositoryId : input.repositoryId,
        deliveryType: input.deliveryType ?? current.deliveryType,
        environment: input.environment ?? current.environment,
        deliveryStatus: input.deliveryStatus ?? current.deliveryStatus,
        branchName: input.branchName === undefined ? current.branchName : input.branchName,
        version: input.version === undefined ? current.version : input.version,
        referenceUrl: input.referenceUrl === undefined ? current.referenceUrl : input.referenceUrl,
        deliveredAt: input.deliveredAt ? new Date(input.deliveredAt) : current.deliveredAt,
        notes: input.notes ?? current.notes,
        updatedAt: new Date(),
      })
      .where(eq(deliveryRecords.id, deliveryId))
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'delivery.updated',
      entityType: 'delivery_record',
      entityId: deliveryId,
      summary: `Delivery record updated · ${row!.deliveryType} · ${row!.environment} (${row!.deliveryStatus})`,
      detail: task.title,
      metadata: { previousStatus: current.deliveryStatus, deliveryStatus: row!.deliveryStatus },
    });
    return row!;
  });
}

export async function deleteDelivery(
  db: DbExecutor,
  userId: string,
  taskId: string,
  deliveryId: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, taskId);
    const deleted = await tx
      .delete(deliveryRecords)
      .where(
        and(
          eq(deliveryRecords.userId, userId),
          eq(deliveryRecords.taskId, task.id),
          eq(deliveryRecords.id, deliveryId),
        ),
      )
      .returning();
    if (!deleted.length) throw new NotFoundError('Delivery record not found.');
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'delivery.removed',
      entityType: 'delivery_record',
      entityId: deliveryId,
      summary: `Delivery record removed · ${deleted[0]!.deliveryType} · ${deleted[0]!.environment}`,
      detail: task.title,
    });
  });
}

export async function listDeliveries(
  db: DbExecutor,
  userId: string,
  query: {
    workspaceId?: string;
    taskId?: string;
    environment?: string;
    deliveryType?: string;
    deliveryStatus?: string;
    from?: string;
    to?: string;
    limit: number;
  },
) {
  const conditions = [eq(deliveryRecords.userId, userId)];
  if (query.workspaceId) conditions.push(eq(deliveryRecords.workspaceId, query.workspaceId));
  if (query.taskId) conditions.push(eq(deliveryRecords.taskId, query.taskId));
  if (query.environment) conditions.push(eq(deliveryRecords.environment, query.environment));
  if (query.deliveryType) conditions.push(eq(deliveryRecords.deliveryType, query.deliveryType));
  if (query.deliveryStatus)
    conditions.push(eq(deliveryRecords.deliveryStatus, query.deliveryStatus));
  if (query.from)
    conditions.push(gte(deliveryRecords.deliveredAt, new Date(`${query.from}T00:00:00Z`)));
  if (query.to)
    conditions.push(lte(deliveryRecords.deliveredAt, new Date(`${query.to}T23:59:59.999Z`)));
  const rows = await db
    .select({
      record: deliveryRecords,
      taskNumber: tasks.taskNumber,
      taskTitle: tasks.title,
      projectName: projects.name,
      repositoryName: repositories.name,
    })
    .from(deliveryRecords)
    .innerJoin(tasks, eq(tasks.id, deliveryRecords.taskId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(repositories, eq(repositories.id, deliveryRecords.repositoryId))
    .where(and(...conditions))
    .orderBy(desc(deliveryRecords.deliveredAt))
    .limit(query.limit);
  return rows.map((row) => ({
    ...row.record,
    taskNumber: row.taskNumber,
    taskReference: taskReference(row.taskNumber),
    taskTitle: row.taskTitle,
    projectName: row.projectName,
    repositoryName: row.repositoryName,
  }));
}

export { ConflictError };
