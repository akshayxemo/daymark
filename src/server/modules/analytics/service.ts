import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '@/server/db/client';
import { localDay, timezoneLiteral, q } from '@/server/db/sql';
import {
  deliveryRecords,
  projects,
  taskPhases,
  taskPlans,
  taskStatusHistory,
  taskStatuses,
  taskTypes,
  tasks,
  timeEntries,
  workSessions,
  workspaces,
} from '@/server/db/schema';
import { addDays, eachDay, endOfWeek, startOfWeek } from '@/lib/dates';
import { dailyTotals } from '../time/service';
import { tasksPlannedOn, type TaskSummary } from '../tasks/service';

export type AnalyticsRange = {
  from: string;
  to: string;
  workspaceId?: string;
  timezone: string;
};

const tzDate = localDay;
const scopeTo = (workspaceId: string | undefined) => (column: AnyPgColumn) =>
  workspaceId ? eq(column, workspaceId) : undefined;

/* ------------------------------------------------------------------ */
/* Overview dashboard                                                  */
/* ------------------------------------------------------------------ */

export type OverviewMetrics = {
  today: string;
  range: { from: string; to: string };
  plannedToday: { total: number; completed: number; tasks: TaskSummary[] };
  completedInRange: number;
  tracked: {
    totalSeconds: number;
    sessions: number;
    manualEntries: number;
    longestSessionSeconds: number;
    byWorkspace: { workspaceId: string; workspaceName: string; color: string; seconds: number }[];
    byDay: { day: string; byWorkspace: Record<string, number>; seconds: number }[];
  };
  week: {
    from: string;
    to: string;
    planned: number;
    completed: number;
    rate: number | null;
    carriedOver: number;
  };
  deliveries: { productionVerified: number; productionDeployed: number; merged: number };
  attention: {
    overdue: TaskSummary[];
    blocked: TaskSummary[];
    carryoverCandidates: TaskSummary[];
  };
  upcoming: TaskSummary[];
};

