import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/server/db/client';
import {
  projects,
  tags,
  taskPhases,
  taskStatuses,
  taskTypes,
  tasks,
  workspaceSettings,
  workspaces,
  type WorkspaceKind,
} from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '@/server/http/errors';
import type {
  CreateWorkspaceInput,
  PhaseInput,
  StatusInput,
  TagInput,
  TaskTypeInput,
  UpdateWorkspaceInput,
  WorkspaceSettingsInput,
} from '@/lib/validation/workspaces';
import { recordActivity } from '../activity/record';
import { defaultPhasesFor, defaultStatuses, defaultTaskTypesFor, slugify } from './defaults';

export type WorkspaceRow = typeof workspaces.$inferSelect;

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

/** Loads a workspace the user owns or throws NotFound (never reveals other users' data). */
export async function getWorkspace(db: DbExecutor, userId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.userId, userId), eq(workspaces.id, workspaceId)))
    .limit(1);
  if (!row) throw new NotFoundError('Workspace not found.');
  return row;
}

export async function listWorkspaces(
  db: DbExecutor,
  userId: string,
  options: { includeArchived?: boolean } = {},
) {
  const conditions = [eq(workspaces.userId, userId)];
  if (!options.includeArchived) conditions.push(isNull(workspaces.archivedAt));
  return db
    .select()
    .from(workspaces)
    .where(and(...conditions))
    .orderBy(asc(workspaces.position), asc(workspaces.createdAt));
}

async function uniqueSlug(db: DbExecutor, userId: string, base: string): Promise<string> {
  const existing = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.userId, userId));
  const taken = new Set(existing.map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new ConflictError('Could not generate a unique workspace slug.');
}

/* ------------------------------------------------------------------ */
/* Default configuration                                               */
/* ------------------------------------------------------------------ */

/**
 * Inserts any default statuses, task types and phases that the workspace is
 * missing. Idempotent: existing rows (matched by key) are left untouched, so
 * the seed script can repair installations safely.
 */
export async function ensureWorkspaceDefaults(
  db: DbExecutor,
  workspace: Pick<WorkspaceRow, 'id' | 'userId' | 'kind'>,
) {
  const kind = workspace.kind as WorkspaceKind;
  const created = { statuses: 0, taskTypes: 0, phases: 0 };

  const existingStatuses = await db
    .select({ key: taskStatuses.key })
    .from(taskStatuses)
    .where(eq(taskStatuses.workspaceId, workspace.id));
  const statusKeys = new Set(existingStatuses.map((row) => row.key));
  const hasInitial = existingStatuses.length > 0;
  const statusRows = defaultStatuses
    .filter((template) => !statusKeys.has(template.key))
    .map((template, index) => ({
      userId: workspace.userId,
      workspaceId: workspace.id,
      key: template.key,
      name: template.name,
      category: template.category,
      color: template.color,
      // Never introduce a second initial status into an existing workspace.
      isInitial: hasInitial ? false : (template.isInitial ?? false),
      isTerminal: template.isTerminal ?? false,
      isActive: template.isActive ?? false,
      countsAsCompleted: template.countsAsCompleted ?? false,
      stopsTimer: template.stopsTimer ?? false,
      position: existingStatuses.length + index,
    }));
  if (statusRows.length) {
    await db.insert(taskStatuses).values(statusRows).onConflictDoNothing();
    created.statuses = statusRows.length;
  }

  const existingTypes = await db
    .select({ key: taskTypes.key })
    .from(taskTypes)
    .where(eq(taskTypes.workspaceId, workspace.id));
  const typeKeys = new Set(existingTypes.map((row) => row.key));
  const typeRows = defaultTaskTypesFor(kind)
    .filter((template) => !typeKeys.has(template.key))
    .map((template, index) => ({
      userId: workspace.userId,
      workspaceId: workspace.id,
      key: template.key,
      name: template.name,
      isDefault: existingTypes.length ? false : (template.isDefault ?? false),
      position: existingTypes.length + index,
    }));
  if (typeRows.length) {
    await db.insert(taskTypes).values(typeRows).onConflictDoNothing();
    created.taskTypes = typeRows.length;
  }

  const existingPhases = await db
    .select({ key: taskPhases.key })
    .from(taskPhases)
    .where(eq(taskPhases.workspaceId, workspace.id));
  const phaseKeys = new Set(existingPhases.map((row) => row.key));
  const phaseRows = defaultPhasesFor(kind)
    .filter((template) => !phaseKeys.has(template.key))
    .map((template, index) => ({
      userId: workspace.userId,
      workspaceId: workspace.id,
      key: template.key,
      name: template.name,
      position: existingPhases.length + index,
    }));
  if (phaseRows.length) {
    await db.insert(taskPhases).values(phaseRows).onConflictDoNothing();
    created.phases = phaseRows.length;
  }
  return created;
}

