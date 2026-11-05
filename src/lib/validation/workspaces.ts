import { z } from 'zod';

export const workspaceKindSchema = z.enum(['professional', 'personal', 'learning', 'custom']);
export const workspaceColorSchema = z.enum(['accent', 'purple', 'orange', 'muted']);
export const workspaceIconSchema = z.enum([
  'briefcase',
  'leaf',
  'book',
  'code',
  'heart',
  'home',
  'star',
  'target',
  'globe',
]);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Give the workspace a name.').max(60),
  description: z.string().trim().max(500).default(''),
  kind: workspaceKindSchema.default('custom'),
  icon: workspaceIconSchema.default('briefcase'),
  color: workspaceColorSchema.default('accent'),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  icon: workspaceIconSchema.optional(),
  color: workspaceColorSchema.optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().min(0).max(1000).optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceSettingsSchema = z.object({
  workingDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  workingMinutesPerDay: z.number().int().min(0).max(1440).optional(),
  timezone: z.string().trim().max(64).nullable().optional(),
});
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export const statusCategorySchema = z.enum([
  'not_started',
  'active',
  'paused',
  'waiting',
  'done',
  'closed',
]);

export const statusInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  category: statusCategorySchema,
  color: z.string().trim().max(20).nullable().optional(),
  isInitial: z.boolean().default(false),
  isTerminal: z.boolean().default(false),
  isActive: z.boolean().default(false),
  countsAsCompleted: z.boolean().default(false),
  stopsTimer: z.boolean().default(false),
  position: z.number().int().min(0).max(1000).optional(),
});
export type StatusInput = z.infer<typeof statusInputSchema>;
export const statusUpdateSchema = statusInputSchema.partial();

export const taskTypeInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  isDefault: z.boolean().default(false),
  position: z.number().int().min(0).max(1000).optional(),
});
export type TaskTypeInput = z.infer<typeof taskTypeInputSchema>;
export const taskTypeUpdateSchema = taskTypeInputSchema.partial();

export const phaseInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  taskTypeId: z.uuid().nullable().optional(),
  position: z.number().int().min(0).max(1000).optional(),
  isEnabled: z.boolean().default(true),
});
export type PhaseInput = z.infer<typeof phaseInputSchema>;
export const phaseUpdateSchema = phaseInputSchema.partial();

export const tagInputSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().trim().max(20).nullable().optional(),
});
export type TagInput = z.infer<typeof tagInputSchema>;

export const onboardingSchema = z.object({
  workspaces: z.array(createWorkspaceSchema).min(1).max(6),
  timezone: z.string().trim().min(1).max(64),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
