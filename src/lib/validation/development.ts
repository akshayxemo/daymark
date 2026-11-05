import { z } from 'zod';
import { isoDateTimeSchema, queryBoolean, uuidSchema } from './common';

export const repositoryProviderSchema = z.enum(['github', 'gitlab', 'bitbucket', 'azure', 'other']);
export const referenceTypeSchema = z.enum([
  'jira',
  'pull_request',
  'commit',
  'issue',
  'documentation',
  'other',
]);
export const deliveryTypeSchema = z.enum(['merged', 'deployed', 'verified']);
export const deliveryEnvironmentSchema = z.enum([
  'development',
  'staging',
  'uat',
  'production',
  'other',
]);
export const deliveryStatusSchema = z.enum(['pending', 'successful', 'failed']);
export const branchWorkStatusSchema = z.enum([
  'planned',
  'in_progress',
  'in_review',
  'merged',
  'abandoned',
]);

const urlSchema = z.url().max(2048);
const optionalUrl = urlSchema.nullable().optional();

export const createRepositorySchema = z.object({
  workspaceId: uuidSchema,
  name: z.string().trim().min(1, 'Enter a repository name.').max(120),
  owner: z.string().trim().max(120).nullable().optional(),
  provider: repositoryProviderSchema.default('github'),
  repositoryUrl: z.union([urlSchema, z.literal('')]).default(''),
  defaultBranch: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(1000).default(''),
});
export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export const updateRepositorySchema = createRepositorySchema.omit({ workspaceId: true }).partial();
export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>;

export const listRepositoriesQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  includeArchived: queryBoolean,
});

export const taskRepositorySchema = z.object({
  repositoryId: uuidSchema,
  codebaseName: z.string().trim().max(120).nullable().optional(),
  branchName: z.string().trim().max(200).nullable().optional(),
  branchUrl: optionalUrl,
  workStatus: branchWorkStatusSchema.default('in_progress'),
  notes: z.string().trim().max(2000).default(''),
});
export type TaskRepositoryInput = z.infer<typeof taskRepositorySchema>;
export const updateTaskRepositorySchema = taskRepositorySchema
  .omit({ repositoryId: true })
  .partial();

export const developmentReferenceSchema = z
  .object({
    repositoryId: uuidSchema.nullable().optional(),
    referenceType: referenceTypeSchema,
    referenceId: z.string().trim().max(120).nullable().optional(),
    title: z.string().trim().max(200).nullable().optional(),
    url: optionalUrl,
  })
  .refine((value) => Boolean(value.referenceId || value.url), {
    message: 'Provide a reference ID or a URL.',
    path: ['url'],
  });
export type DevelopmentReferenceInput = z.infer<typeof developmentReferenceSchema>;

export const deliveryRecordSchema = z.object({
  repositoryId: uuidSchema.nullable().optional(),
  deliveryType: deliveryTypeSchema,
  environment: deliveryEnvironmentSchema,
  deliveryStatus: deliveryStatusSchema.default('successful'),
  branchName: z.string().trim().max(200).nullable().optional(),
  version: z.string().trim().max(60).nullable().optional(),
  referenceUrl: optionalUrl,
  deliveredAt: isoDateTimeSchema.optional(),
  notes: z.string().trim().max(2000).default(''),
});
export type DeliveryRecordInput = z.infer<typeof deliveryRecordSchema>;
export const updateDeliveryRecordSchema = deliveryRecordSchema.partial();

export const listDeliveriesQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  environment: deliveryEnvironmentSchema.optional(),
  deliveryType: deliveryTypeSchema.optional(),
  deliveryStatus: deliveryStatusSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