/* ------------------------------------------------------------------ */
/* Workspace lifecycle                                                 */
/* ------------------------------------------------------------------ */

export async function createWorkspace(db: DbExecutor, userId: string, input: CreateWorkspaceInput) {
  return withTransaction(db, async (tx) => {
    const [{ existing }] = await tx
      .select({ existing: count() })
      .from(workspaces)
      .where(eq(workspaces.userId, userId));
    const slug = await uniqueSlug(tx, userId, slugify(input.name));
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        userId,
        name: input.name,
        slug,
        description: input.description ?? '',
        kind: input.kind,
        icon: input.icon,
        color: input.color,
        isDefault: existing === 0,
        position: existing,
      })
      .returning();
    await tx.insert(workspaceSettings).values({ workspaceId: workspace!.id, userId });
    await ensureWorkspaceDefaults(tx, workspace!);
    await recordActivity(tx, {
      userId,
      workspaceId: workspace!.id,
      eventType: 'workspace.created',
      entityType: 'workspace',
      entityId: workspace!.id,
      summary: `Workspace created: ${workspace!.name}`,
    });
    return workspace!;
  });
}

export async function updateWorkspace(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: UpdateWorkspaceInput,
) {
  return withTransaction(db, async (tx) => {
    const current = await getWorkspace(tx, userId, workspaceId);
    if (input.isDefault) {
      await tx
        .update(workspaces)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(workspaces.userId, userId), eq(workspaces.isDefault, true)));
    }
    const [row] = await tx
      .update(workspaces)
      .set({
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        icon: input.icon ?? current.icon,
        color: input.color ?? current.color,
        isDefault: input.isDefault ?? current.isDefault,
        position: input.position ?? current.position,
        updatedAt: new Date(),
      })
      .where(and(eq(workspaces.userId, userId), eq(workspaces.id, workspaceId)))
      .returning();
    if (input.name && input.name !== current.name) {
      await recordActivity(tx, {
        userId,
        workspaceId,
        eventType: 'workspace.updated',
        entityType: 'workspace',
        entityId: workspaceId,
        summary: `Workspace renamed: ${current.name} → ${input.name}`,
      });
    }
    return row!;
  });
}

export async function setWorkspaceArchived(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  archived: boolean,
) {
  return withTransaction(db, async (tx) => {
    const current = await getWorkspace(tx, userId, workspaceId);
    if (archived) {
      const [{ active }] = await tx
        .select({ active: count() })
        .from(workspaces)
        .where(and(eq(workspaces.userId, userId), isNull(workspaces.archivedAt)));
      if (active <= 1) {
        throw new ConflictError(
          'Keep at least one active workspace. Create another one before archiving this.',
        );
      }
    }
    const [row] = await tx
      .update(workspaces)
      .set({
        archivedAt: archived ? new Date() : null,
        isDefault: archived ? false : current.isDefault,
        updatedAt: new Date(),
      })
      .where(and(eq(workspaces.userId, userId), eq(workspaces.id, workspaceId)))
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId,
      eventType: archived ? 'workspace.archived' : 'workspace.restored',
      entityType: 'workspace',
      entityId: workspaceId,
      summary: `Workspace ${archived ? 'archived' : 'restored'}: ${current.name}`,
      detail: archived ? 'Tasks, time and history were kept.' : '',
    });
    return row!;
  });
}

export async function getWorkspaceSettings(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
): Promise<typeof workspaceSettings.$inferSelect> {
  await getWorkspace(db, userId, workspaceId);
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  if (row) return row;
  await db.insert(workspaceSettings).values({ workspaceId, userId }).onConflictDoNothing();
  const [created] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  if (!created) throw new NotFoundError('Workspace settings are missing.');
  return created;
}

