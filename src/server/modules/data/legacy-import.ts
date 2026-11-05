import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/server/db/client';
import {
  activityEvents,
  localImports,
  workSessionIntervals,
  workSessions,
} from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, ValidationError } from '@/server/http/errors';
import { validationErrorFromZod } from '@/server/http/respond';
import {
  isSampleTask,
  legacyFingerprintSource,
  legacyPhaseCandidates,
  legacyStateSchema,
  legacyStatusKey,
  previewLegacy,
  type LegacyPreview,
  type LegacyState,
} from '@/lib/legacy-import';
import { dateInTimezone } from '@/lib/dates';
import { recordActivity } from '../activity/record';
import { createJournalEntry } from '../journal/service';
import { createProject, listProjects, setProjectArchived } from '../projects/service';
import { changeTaskPhase, changeTaskStatus, createTask } from '../tasks/service';
import { createWorkspace, getWorkspaceConfiguration, listWorkspaces } from '../workspaces/service';

const kindFor = { Office: 'professional', Personal: 'personal', Learning: 'learning' } as const;
const iconFor = { Office: 'briefcase', Personal: 'leaf', Learning: 'book' } as const;
const colorFor = { Office: 'accent', Personal: 'purple', Learning: 'orange' } as const;

export function parseLegacy(raw: unknown): LegacyState {
  const parsed = legacyStateSchema.safeParse(raw);
  if (!parsed.success) throw validationErrorFromZod(parsed.error);
  return parsed.data;
}

function fingerprint(state: LegacyState): string {
  return `legacy:${createHash('sha256').update(legacyFingerprintSource(state)).digest('hex')}`;
}

export async function previewLegacyImport(
  db: DbExecutor,
  userId: string,
  raw: unknown,
): Promise<LegacyPreview & { alreadyImported: boolean }> {
  const state = parseLegacy(raw);
  const [existing] = await db
    .select({ id: localImports.id })
    .from(localImports)
    .where(and(eq(localImports.userId, userId), eq(localImports.fingerprint, fingerprint(state))))
    .limit(1);
  return { ...previewLegacy(state), alreadyImported: Boolean(existing) };
}

/**
 * Imports browser-local prototype data into the signed-in account in a single
 * transaction. Fictional sample tasks are skipped unless `includeSample` is
 * set. Existing workspaces and projects with the same names are reused.
 */
