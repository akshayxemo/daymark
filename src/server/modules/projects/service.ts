import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { q } from '@/server/db/sql';
import type { DbExecutor } from '@/server/db/client';
import { projects, taskStatuses, tasks } from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { NotFoundError, ValidationError } from '@/server/http/errors';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validation/projects';
import { recordActivity } from '../activity/record';
import { getWorkspace } from '../workspaces/service';

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectSummary = ProjectRow & { taskCount: number; completedCount: number };

export async function getProject(
  db: DbExecutor,
  userId: string,
  projectId: string,
): Promise<ProjectRow> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError('Project not found.');
  return row;
}

export async function listProjects(
  db: DbExecutor,
  userId: string,
  options: { workspaceId?: string; includeArchived?: boolean } = {},
): Promise<ProjectSummary[]> {
  const conditions = [eq(projects.userId, userId)];
  if (options.workspaceId) conditions.push(eq(projects.workspaceId, options.workspaceId));
  if (!options.includeArchived) conditions.push(isNull(projects.archivedAt));
  const rows = await db
    .select({
      project: projects,
      taskCount: sql<number>`(select count(*)::int from ${tasks} where ${q(tasks.projectId)} = ${q(projects.id)} and ${q(tasks.archivedAt)} is null)`,
      completedCount: sql<number>`(select count(*)::int from ${tasks} join ${taskStatuses} on ${q(taskStatuses.id)} = ${q(tasks.statusId)} where ${q(tasks.projectId)} = ${q(projects.id)} and ${q(tasks.archivedAt)} is null and ${q(taskStatuses.countsAsCompleted)} = true)`,
    })
    .from(projects)
    .where(and(...conditions))
    .orderBy(asc(projects.archivedAt), asc(projects.name));
  return rows.map((row) => ({
    ...row.project,
    taskCount: row.taskCount,
    completedCount: row.completedCount,
  }));
}

function duplicateName(error: unknown): unknown {
  if ((error as { code?: string } | undefined)?.code === '23505') {
    return new ValidationError(
      'A project with this name already exists in this workspace, including archived projects.',
      [{ path: 'name', message: 'Project names must be unique within a workspace.' }],
    );
  }
  return error;
}

export async function createProject(db: DbExecutor, userId: string, input: CreateProjectInput) {
  return withTransaction(db, async (tx) => {
    const workspace = await getWorkspace(tx, userId, input.workspaceId);
    try {
      const [row] = await tx
        .insert(projects)
        .values({
          userId,
          workspaceId: workspace.id,
          name: input.name,
          description: input.description ?? '',
          status: input.status ?? 'active',
          color: input.color ?? null,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
        })
        .returning();
      await recordActivity(tx, {
        userId,
        workspaceId: workspace.id,
        projectId: row!.id,
        eventType: 'project.created',
        entityType: 'project',
        entityId: row!.id,
        summary: `Project created: ${row!.name}`,
        detail: row!.description,
      });
      return row!;
    } catch (error) {
      throw duplicateName(error);
    }
  });
}

export async function updateProject(
  db: DbExecutor,
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  return withTransaction(db, async (tx) => {
    const current = await getProject(tx, userId, projectId);
    try {
      const [row] = await tx
        .update(projects)
        .set({
          name: input.name ?? current.name,
          description: input.description ?? current.description,
          status: input.status ?? current.status,
          color: input.color === undefined ? current.color : input.color,
          startDate: input.startDate === undefined ? current.startDate : input.startDate,
          dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();
      const renamed = input.name && input.name !== current.name;
      await recordActivity(tx, {
        userId,
        workspaceId: current.workspaceId,
        projectId,
        eventType: 'project.updated',
        entityType: 'project',
        entityId: projectId,
        summary: `Project updated: ${row!.name}`,
        detail: renamed ? `Renamed from ${current.name}` : '',
      });
      return row!;
    } catch (error) {
      throw duplicateName(error);
    }
  });
}

export async function setProjectArchived(
  db: DbExecutor,
  userId: string,
  projectId: string,
  archived: boolean,
) {
  return withTransaction(db, async (tx) => {
    const current = await getProject(tx, userId, projectId);
    const [row] = await tx
      .update(projects)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: current.workspaceId,
      projectId,
      eventType: archived ? 'project.archived' : 'project.restored',
      entityType: 'project',
      entityId: projectId,
      summary: `Project ${archived ? 'archived' : 'restored'}: ${current.name}`,
      detail: archived ? 'Tasks and history were kept.' : 'Project available again.',
    });
    return row!;
  });
}