export async function updateWorkspaceSettings(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: WorkspaceSettingsInput,
) {
  const current = await getWorkspaceSettings(db, userId, workspaceId);
  const [row] = await db
    .update(workspaceSettings)
    .set({
      workingDays: input.workingDays ? [...new Set(input.workingDays)].sort() : current.workingDays,
      workingMinutesPerDay: input.workingMinutesPerDay ?? current.workingMinutesPerDay,
      timezone: input.timezone === undefined ? current.timezone : input.timezone,
      updatedAt: new Date(),
    })
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .returning();
  return row!;
}

/* ------------------------------------------------------------------ */
/* Configuration: statuses, task types, phases, tags                   */
/* ------------------------------------------------------------------ */

export async function getWorkspaceConfiguration(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
) {
  await getWorkspace(db, userId, workspaceId);
  const [statuses, types, phases, tagRows] = await Promise.all([
    db
      .select()
      .from(taskStatuses)
      .where(and(eq(taskStatuses.workspaceId, workspaceId), isNull(taskStatuses.archivedAt)))
      .orderBy(asc(taskStatuses.position)),
    db
      .select()
      .from(taskTypes)
      .where(and(eq(taskTypes.workspaceId, workspaceId), isNull(taskTypes.archivedAt)))
      .orderBy(asc(taskTypes.position)),
    db
      .select()
      .from(taskPhases)
      .where(and(eq(taskPhases.workspaceId, workspaceId), isNull(taskPhases.archivedAt)))
      .orderBy(asc(taskPhases.position)),
    db.select().from(tags).where(eq(tags.workspaceId, workspaceId)).orderBy(asc(tags.name)),
  ]);
  return { statuses, taskTypes: types, phases, tags: tagRows };
}

/** Loads configuration for every active workspace of a user in two queries per table. */
export async function getAllConfiguration(db: DbExecutor, userId: string) {
  const [statuses, types, phases, tagRows] = await Promise.all([
    db
      .select()
      .from(taskStatuses)
      .where(and(eq(taskStatuses.userId, userId), isNull(taskStatuses.archivedAt)))
      .orderBy(asc(taskStatuses.workspaceId), asc(taskStatuses.position)),
    db
      .select()
      .from(taskTypes)
      .where(and(eq(taskTypes.userId, userId), isNull(taskTypes.archivedAt)))
      .orderBy(asc(taskTypes.workspaceId), asc(taskTypes.position)),
    db
      .select()
      .from(taskPhases)
      .where(and(eq(taskPhases.userId, userId), isNull(taskPhases.archivedAt)))
      .orderBy(asc(taskPhases.workspaceId), asc(taskPhases.position)),
    db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name)),
  ]);
  return { statuses, taskTypes: types, phases, tags: tagRows };
}

async function countTasksUsing(
  db: DbExecutor,
  column: typeof tasks.statusId | typeof tasks.taskTypeId | typeof tasks.phaseId,
  id: string,
) {
  const [{ total }] = await db.select({ total: count() }).from(tasks).where(eq(column, id));
  return total;
}

export async function createStatus(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: StatusInput,
) {
  return withTransaction(db, async (tx) => {
    await getWorkspace(tx, userId, workspaceId);
    if (input.isInitial) {
      await tx
        .update(taskStatuses)
        .set({ isInitial: false })
        .where(and(eq(taskStatuses.workspaceId, workspaceId), eq(taskStatuses.isInitial, true)));
    }
    const [{ total }] = await tx
      .select({ total: count() })
      .from(taskStatuses)
      .where(eq(taskStatuses.workspaceId, workspaceId));
    try {
      const [row] = await tx
        .insert(taskStatuses)
        .values({
          userId,
          workspaceId,
          name: input.name,
          category: input.category,
          color: input.color ?? null,
          isInitial: input.isInitial,
          isTerminal: input.isTerminal,
          isActive: input.isActive,
          countsAsCompleted: input.countsAsCompleted,
          stopsTimer: input.stopsTimer,
          position: input.position ?? total,
        })
        .returning();
      return row!;
    } catch (error) {
      throw duplicateNameError(error, 'status');
    }
  });
}