export async function importLegacy(
  db: DbExecutor,
  userId: string,
  raw: unknown,
  options: { includeSample: boolean; timezone: string },
) {
  const state = parseLegacy(raw);
  const print = fingerprint(state);
  return withTransaction(db, async (tx) => {
    const [existing] = await tx
      .select({ id: localImports.id })
      .from(localImports)
      .where(and(eq(localImports.userId, userId), eq(localImports.fingerprint, print)))
      .limit(1);
    if (existing)
      throw new ConflictError('This browser data has already been imported into your account.');

    const selected = state.tasks.filter((task) => options.includeSample || !isSampleTask(task));
    if (!selected.length && !state.journal.trim()) {
      throw new ValidationError(
        'There is nothing to import: only the built-in sample tasks were found.',
      );
    }

    // Workspaces: reuse by name, otherwise create with defaults.
    const workspaceIds = new Map<string, string>();
    const current = await listWorkspaces(tx, userId, { includeArchived: true });
    for (const name of new Set(selected.map((t) => t.workspace))) {
      const found = current.find((w) => w.name.toLowerCase() === name.toLowerCase());
      const workspace =
        found ??
        (await createWorkspace(tx, userId, {
          name,
          description: '',
          kind: kindFor[name],
          icon: iconFor[name],
          color: colorFor[name],
        }));
      workspaceIds.set(name, workspace.id);
    }

    // Projects: reuse by (workspace, name), otherwise create.
    const projectIds = new Map<string, string>();
    const allProjects = await listProjects(tx, userId, { includeArchived: true });
    const wantedProjects = new Map<
      string,
      { name: string; workspace: keyof typeof kindFor; description: string; archived: boolean }
    >();
    for (const p of state.projects ?? []) wantedProjects.set(`${p.workspace}|${p.name}`, p);
    for (const t of selected) {
      if (t.project.trim() && !wantedProjects.has(`${t.workspace}|${t.project}`)) {
        wantedProjects.set(`${t.workspace}|${t.project}`, {
          name: t.project,
          workspace: t.workspace,
          description: '',
          archived: false,
        });
      }
    }
    for (const [key, project] of wantedProjects) {
      const workspaceId = workspaceIds.get(project.workspace);
      if (!workspaceId) continue;
      const found = allProjects.find(
        (p) => p.workspaceId === workspaceId && p.name.toLowerCase() === project.name.toLowerCase(),
      );
      if (found) {
        projectIds.set(key, found.id);
        continue;
      }
      const created = await createProject(tx, userId, {
        workspaceId,
        name: project.name,
        description: project.description,
        status: 'active',
      });
      if (project.archived) await setProjectArchived(tx, userId, created.id, true);
      projectIds.set(key, created.id);
    }

    // Tasks through the regular services so history and events are written.
    const taskIds = new Map<string, { id: string; workspaceId: string; phaseId: string | null }>();
    const configs = new Map<string, Awaited<ReturnType<typeof getWorkspaceConfiguration>>>();
    for (const task of selected) {
      const workspaceId = workspaceIds.get(task.workspace)!;
      if (!configs.has(workspaceId))
        configs.set(workspaceId, await getWorkspaceConfiguration(tx, userId, workspaceId));
      const config = configs.get(workspaceId)!;
      const created = await createTask(tx, userId, {
        workspaceId,
        title: task.title,
        description: task.description,
        projectId: task.project.trim()
          ? (projectIds.get(`${task.workspace}|${task.project}`) ?? null)
          : null,
        priority: task.priority.toLowerCase() as 'low' | 'medium' | 'high',
        estimatedMinutes: Math.round(task.estimate),
        plannedDate: task.date,
      });
      const targetStatus = config.statuses.find((s) => s.key === legacyStatusKey[task.status]);
      if (targetStatus && targetStatus.id !== created.statusId) {
        await changeTaskStatus(tx, userId, created.id, {
          statusId: targetStatus.id,
          reason: 'Imported from browser data',
        });
      }
      const phase = legacyPhaseCandidates(task.phase)
        .map((key) => config.phases.find((p) => p.key === key))
        .find(Boolean);
      if (phase)
        await changeTaskPhase(tx, userId, created.id, {
          phaseId: phase.id,
          notes: 'Imported from browser data',
        });
      taskIds.set(task.id, { id: created.id, workspaceId, phaseId: phase?.id ?? null });
    }

    // Saved focus sessions become completed timer sessions at their original times.
    let sessions = 0;
    for (const session of state.sessions) {
      const task = taskIds.get(session.taskId);
      if (!task || session.seconds <= 0) continue;
      const endedAt = new Date(session.endedAt);
      const startedAt = new Date(session.endedAt - session.seconds * 1000);
      const [row] = await tx
        .insert(workSessions)
        .values({
          userId,
          workspaceId: task.workspaceId,
          taskId: task.id,
          phaseId: task.phaseId,
          status: 'completed',
          startedAt,
          endedAt,
          durationSeconds: Math.round(session.seconds),
          description: 'Imported from browser data',
          source: 'import',
        })
        .returning();
      await tx
        .insert(workSessionIntervals)
        .values({ userId, sessionId: row!.id, startedAt, endedAt });
      sessions += 1;
    }

    // Historical activity is preserved as imported events at their original time.
    let activities = 0;
    for (const activity of state.activities) {
      const task = activity.taskId ? taskIds.get(activity.taskId) : undefined;
      if (activity.taskId && !task) continue;
      const workspaceId = task?.workspaceId ?? workspaceIds.get(activity.workspace);
      if (!workspaceId) continue;
      await tx.insert(activityEvents).values({
        userId,
        workspaceId,
        taskId: task?.id ?? null,
        eventType: 'imported.legacy',
        entityType: 'import',
        summary: activity.title,
        detail: activity.detail,
        metadata: { source: 'daymark.design.v1' },
        occurredAt: new Date(activity.time),
      });
      activities += 1;
    }

    if (state.journal.trim()) {
      await createJournalEntry(tx, userId, {
        title: 'Imported journal note',
        content: state.journal,
        entryType: 'general',
        entryDate: dateInTimezone(new Date(), options.timezone),
      });
    }

    const summary = {
      tasks: taskIds.size,
      projects: projectIds.size,
      sessions,
      activities,
      journal: state.journal.trim() ? 1 : 0,
    };
    await tx.insert(localImports).values({ userId, fingerprint: print, summary });
    await recordActivity(tx, {
      userId,
      eventType: 'data.imported',
      entityType: 'account',
      summary: `Imported browser data · ${summary.tasks} tasks, ${summary.sessions} sessions`,
      detail: options.includeSample ? 'Sample tasks included' : 'Sample tasks skipped',
    });
    return summary;
  });
}
