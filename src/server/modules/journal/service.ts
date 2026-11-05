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
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { q } from '@/server/db/sql';
import type { DbExecutor, Transaction } from '@/server/db/client';
import {
  dailyReviews,
  journalEntries,
  journalEntryTags,
  journalEntryTasks,
  projects,
  tags,
  tasks,
  weeklyGoals,
  workspaces,
} from '@/server/db/schema';
import { withTransaction } from '@/server/db/transaction';
import { NotFoundError, ValidationError } from '@/server/http/errors';
import type {
  CreateJournalEntryInput,
  DailyReviewInput,
  ListJournalQuery,
  UpdateJournalEntryInput,
  WeeklyGoalInput,
} from '@/lib/validation/journal';
import { recordActivity } from '../activity/record';
import { getWorkspace } from '../workspaces/service';

/* ------------------------------------------------------------------ */
/* Journal entries                                                     */
/* ------------------------------------------------------------------ */

const entryTagsJson = sql<
  { id: string; name: string; color: string | null }[]
>`coalesce((select json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) order by t.name) from journal_entry_tags jt join tags t on t.id = jt.tag_id where jt.entry_id = ${q(journalEntries.id)}), '[]'::json)`;
const entryTasksJson = sql<
  { id: string; taskNumber: number; title: string }[]
>`coalesce((select json_agg(json_build_object('id', k.id, 'taskNumber', k.task_number, 'title', k.title) order by k.task_number) from journal_entry_tasks jk join tasks k on k.id = jk.task_id where jk.entry_id = ${q(journalEntries.id)}), '[]'::json)`;

function entryQuery(db: DbExecutor) {
  return db
    .select({
      entry: journalEntries,
      workspaceName: workspaces.name,
      projectName: projects.name,
      tags: entryTagsJson,
      tasks: entryTasksJson,
    })
    .from(journalEntries)
    .leftJoin(workspaces, eq(workspaces.id, journalEntries.workspaceId))
    .leftJoin(projects, eq(projects.id, journalEntries.projectId));
}

type EntryRow = Awaited<ReturnType<ReturnType<typeof entryQuery>['execute']>>[number];

function toEntry(row: EntryRow) {
  return {
    ...row.entry,
    workspaceName: row.workspaceName,
    projectName: row.projectName,
    tags: row.tags ?? [],
    tasks: row.tasks ?? [],
  };
}
export type JournalEntryView = ReturnType<typeof toEntry>;

export async function getJournalEntry(db: DbExecutor, userId: string, entryId: string) {
  const [row] = await entryQuery(db)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, entryId)))
    .limit(1);
  if (!row) throw new NotFoundError('Journal entry not found.');
  return toEntry(row);
}

