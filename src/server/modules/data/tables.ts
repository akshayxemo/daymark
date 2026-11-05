import type { PgTable } from 'drizzle-orm/pg-core';
import * as s from '@/server/db/schema';

/**
 * Every user-owned table that takes part in export and restore, in insertion
 * order (parents before children). `refs` lists foreign-key columns that hold
 * identifiers of other exported rows; they are remapped to fresh identifiers
 * on restore so imported data can never collide with or point at existing
 * records.
 */
export type TableSpec = {
  key: string;
  table: PgTable;
  /** Primary key column remapped on restore (null for join tables). */
  id: string | null;
  refs: string[];
  /** Exported for completeness but not re-imported (sensitive or derived). */
  exportOnly?: boolean;
};

export const tableSpecs: TableSpec[] = [
  { key: 'workspaces', table: s.workspaces, id: 'id', refs: [] },
  { key: 'workspaceSettings', table: s.workspaceSettings, id: null, refs: ['workspaceId'] },
  { key: 'taskTypes', table: s.taskTypes, id: 'id', refs: ['workspaceId'] },
  { key: 'taskStatuses', table: s.taskStatuses, id: 'id', refs: ['workspaceId'] },
  { key: 'taskPhases', table: s.taskPhases, id: 'id', refs: ['workspaceId', 'taskTypeId'] },
  { key: 'tags', table: s.tags, id: 'id', refs: ['workspaceId'] },
  { key: 'projects', table: s.projects, id: 'id', refs: ['workspaceId'] },
  { key: 'repositories', table: s.repositories, id: 'id', refs: ['workspaceId'] },
  // parentTaskId is restored in a second pass (self reference).
  {
    key: 'tasks',
    table: s.tasks,
    id: 'id',
    refs: ['workspaceId', 'projectId', 'taskTypeId', 'statusId', 'phaseId'],
  },
  { key: 'taskTags', table: s.taskTags, id: null, refs: ['workspaceId', 'taskId', 'tagId'] },
  {
    key: 'taskDependencies',
    table: s.taskDependencies,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'dependsOnTaskId'],
  },
  {
    key: 'taskStatusHistory',
    table: s.taskStatusHistory,
    id: 'id',
    refs: ['taskId', 'previousStatusId', 'newStatusId'],
  },
  {
    key: 'taskPhaseHistory',
    table: s.taskPhaseHistory,
    id: 'id',
    refs: ['taskId', 'previousPhaseId', 'newPhaseId'],
  },
  { key: 'taskPlans', table: s.taskPlans, id: 'id', refs: ['taskId'] },
  {
    key: 'workSessions',
    table: s.workSessions,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'phaseId'],
  },
  { key: 'workSessionIntervals', table: s.workSessionIntervals, id: 'id', refs: ['sessionId'] },
  {
    key: 'timeEntries',
    table: s.timeEntries,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'phaseId'],
  },
  { key: 'timeEntryAudit', table: s.timeEntryAudit, id: 'id', refs: ['timeEntryId'] },
  {
    key: 'taskRepositories',
    table: s.taskRepositories,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'repositoryId'],
  },
  {
    key: 'developmentReferences',
    table: s.developmentReferences,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'repositoryId'],
  },
  {
    key: 'deliveryRecords',
    table: s.deliveryRecords,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'repositoryId'],
  },
  { key: 'weeklyGoals', table: s.weeklyGoals, id: 'id', refs: ['workspaceId'] },
  { key: 'dailyReviews', table: s.dailyReviews, id: 'id', refs: ['workspaceId'] },
  { key: 'journalEntries', table: s.journalEntries, id: 'id', refs: ['workspaceId', 'projectId'] },
  { key: 'journalEntryTags', table: s.journalEntryTags, id: null, refs: ['entryId', 'tagId'] },
  { key: 'journalEntryTasks', table: s.journalEntryTasks, id: null, refs: ['entryId', 'taskId'] },
  {
    key: 'activityEvents',
    table: s.activityEvents,
    id: 'id',
    refs: ['workspaceId', 'taskId', 'projectId'],
  },
  { key: 'auditLogs', table: s.auditLogs, id: 'id', refs: [], exportOnly: true },
];

export const EXPORT_FORMAT = 'daymark-export';
export const EXPORT_VERSION = 1;