export async function overviewMetrics(
  db: DbExecutor,
  userId: string,
  options: AnalyticsRange & { today: string; weekStartsOn: number },
): Promise<OverviewMetrics> {
  const { from, to, workspaceId, timezone, today } = options;
  const weekFrom = startOfWeek(today, options.weekStartsOn);
  const weekTo = endOfWeek(today, options.weekStartsOn);
  const scope = scopeTo(workspaceId);

  const [
    plannedToday,
    [{ completedInRange }],
    totals,
    sessionStats,
    workspaceRows,
    weekPlanned,
    [{ carriedOver }],
    deliveryRows,
    overdue,
    blocked,
    carryoverCandidates,
    upcoming,
  ] = await Promise.all([
    tasksPlannedOn(db, userId, today, workspaceId),
    db
      .select({ completedInRange: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          isNotNull(tasks.completedAt),
          gte(tzDate(tasks.completedAt, timezone), from),
          lte(tzDate(tasks.completedAt, timezone), to),
        ),
      ),
    dailyTotals(db, userId, { from, to, workspaceId }, timezone),
    db
      .select({
        longest: sql<number>`coalesce(max(${workSessions.durationSeconds}), 0)::int`,
      })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.userId, userId),
          scope(workSessions.workspaceId),
          eq(workSessions.status, 'completed'),
          gte(tzDate(workSessions.startedAt, timezone), from),
          lte(tzDate(workSessions.startedAt, timezone), to),
        ),
      ),
    db
      .select({ id: workspaces.id, name: workspaces.name, color: workspaces.color })
      .from(workspaces)
      .where(and(eq(workspaces.userId, userId), isNull(workspaces.archivedAt)))
      .orderBy(asc(workspaces.position)),
    db
      .select({
        taskId: taskPlans.taskId,
        completed: sql<boolean>`bool_or(${taskStatuses.countsAsCompleted})`,
      })
      .from(taskPlans)
      .innerJoin(tasks, eq(tasks.id, taskPlans.taskId))
      .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
      .where(
        and(
          eq(taskPlans.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          gte(taskPlans.plannedDate, weekFrom),
          lte(taskPlans.plannedDate, weekTo),
        ),
      )
      .groupBy(taskPlans.taskId),
    db
      .select({ carriedOver: sql<number>`count(*)::int` })
      .from(taskPlans)
      .innerJoin(tasks, eq(tasks.id, taskPlans.taskId))
      .where(
        and(
          eq(taskPlans.userId, userId),
          scope(tasks.workspaceId),
          eq(taskPlans.reason, 'carryover'),
          gte(taskPlans.plannedDate, weekFrom),
          lte(taskPlans.plannedDate, weekTo),
        ),
      ),
    db
      .select({
        deliveryType: deliveryRecords.deliveryType,
        environment: deliveryRecords.environment,
        total: sql<number>`count(*)::int`,
      })
      .from(deliveryRecords)
      .where(
        and(
          eq(deliveryRecords.userId, userId),
          scope(deliveryRecords.workspaceId),
          eq(deliveryRecords.deliveryStatus, 'successful'),
          gte(tzDate(deliveryRecords.deliveredAt, timezone), from),
          lte(tzDate(deliveryRecords.deliveredAt, timezone), to),
        ),
      )
      .groupBy(deliveryRecords.deliveryType, deliveryRecords.environment),
    attentionTasks(db, userId, { kind: 'overdue', today, workspaceId }),
    attentionTasks(db, userId, { kind: 'blocked', today, workspaceId }),
    attentionTasks(db, userId, { kind: 'carryover', today, workspaceId }),
    attentionTasks(db, userId, { kind: 'upcoming', today, workspaceId }),
  ]);

  const byWorkspaceMap = new Map<string, number>();
  for (const row of totals)
    byWorkspaceMap.set(row.workspaceId, (byWorkspaceMap.get(row.workspaceId) ?? 0) + row.seconds);
  const byDay = eachDay(from, to).map((day) => {
    const rows = totals.filter((row) => row.day === day);
    const perWorkspace: Record<string, number> = {};
    for (const row of rows)
      perWorkspace[row.workspaceId] = (perWorkspace[row.workspaceId] ?? 0) + row.seconds;
    return { day, byWorkspace: perWorkspace, seconds: rows.reduce((n, row) => n + row.seconds, 0) };
  });
  const weekCompleted = weekPlanned.filter((row) => row.completed).length;
  const count = (type: string, environment?: string) =>
    deliveryRows
      .filter(
        (row) => row.deliveryType === type && (!environment || row.environment === environment),
      )
      .reduce((n, row) => n + row.total, 0);

  return {
    today,
    range: { from, to },
    plannedToday: {
      total: plannedToday.length,
      completed: plannedToday.filter((task) => task.status.countsAsCompleted).length,
      tasks: plannedToday,
    },
    completedInRange,
    tracked: {
      totalSeconds: totals.reduce((n, row) => n + row.seconds, 0),
      sessions: totals.reduce((n, row) => n + row.sessions, 0),
      manualEntries: totals.reduce((n, row) => n + row.manual, 0),
      longestSessionSeconds: sessionStats[0]?.longest ?? 0,
      byWorkspace: workspaceRows.map((row) => ({
        workspaceId: row.id,
        workspaceName: row.name,
        color: row.color,
        seconds: byWorkspaceMap.get(row.id) ?? 0,
      })),
      byDay,
    },
    week: {
      from: weekFrom,
      to: weekTo,
      planned: weekPlanned.length,
      completed: weekCompleted,
      rate: weekPlanned.length ? Math.round((weekCompleted / weekPlanned.length) * 100) : null,
      carriedOver,
    },
    deliveries: {
      productionVerified: count('verified', 'production'),
      productionDeployed: count('deployed', 'production'),
      merged: count('merged'),
    },
    attention: { overdue, blocked, carryoverCandidates },
    upcoming,
  };
}

