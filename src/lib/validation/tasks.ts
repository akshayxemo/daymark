import { z } from 'zod';
import { isoDateSchema, paginationSchema, queryBoolean, uuidSchema } from './common';

export const prioritySchema = z.enum(['low', 'medium', 'high']);
export type Priority = z.infer<typeof prioritySchema>;

const titleSchema = z.string().trim().min(1, 'Give the task a name.').max(200);
const descriptionSchema = z.string().max(20000);
const estimateSchema = z.number().int().min(0).max(100000).nullable();

export const createTaskSchema = z.object({
  workspaceId: uuidSchema,
  title: titleSchema,
  description: descriptionSchema.default(''),
  projectId: uuidSchema.nullable().optional(),
  parentTaskId: uuidSchema.nullable().optional(),
  taskTypeId: uuidSchema.optional(),
  statusId: uuidSchema.optional(),
  phaseId: uuidSchema.nullable().optional(),
  priority: prioritySchema.default('medium'),
  estimatedMinutes: estimateSchema.optional(),
  plannedDate: isoDateSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
  tagIds: z.array(uuidSchema).max(20).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Status, phase and planned date change through dedicated operations so history is always recorded. */
export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  projectId: uuidSchema.nullable().optional(),
  parentTaskId: uuidSchema.nullable().optional(),
  taskTypeId: uuidSchema.optional(),
  priority: prioritySchema.optional(),
  estimatedMinutes: estimateSchema.optional(),
  dueDate: isoDateSchema.nullable().optional(),
  tagIds: z.array(uuidSchema).max(20).optional(),
  position: z.number().int().min(0).max(100000).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const changeStatusSchema = z.object({
  statusId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const changePhaseSchema = z.object({
  phaseId: uuidSchema.nullable(),
  notes: z.string().trim().max(500).optional(),
});
export type ChangePhaseInput = z.infer<typeof changePhaseSchema>;

export const planTaskSchema = z.object({
  plannedDate: isoDateSchema.nullable(),
  plannedMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  reason: z.enum(['moved', 'carryover', 'unplanned']).optional(),
});
export type PlanTaskInput = z.infer<typeof planTaskSchema>;

export const carryOverSchema = z.object({
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
  workspaceId: uuidSchema.optional(),
  taskIds: z.array(uuidSchema).max(200).optional(),
});
export type CarryOverInput = z.infer<typeof carryOverSchema>;

export const dependencySchema = z.object({
  dependsOnTaskId: uuidSchema,
});

export const taskSortSchema = z.enum([
  'updated',
  'created',
  'planned',
  'due',
  'priority',
  'title',
  'number',
]);

export const listTasksQuerySchema = paginationSchema.extend({
  workspaceId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  parentTaskId: uuidSchema.optional(),
  statusId: uuidSchema.optional(),
  statusCategory: z
    .enum(['not_started', 'active', 'paused', 'waiting', 'done', 'closed'])
    .optional(),
  phaseId: uuidSchema.optional(),
  priority: prioritySchema.optional(),
  tagId: uuidSchema.optional(),
  search: z.string().trim().max(120).optional(),
  plannedFrom: isoDateSchema.optional(),
  plannedTo: isoDateSchema.optional(),
  dueFrom: isoDateSchema.optional(),
  dueTo: isoDateSchema.optional(),
  completed: queryBoolean,
  includeArchived: queryBoolean,
  topLevelOnly: queryBoolean,
  sort: taskSortSchema.default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