export async function listJournalEntries(db: DbExecutor, userId: string, query: ListJournalQuery) {
  const conditions: SQL[] = [eq(journalEntries.userId, userId), isNull(journalEntries.archivedAt)];
  if (query.workspaceId) conditions.push(eq(journalEntries.workspaceId, query.workspaceId));
  if (query.projectId) conditions.push(eq(journalEntries.projectId, query.projectId));
  if (query.entryType) conditions.push(eq(journalEntries.entryType, query.entryType));
  if (query.from) conditions.push(gte(journalEntries.entryDate, query.from));
  if (query.to) conditions.push(lte(journalEntries.entryDate, query.to));
  if (query.taskId) {
    conditions.push(
      sql`exists (select 1 from ${journalEntryTasks} where ${q(journalEntryTasks.entryId)} = ${q(journalEntries.id)} and ${q(journalEntryTasks.taskId)} = ${query.taskId})`,
    );
  }
  if (query.search) {
    const term = `%${query.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conditions.push(or(ilike(journalEntries.title, term), ilike(journalEntries.content, term))!);
  }
  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    entryQuery(db)
      .where(where)
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(where),
  ]);
  return { items: rows.map(toEntry), total };
}

async function assertWorkspaceAndProject(
  db: DbExecutor,
  userId: string,
  workspaceId: string | null | undefined,
  projectId: string | null | undefined,
) {
  if (workspaceId) await getWorkspace(db, userId, workspaceId);
  if (projectId) {
    if (!workspaceId) {
      throw new ValidationError('Choose a workspace before linking a project.', [
        { path: 'projectId', message: 'Projects belong to a workspace.' },
      ]);
    }
    const [row] = await db
      .select({ id: projects.id })
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
      throw new ValidationError('The project does not belong to that workspace.', [
        { path: 'projectId', message: 'Choose a project from the selected workspace.' },
      ]);
    }
  }
}

async function replaceEntryLinks(
  tx: Transaction,
  userId: string,
  entryId: string,
  links: { tagIds?: string[]; taskIds?: string[] },
) {
  if (links.tagIds) {
    const unique = [...new Set(links.tagIds)];
    if (unique.length) {
      const owned = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.id, unique)));
      if (owned.length !== unique.length) {
        throw new ValidationError('Some tags were not found.', [
          { path: 'tagIds', message: 'Use your own tags.' },
        ]);
      }
    }
    await tx.delete(journalEntryTags).where(eq(journalEntryTags.entryId, entryId));
    if (unique.length) {
      await tx.insert(journalEntryTags).values(unique.map((tagId) => ({ userId, entryId, tagId })));
    }
  }
  if (links.taskIds) {
    const unique = [...new Set(links.taskIds)];
    if (unique.length) {
      const owned = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, unique)));
      if (owned.length !== unique.length) {
        throw new ValidationError('Some tasks were not found.', [
          { path: 'taskIds', message: 'Use your own tasks.' },
        ]);
      }
    }
    await tx.delete(journalEntryTasks).where(eq(journalEntryTasks.entryId, entryId));
    if (unique.length) {
      await tx
        .insert(journalEntryTasks)
        .values(unique.map((taskId) => ({ userId, entryId, taskId })));
    }
  }
}

export async function createJournalEntry(
  db: DbExecutor,
  userId: string,
  input: CreateJournalEntryInput,
) {
  return withTransaction(db, async (tx) => {
    await assertWorkspaceAndProject(tx, userId, input.workspaceId, input.projectId);
    const [row] = await tx
      .insert(journalEntries)
      .values({
        userId,
        workspaceId: input.workspaceId ?? null,
        projectId: input.projectId ?? null,
        title: input.title,
        content: input.content ?? '',
        entryType: input.entryType ?? 'general',
        entryDate: input.entryDate,
      })
      .returning();
    await replaceEntryLinks(tx, userId, row!.id, { tagIds: input.tagIds, taskIds: input.taskIds });
    // Journal content is private: the timeline only records that an entry exists.
    await recordActivity(tx, {
      userId,
      workspaceId: row!.workspaceId,
      projectId: row!.projectId,
      eventType: 'journal.created',
      entityType: 'journal_entry',
      entityId: row!.id,
      summary: `Journal entry added · ${row!.entryType.replace('_', ' ')}`,
      detail: row!.entryDate,
    });
    return getJournalEntry(tx, userId, row!.id);
  });
}

export async function updateJournalEntry(
  db: DbExecutor,
  userId: string,
  entryId: string,
  input: UpdateJournalEntryInput,
) {
  return withTransaction(db, async (tx) => {
    const current = await getJournalEntry(tx, userId, entryId);
    const workspaceId = input.workspaceId === undefined ? current.workspaceId : input.workspaceId;
    const projectId = input.projectId === undefined ? current.projectId : input.projectId;
    await assertWorkspaceAndProject(tx, userId, workspaceId, projectId);
    await tx
      .update(journalEntries)
      .set({
        workspaceId: workspaceId ?? null,
        projectId: projectId ?? null,
        title: input.title ?? current.title,
        content: input.content ?? current.content,
        entryType: input.entryType ?? current.entryType,
        entryDate: input.entryDate ?? current.entryDate,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, entryId));
    await replaceEntryLinks(tx, userId, entryId, { tagIds: input.tagIds, taskIds: input.taskIds });
    return getJournalEntry(tx, userId, entryId);
  });
}

export async function archiveJournalEntry(db: DbExecutor, userId: string, entryId: string) {
  const updated = await db
    .update(journalEntries)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, entryId)))
    .returning({ id: journalEntries.id });
  if (!updated.length) throw new NotFoundError('Journal entry not found.');
}

/* ------------------------------------------------------------------ */
/* Weekly goals                                                        */
/* ------------------------------------------------------------------ */

export function weekEndFor(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  return start.toISOString().slice(0, 10);
}

export async function listWeeklyGoals(
  db: DbExecutor,
  userId: string,
  weekStartDate: string,
  workspaceId?: string,
) {
  const conditions = [eq(weeklyGoals.userId, userId), eq(weeklyGoals.weekStartDate, weekStartDate)];
  if (workspaceId)
    conditions.push(or(eq(weeklyGoals.workspaceId, workspaceId), isNull(weeklyGoals.workspaceId))!);
  return db
    .select({ goal: weeklyGoals, workspaceName: workspaces.name })
    .from(weeklyGoals)
    .leftJoin(workspaces, eq(workspaces.id, weeklyGoals.workspaceId))
    .where(and(...conditions))
    .orderBy(asc(weeklyGoals.position), asc(weeklyGoals.createdAt))
    .then((rows) => rows.map((row) => ({ ...row.goal, workspaceName: row.workspaceName })));
}

export async function createWeeklyGoal(db: DbExecutor, userId: string, input: WeeklyGoalInput) {
  return withTransaction(db, async (tx) => {
    if (input.workspaceId) await getWorkspace(tx, userId, input.workspaceId);
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(weeklyGoals)
      .where(
        and(eq(weeklyGoals.userId, userId), eq(weeklyGoals.weekStartDate, input.weekStartDate)),
      );
    const [row] = await tx
      .insert(weeklyGoals)
      .values({
        userId,
        workspaceId: input.workspaceId ?? null,
        title: input.title,
        description: input.description ?? '',
        weekStartDate: input.weekStartDate,
        weekEndDate: weekEndFor(input.weekStartDate),
        status: input.status ?? 'planned',
        position: input.position ?? total,
        completedAt: input.status === 'completed' ? new Date() : null,
      })
      .returning();
    await recordActivity(tx, {
      userId,
      workspaceId: row!.workspaceId,
      eventType: 'goal.created',
      entityType: 'weekly_goal',
      entityId: row!.id,
      summary: `Weekly goal set: ${row!.title}`,
      detail: `Week of ${row!.weekStartDate}`,
    });
    return row!;
  });
}

export async function updateWeeklyGoal(
  db: DbExecutor,
  userId: string,
  goalId: string,
  input: Partial<Omit<WeeklyGoalInput, 'weekStartDate'>>,
) {
  return withTransaction(db, async (tx) => {
    const [current] = await tx
      .select()
      .from(weeklyGoals)
      .where(and(eq(weeklyGoals.userId, userId), eq(weeklyGoals.id, goalId)))
      .limit(1);
    if (!current) throw new NotFoundError('Weekly goal not found.');
    if (input.workspaceId) await getWorkspace(tx, userId, input.workspaceId);
    const status = input.status ?? current.status;
    const [row] = await tx
      .update(weeklyGoals)
      .set({
        workspaceId: input.workspaceId === undefined ? current.workspaceId : input.workspaceId,
        title: input.title ?? current.title,
        description: input.description ?? current.description,
        status,
        position: input.position ?? current.position,
        completedAt: status === 'completed' ? (current.completedAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(weeklyGoals.id, goalId))
      .returning();
    if (status !== current.status) {
      await recordActivity(tx, {
        userId,
        workspaceId: row!.workspaceId,
        eventType: status === 'completed' ? 'goal.completed' : 'goal.updated',
        entityType: 'weekly_goal',
        entityId: goalId,
        summary:
          status === 'completed'
            ? `Weekly goal achieved: ${row!.title}`
            : `Weekly goal ${status.replace('_', ' ')}: ${row!.title}`,
        detail: `Week of ${row!.weekStartDate}`,
      });
    }
    return row!;
  });
}

export async function deleteWeeklyGoal(db: DbExecutor, userId: string, goalId: string) {
  const deleted = await db
    .delete(weeklyGoals)
    .where(and(eq(weeklyGoals.userId, userId), eq(weeklyGoals.id, goalId)))
    .returning({ id: weeklyGoals.id });
  if (!deleted.length) throw new NotFoundError('Weekly goal not found.');
}

/* ------------------------------------------------------------------ */
/* Daily notes and reviews                                             */
/* ------------------------------------------------------------------ */

export async function getDailyReview(
  db: DbExecutor,
  userId: string,
  reviewDate: string,
  workspaceId?: string | null,
) {
  const [row] = await db
    .select()
    .from(dailyReviews)
    .where(
      and(
        eq(dailyReviews.userId, userId),
        eq(dailyReviews.reviewDate, reviewDate),
        workspaceId ? eq(dailyReviews.workspaceId, workspaceId) : isNull(dailyReviews.workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listDailyReviews(db: DbExecutor, userId: string, from: string, to: string) {
  return db
    .select()
    .from(dailyReviews)
    .where(
      and(
        eq(dailyReviews.userId, userId),
        gte(dailyReviews.reviewDate, from),
        lte(dailyReviews.reviewDate, to),
      ),
    )
    .orderBy(desc(dailyReviews.reviewDate));
}

export async function upsertDailyReview(db: DbExecutor, userId: string, input: DailyReviewInput) {
  return withTransaction(db, async (tx) => {
    if (input.workspaceId) await getWorkspace(tx, userId, input.workspaceId);
    const existing = await getDailyReview(tx, userId, input.reviewDate, input.workspaceId ?? null);
    const reviewedAt =
      input.reviewed === undefined
        ? (existing?.reviewedAt ?? null)
        : input.reviewed
          ? (existing?.reviewedAt ?? new Date())
          : null;
    const values = {
      notes: input.notes ?? existing?.notes ?? '',
      accomplishments: input.accomplishments ?? existing?.accomplishments ?? '',
      blockers: input.blockers ?? existing?.blockers ?? '',
      learnings: input.learnings ?? existing?.learnings ?? '',
      tomorrowPriorities: input.tomorrowPriorities ?? existing?.tomorrowPriorities ?? '',
      rating: input.rating === undefined ? (existing?.rating ?? null) : input.rating,
      reviewedAt,
      updatedAt: new Date(),
    };
    let row;
    if (existing) {
      [row] = await tx
        .update(dailyReviews)
        .set(values)
        .where(eq(dailyReviews.id, existing.id))
        .returning();
    } else {
      [row] = await tx
        .insert(dailyReviews)
        .values({
          userId,
          workspaceId: input.workspaceId ?? null,
          reviewDate: input.reviewDate,
          ...values,
        })
        .returning();
    }
    if (input.reviewed && !existing?.reviewedAt) {
      await recordActivity(tx, {
        userId,
        workspaceId: input.workspaceId ?? null,
        eventType: 'review.completed',
        entityType: 'daily_review',
        entityId: row!.id,
        summary: `Daily review completed for ${input.reviewDate}`,
        detail: row!.rating ? `Rated ${row!.rating}/5` : '',
      });
    }
    return row!;
  });
}