export async function updateStatus(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  statusId: string,
  input: Partial<StatusInput>,
) {
  return withTransaction(db, async (tx) => {
    await getWorkspace(tx, userId, workspaceId);
    const [current] = await tx
      .select()
      .from(taskStatuses)
      .where(and(eq(taskStatuses.workspaceId, workspaceId), eq(taskStatuses.id, statusId)))
      .limit(1);
    if (!current) throw new NotFoundError('Status not found.');
    if (input.isInitial) {
      await tx
        .update(taskStatuses)
        .set({ isInitial: false })
        .where(and(eq(taskStatuses.workspaceId, workspaceId), eq(taskStatuses.isInitial, true)));
    }
    try {
      const [row] = await tx
        .update(taskStatuses)
        .set({
          name: input.name ?? current.name,
          category: input.category ?? current.category,
          color: input.color === undefined ? current.color : input.color,
          isInitial: input.isInitial ?? current.isInitial,
          isTerminal: input.isTerminal ?? current.isTerminal,
          isActive: input.isActive ?? current.isActive,
          countsAsCompleted: input.countsAsCompleted ?? current.countsAsCompleted,
          stopsTimer: input.stopsTimer ?? current.stopsTimer,
          position: input.position ?? current.position,
          updatedAt: new Date(),
        })
        .where(eq(taskStatuses.id, statusId))
        .returning();
      return row!;
    } catch (error) {
      throw duplicateNameError(error, 'status');
    }
  });
}

export async function archiveStatus(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  statusId: string,
) {
  await getWorkspace(db, userId, workspaceId);
  const [current] = await db
    .select()
    .from(taskStatuses)
    .where(and(eq(taskStatuses.workspaceId, workspaceId), eq(taskStatuses.id, statusId)))
    .limit(1);
  if (!current) throw new NotFoundError('Status not found.');
  if (current.isInitial)
    throw new ConflictError('Choose another initial status before archiving this one.');
  const inUse = await countTasksUsing(db, tasks.statusId, statusId);
  if (inUse > 0) {
    throw new ConflictError(
      `${inUse} task(s) still use this status. Move them to another status first.`,
    );
  }
  await db
    .update(taskStatuses)
    .set({ archivedAt: new Date(), isInitial: false, updatedAt: new Date() })
    .where(eq(taskStatuses.id, statusId));
}

export async function createTaskType(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: TaskTypeInput,
) {
  return withTransaction(db, async (tx) => {
    await getWorkspace(tx, userId, workspaceId);
    if (input.isDefault) {
      await tx
        .update(taskTypes)
        .set({ isDefault: false })
        .where(and(eq(taskTypes.workspaceId, workspaceId), eq(taskTypes.isDefault, true)));
    }
    const [{ total }] = await tx
      .select({ total: count() })
      .from(taskTypes)
      .where(eq(taskTypes.workspaceId, workspaceId));
    try {
      const [row] = await tx
        .insert(taskTypes)
        .values({
          userId,
          workspaceId,
          name: input.name,
          isDefault: input.isDefault,
          position: input.position ?? total,
        })
        .returning();
      return row!;
    } catch (error) {
      throw duplicateNameError(error, 'task type');
    }
  });
}

export async function updateTaskType(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  typeId: string,
  input: Partial<TaskTypeInput>,
) {
  return withTransaction(db, async (tx) => {
    await getWorkspace(tx, userId, workspaceId);
    const [current] = await tx
      .select()
      .from(taskTypes)
      .where(and(eq(taskTypes.workspaceId, workspaceId), eq(taskTypes.id, typeId)))
      .limit(1);
    if (!current) throw new NotFoundError('Task type not found.');
    if (input.isDefault) {
      await tx
        .update(taskTypes)
        .set({ isDefault: false })
        .where(and(eq(taskTypes.workspaceId, workspaceId), eq(taskTypes.isDefault, true)));
    }
    try {
      const [row] = await tx
        .update(taskTypes)
        .set({
          name: input.name ?? current.name,
          isDefault: input.isDefault ?? current.isDefault,
          position: input.position ?? current.position,
          updatedAt: new Date(),
        })
        .where(eq(taskTypes.id, typeId))
        .returning();
      return row!;
    } catch (error) {
      throw duplicateNameError(error, 'task type');
    }
  });
}

export async function archiveTaskType(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  typeId: string,
) {
  await getWorkspace(db, userId, workspaceId);
  const [current] = await db
    .select()
    .from(taskTypes)
    .where(and(eq(taskTypes.workspaceId, workspaceId), eq(taskTypes.id, typeId)))
    .limit(1);
  if (!current) throw new NotFoundError('Task type not found.');
  if (current.isDefault)
    throw new ConflictError('Choose another default task type before archiving this one.');
  const inUse = await countTasksUsing(db, tasks.taskTypeId, typeId);
  if (inUse > 0) {
    throw new ConflictError(`${inUse} task(s) still use this type. Change their type first.`);
  }
  await db
    .update(taskTypes)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(taskTypes.id, typeId));
}

