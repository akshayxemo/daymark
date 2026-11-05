import { z } from 'zod';
import { isoDateSchema, queryBoolean, uuidSchema } from './common';

export const projectStatusSchema = z.enum(['active', 'on_hold', 'completed']);

export const createProjectSchema = z.object({
  workspaceId: uuidSchema,
  name: z.string().trim().min(1, 'Enter a project name.').max(120),
  description: z.string().trim().max(2000).default(''),
  status: projectStatusSchema.default('active'),
  color: z.string().trim().max(20).nullable().optional(),
  startDate: isoDateSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.omit({ workspaceId: true }).partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  includeArchived: queryBoolean,
});