async function attentionTasks(
  db: DbExecutor,
  userId: string,
  options: {
    kind: 'overdue' | 'blocked' | 'carryover' | 'upcoming';
    today: string;
    workspaceId?: string;
  },
): Promise<TaskSummary[]> {
  const { listTasks } = await import('../tasks/service');
  const base = {
    limit: 8,
    offset: 0,
    sort: 'due' as const,
    order: 'asc' as const,
    workspaceId: options.workspaceId,
    completed: false as const,
    includeArchived: undefined,
    topLevelOnly: undefined,
  };
  switch (options.kind) {
    case 'overdue':
      return (await listTasks(db, userId, { ...base, dueTo: addDays(options.today, -1) })).items;
    case 'blocked':
      return (
        await listTasks(db, userId, {
          ...base,
          statusCategory: 'waiting',
          sort: 'updated',
          order: 'desc',
        })
      ).items;
    case 'carryover':
      return (
        await listTasks(db, userId, {
          ...base,
          plannedTo: addDays(options.today, -1),
          sort: 'planned',
          order: 'asc',
        })
      ).items;
    default:
      return (
        await listTasks(db, userId, {
          ...base,
          dueFrom: options.today,
          dueTo: addDays(options.today, 7),
        })
      ).items;
  }
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export type ReportMetrics = Awaited<ReturnType<typeof reportMetrics>>;

export async function reportMetrics(db: DbExecutor, userId: string, options: AnalyticsRange) {
  const { from, to, workspaceId, timezone } = options;
  const scope = scopeTo(workspaceId);
  const completedDay = tzDate(tasks.completedAt, timezone);
  const createdDay = tzDate(tasks.createdAt, timezone);

  const [
    completedByDay,
    createdByDay,
    totals,
    byProject,
    byPhase,
    sessionsByPhase,
    estimateRows,
    cycleRows,
    carryoverRows,
    plannedRows,
    deliveryRows,
    eligibleRows,
    openByPhase,
    workspaceRows,
  ] = await Promise.all([
    db
      .select({
        day: completedDay,
        workspaceId: tasks.workspaceId,
        total: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          isNotNull(tasks.completedAt),
          gte(completedDay, from),
          lte(completedDay, to),
        ),
      )
      .groupBy(completedDay, tasks.workspaceId),
    db
      .select({ day: createdDay, total: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          gte(createdDay, from),
          lte(createdDay, to),
        ),
      )
      .groupBy(createdDay),
    dailyTotals(db, userId, { from, to, workspaceId }, timezone),
    db
      .select({
        projectId: tasks.projectId,
        projectName: projects.name,
        workspaceId: tasks.workspaceId,
        sessionSeconds: sql<number>`coalesce((select sum(${q(workSessions.durationSeconds)}) from ${workSessions} where ${q(workSessions.taskId)} = ${q(tasks.id)} and ${q(workSessions.status)} = 'completed' and to_char(${q(workSessions.startedAt)} at time zone ${timezoneLiteral(timezone)}, 'YYYY-MM-DD') between ${from} and ${to}), 0)::int`,
        manualSeconds: sql<number>`coalesce((select sum(${q(timeEntries.durationSeconds)}) from ${timeEntries} where ${q(timeEntries.taskId)} = ${q(tasks.id)} and ${q(timeEntries.deletedAt)} is null and ${q(timeEntries.workDate)} between ${from} and ${to}), 0)::int`,
        completed: sql<number>`case when ${tasks.completedAt} is not null and ${completedDay} between ${from} and ${to} then 1 else 0 end`,
      })
      .from(tasks)
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(tasks.userId, userId), scope(tasks.workspaceId), isNull(tasks.archivedAt))),
    db
      .select({
        phaseName: sql<string>`coalesce(${taskPhases.name}, 'No phase')`,
        seconds: sql<number>`coalesce(sum(${timeEntries.durationSeconds}), 0)::int`,
      })
      .from(timeEntries)
      .leftJoin(taskPhases, eq(taskPhases.id, timeEntries.phaseId))
      .where(
        and(
          eq(timeEntries.userId, userId),
          scope(timeEntries.workspaceId),
          isNull(timeEntries.deletedAt),
          gte(timeEntries.workDate, from),
          lte(timeEntries.workDate, to),
        ),
      )
      .groupBy(taskPhases.name),
    db
      .select({
        phaseName: sql<string>`coalesce(${taskPhases.name}, 'No phase')`,
        seconds: sql<number>`coalesce(sum(${workSessions.durationSeconds}), 0)::int`,
      })
      .from(workSessions)
      .leftJoin(taskPhases, eq(taskPhases.id, workSessions.phaseId))
      .where(
        and(
          eq(workSessions.userId, userId),
          scope(workSessions.workspaceId),
          eq(workSessions.status, 'completed'),
          gte(tzDate(workSessions.startedAt, timezone), from),
          lte(tzDate(workSessions.startedAt, timezone), to),
        ),
      )
      .groupBy(taskPhases.name),
    db
      .select({
        id: tasks.id,
        taskNumber: tasks.taskNumber,
        title: tasks.title,
        estimatedMinutes: tasks.estimatedMinutes,
        actualSeconds: sql<number>`coalesce((select sum(${q(workSessions.durationSeconds)}) from ${workSessions} where ${q(workSessions.taskId)} = ${q(tasks.id)} and ${q(workSessions.status)} = 'completed'), 0)::int + coalesce((select sum(${q(timeEntries.durationSeconds)}) from ${timeEntries} where ${q(timeEntries.taskId)} = ${q(tasks.id)} and ${q(timeEntries.deletedAt)} is null), 0)::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          isNotNull(tasks.completedAt),
          gte(completedDay, from),
          lte(completedDay, to),
          sql`${tasks.estimatedMinutes} > 0`,
        ),
      )
      .orderBy(desc(tasks.completedAt))
      .limit(200),
    db
      .select({
        taskId: taskStatusHistory.taskId,
        changedAt: taskStatusHistory.changedAt,
        category: taskStatuses.category,
        countsAsCompleted: taskStatuses.countsAsCompleted,
      })
      .from(taskStatusHistory)
      .innerJoin(tasks, eq(tasks.id, taskStatusHistory.taskId))
      .innerJoin(taskStatuses, eq(taskStatuses.id, taskStatusHistory.newStatusId))
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNotNull(tasks.completedAt),
          gte(completedDay, from),
          lte(completedDay, to),
        ),
      )
      .orderBy(asc(taskStatusHistory.taskId), asc(taskStatusHistory.changedAt)),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${taskPlans.plannedDate}::date), 'YYYY-MM-DD')`,
        total: sql<number>`count(*)::int`,
      })
      .from(taskPlans)
      .innerJoin(tasks, eq(tasks.id, taskPlans.taskId))
      .where(
        and(
          eq(taskPlans.userId, userId),
          scope(tasks.workspaceId),
          eq(taskPlans.reason, 'carryover'),
          gte(taskPlans.plannedDate, from),
          lte(taskPlans.plannedDate, to),
        ),
      )
      .groupBy(sql`date_trunc('week', ${taskPlans.plannedDate}::date)`),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${taskPlans.plannedDate}::date), 'YYYY-MM-DD')`,
        total: sql<number>`count(distinct ${taskPlans.taskId})::int`,
      })
      .from(taskPlans)
      .innerJoin(tasks, eq(tasks.id, taskPlans.taskId))
      .where(
        and(
          eq(taskPlans.userId, userId),
          scope(tasks.workspaceId),
          inArray(taskPlans.reason, ['initial', 'moved', 'carryover']),
          gte(taskPlans.plannedDate, from),
          lte(taskPlans.plannedDate, to),
        ),
      )
      .groupBy(sql`date_trunc('week', ${taskPlans.plannedDate}::date)`),
    db
      .select({
        deliveryType: deliveryRecords.deliveryType,
        environment: deliveryRecords.environment,
        deliveryStatus: deliveryRecords.deliveryStatus,
        total: sql<number>`count(*)::int`,
      })
      .from(deliveryRecords)
      .where(
        and(
          eq(deliveryRecords.userId, userId),
          scope(deliveryRecords.workspaceId),
          gte(tzDate(deliveryRecords.deliveredAt, timezone), from),
          lte(tzDate(deliveryRecords.deliveredAt, timezone), to),
        ),
      )
      .groupBy(
        deliveryRecords.deliveryType,
        deliveryRecords.environment,
        deliveryRecords.deliveryStatus,
      ),
    db
      .select({
        id: tasks.id,
        delivered: sql<boolean>`exists (select 1 from ${deliveryRecords} where ${q(deliveryRecords.taskId)} = ${q(tasks.id)} and ${q(deliveryRecords.environment)} = 'production' and ${q(deliveryRecords.deliveryStatus)} = 'successful' and ${q(deliveryRecords.deliveryType)} in ('deployed', 'verified'))`,
        verified: sql<boolean>`exists (select 1 from ${deliveryRecords} where ${q(deliveryRecords.taskId)} = ${q(tasks.id)} and ${q(deliveryRecords.environment)} = 'production' and ${q(deliveryRecords.deliveryStatus)} = 'successful' and ${q(deliveryRecords.deliveryType)} = 'verified')`,
      })
      .from(tasks)
      .innerJoin(taskTypes, eq(taskTypes.id, tasks.taskTypeId))
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          isNotNull(tasks.completedAt),
          gte(completedDay, from),
          lte(completedDay, to),
          inArray(taskTypes.key, ['development', 'bug_fix']),
        ),
      ),
    db
      .select({
        phaseName: sql<string>`coalesce(${taskPhases.name}, 'No phase')`,
        total: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
      .leftJoin(taskPhases, eq(taskPhases.id, tasks.phaseId))
      .where(
        and(
          eq(tasks.userId, userId),
          scope(tasks.workspaceId),
          isNull(tasks.archivedAt),
          eq(taskStatuses.countsAsCompleted, false),
          eq(taskStatuses.isTerminal, false),
        ),
      )
      .groupBy(taskPhases.name),
    db
      .select({ id: workspaces.id, name: workspaces.name, color: workspaces.color })
      .from(workspaces)
      .where(eq(workspaces.userId, userId)),
  ]);

  const workspaceName = new Map(workspaceRows.map((row) => [row.id, row.name]));
  const days = eachDay(from, to);
  const daily = days.map((day) => ({
    day,
    completed: completedByDay.filter((row) => row.day === day).reduce((n, row) => n + row.total, 0),
    created: createdByDay.find((row) => row.day === day)?.total ?? 0,
    trackedSeconds: totals.filter((row) => row.day === day).reduce((n, row) => n + row.seconds, 0),
    sessions: totals.filter((row) => row.day === day).reduce((n, row) => n + row.sessions, 0),
  }));

  const completionByWorkspace = workspaceRows.map((row) => ({
    workspaceId: row.id,
    workspaceName: row.name,
    color: row.color,
    completed: completedByDay
      .filter((item) => item.workspaceId === row.id)
      .reduce((n, item) => n + item.total, 0),
    trackedSeconds: totals
      .filter((item) => item.workspaceId === row.id)
      .reduce((n, item) => n + item.seconds, 0),
  }));

  const projectMap = new Map<
    string,
    {
      projectId: string | null;
      projectName: string;
      workspaceName: string;
      seconds: number;
      completed: number;
      tasks: number;
    }
  >();
  for (const row of byProject) {
    const key = row.projectId ?? `none:${row.workspaceId}`;
    const entry = projectMap.get(key) ?? {
      projectId: row.projectId,
      projectName: row.projectName ?? 'No project',
      workspaceName: workspaceName.get(row.workspaceId) ?? '',
      seconds: 0,
      completed: 0,
      tasks: 0,
    };
    entry.seconds += row.sessionSeconds + row.manualSeconds;
    entry.completed += row.completed;
    entry.tasks += 1;
    projectMap.set(key, entry);
  }
  const projectDistribution = [...projectMap.values()]
    .filter((row) => row.seconds > 0 || row.completed > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 12);

  const phaseSeconds = new Map<string, number>();
  for (const row of [...byPhase, ...sessionsByPhase])
    phaseSeconds.set(row.phaseName, (phaseSeconds.get(row.phaseName) ?? 0) + row.seconds);
  const timeByPhase = [...phaseSeconds.entries()]
    .map(([phaseName, seconds]) => ({ phaseName, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const estimates = estimateRows
    .filter((row) => row.actualSeconds > 0)
    .map((row) => ({
      taskId: row.id,
      reference: `DM-${row.taskNumber}`,
      title: row.title,
      estimatedMinutes: row.estimatedMinutes ?? 0,
      actualMinutes: Math.round(row.actualSeconds / 60),
      ratio: Number((row.actualSeconds / 60 / (row.estimatedMinutes ?? 1)).toFixed(2)),
    }));
  const estimatedTotal = estimates.reduce((n, row) => n + row.estimatedMinutes, 0);
  const actualTotal = estimates.reduce((n, row) => n + row.actualMinutes, 0);

  // Cycle time: first active transition → first completed transition, with
  // time spent paused or waiting subtracted for the "active" variant.
  const byTask = new Map<string, typeof cycleRows>();
  for (const row of cycleRows) byTask.set(row.taskId, [...(byTask.get(row.taskId) ?? []), row]);
  const cycleTimes: { taskId: string; calendarHours: number; activeHours: number }[] = [];
  for (const [taskId, history] of byTask) {
    const start = history.find((row) => row.category === 'active');
    const end = history.find((row) => row.countsAsCompleted);
    if (!start || !end || end.changedAt <= start.changedAt) continue;
    let excluded = 0;
    for (let i = 0; i < history.length - 1; i += 1) {
      const current = history[i]!;
      const next = history[i + 1]!;
      if (current.changedAt < start.changedAt || current.changedAt >= end.changedAt) continue;
      if (current.category === 'paused' || current.category === 'waiting') {
        excluded +=
          Math.min(next.changedAt.getTime(), end.changedAt.getTime()) - current.changedAt.getTime();
      }
    }
    const calendar = end.changedAt.getTime() - start.changedAt.getTime();
    cycleTimes.push({
      taskId,
      calendarHours: Number((calendar / 3600000).toFixed(1)),
      activeHours: Number((Math.max(0, calendar - excluded) / 3600000).toFixed(1)),
    });
  }
  const average = (values: number[]) =>
    values.length ? Number((values.reduce((n, v) => n + v, 0) / values.length).toFixed(1)) : null;

  const weeks = [
    ...new Set([...plannedRows.map((row) => row.week), ...carryoverRows.map((row) => row.week)]),
  ].sort();
  const carryoverTrend = weeks.map((week) => {
    const planned = plannedRows.find((row) => row.week === week)?.total ?? 0;
    const carried = carryoverRows.find((row) => row.week === week)?.total ?? 0;
    return {
      week,
      planned,
      carriedOver: carried,
      rate: planned ? Math.round((carried / planned) * 100) : 0,
    };
  });

  const deliveries = {
    rows: deliveryRows,
    successfulByEnvironment: ['development', 'staging', 'uat', 'production', 'other'].map(
      (environment) => ({
        environment,
        merged: deliveryRows
          .filter(
            (r) =>
              r.environment === environment &&
              r.deliveryType === 'merged' &&
              r.deliveryStatus === 'successful',
          )
          .reduce((n, r) => n + r.total, 0),
        deployed: deliveryRows
          .filter(
            (r) =>
              r.environment === environment &&
              r.deliveryType === 'deployed' &&
              r.deliveryStatus === 'successful',
          )
          .reduce((n, r) => n + r.total, 0),
        verified: deliveryRows
          .filter(
            (r) =>
              r.environment === environment &&
              r.deliveryType === 'verified' &&
              r.deliveryStatus === 'successful',
          )
          .reduce((n, r) => n + r.total, 0),
        failed: deliveryRows
          .filter((r) => r.environment === environment && r.deliveryStatus === 'failed')
          .reduce((n, r) => n + r.total, 0),
      }),
    ),
    eligibleTasks: eligibleRows.length,
    deliveredTasks: eligibleRows.filter((row) => row.delivered).length,
    verifiedTasks: eligibleRows.filter((row) => row.verified).length,
    deliveryRate: eligibleRows.length
      ? Math.round((eligibleRows.filter((row) => row.delivered).length / eligibleRows.length) * 100)
      : null,
    verificationRate: eligibleRows.length
      ? Math.round((eligibleRows.filter((row) => row.verified).length / eligibleRows.length) * 100)
      : null,
  };

  return {
    range: { from, to },
    daily,
    completion: {
      completed: daily.reduce((n, row) => n + row.completed, 0),
      created: daily.reduce((n, row) => n + row.created, 0),
      byWorkspace: completionByWorkspace,
    },
    time: {
      totalSeconds: totals.reduce((n, row) => n + row.seconds, 0),
      sessionSeconds: totals.reduce((n, row) => n + (row.sessions ? row.seconds : 0), 0),
      byWorkspace: completionByWorkspace.map((row) => ({
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        color: row.color,
        seconds: row.trackedSeconds,
      })),
      byProject: projectDistribution,
      byPhase: timeByPhase,
    },
    estimation: {
      tasks: estimates.slice(0, 50),
      estimatedMinutes: estimatedTotal,
      actualMinutes: actualTotal,
      ratio: estimatedTotal ? Number((actualTotal / estimatedTotal).toFixed(2)) : null,
    },
    cycleTime: {
      tasks: cycleTimes.length,
      averageCalendarHours: average(cycleTimes.map((row) => row.calendarHours)),
      averageActiveHours: average(cycleTimes.map((row) => row.activeHours)),
    },
    carryover: carryoverTrend,
    deliveries,
    phases: openByPhase.sort((a, b) => b.total - a.total),
  };
}