export async function createPhase(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: PhaseInput,
) {
  await getWorkspace(db, userId, workspaceId);
  const [{ total }] = await db
    .select({ total: count() })
    .from(taskPhases)
    .where(eq(taskPhases.workspaceId, workspaceId));
  const [row] = await db
    .insert(taskPhases)
    .values({
      userId,
      workspaceId,
      name: input.name,
      taskTypeId: input.taskTypeId ?? null,
      position: input.position ?? total,
      isEnabled: input.isEnabled,
    })
    .returning();
  return row!;
}

export async function updatePhase(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  phaseId: string,
  input: Partial<PhaseInput>,
) {
  await getWorkspace(db, userId, workspaceId);
  const [current] = await db
    .select()
    .from(taskPhases)
    .where(and(eq(taskPhases.workspaceId, workspaceId), eq(taskPhases.id, phaseId)))
    .limit(1);
  if (!current) throw new NotFoundError('Phase not found.');
  const [row] = await db
    .update(taskPhases)
    .set({
      name: input.name ?? current.name,
      taskTypeId: input.taskTypeId === undefined ? current.taskTypeId : input.taskTypeId,
      position: input.position ?? current.position,
      isEnabled: input.isEnabled ?? current.isEnabled,
      updatedAt: new Date(),
    })
    .where(eq(taskPhases.id, phaseId))
    .returning();
  return row!;
}

export async function archivePhase(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  phaseId: string,
) {
  await getWorkspace(db, userId, workspaceId);
  const [current] = await db
    .select({ id: taskPhases.id })
    .from(taskPhases)
    .where(and(eq(taskPhases.workspaceId, workspaceId), eq(taskPhases.id, phaseId)))
    .limit(1);
  if (!current) throw new NotFoundError('Phase not found.');
  // Phases referenced by tasks keep working; archiving only hides them from pickers.
  await db
    .update(taskPhases)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(taskPhases.id, phaseId));
}

export async function createTag(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  input: TagInput,
) {
  await getWorkspace(db, userId, workspaceId);
  try {
    const [row] = await db
      .insert(tags)
      .values({ userId, workspaceId, name: input.name, color: input.color ?? null })
      .returning();
    return row!;
  } catch (error) {
    throw duplicateNameError(error, 'tag');
  }
}

export async function updateTag(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  tagId: string,
  input: Partial<TagInput>,
) {
  await getWorkspace(db, userId, workspaceId);
  const [current] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.workspaceId, workspaceId), eq(tags.id, tagId)))
    .limit(1);
  if (!current) throw new NotFoundError('Tag not found.');
  try {
    const [row] = await db
      .update(tags)
      .set({
        name: input.name ?? current.name,
        color: input.color === undefined ? current.color : input.color,
      })
      .where(eq(tags.id, tagId))
      .returning();
    return row!;
  } catch (error) {
    throw duplicateNameError(error, 'tag');
  }
}

export async function deleteTag(
  db: DbExecutor,
  userId: string,
  workspaceId: string,
  tagId: string,
) {
  await getWorkspace(db, userId, workspaceId);
  const deleted = await db
    .delete(tags)
    .where(and(eq(tags.workspaceId, workspaceId), eq(tags.id, tagId)))
    .returning({ id: tags.id });
  if (!deleted.length) throw new NotFoundError('Tag not found.');
}

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

export async function workspaceSummaries(db: DbExecutor, userId: string) {
  const rows = await db
    .select({
      workspaceId: tasks.workspaceId,
      openTasks: sql<number>`count(*) filter (where ${tasks.archivedAt} is null and ${taskStatuses.countsAsCompleted} = false and ${taskStatuses.isTerminal} = false)`,
      totalTasks: sql<number>`count(*) filter (where ${tasks.archivedAt} is null)`,
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(eq(tasks.userId, userId))
    .groupBy(tasks.workspaceId);
  const projectCounts = await db
    .select({ workspaceId: projects.workspaceId, projectsCount: count() })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .groupBy(projects.workspaceId);
  return { tasks: rows, projects: projectCounts };
}

/* ------------------------------------------------------------------ */

function duplicateNameError(error: unknown, entity: string): unknown {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === '23505') {
    return new ValidationError(`A ${entity} with this name already exists in the workspace.`, [
      { path: 'name', message: 'Name must be unique within the workspace.' },
    ]);
  }
  return error;
}
