import { z } from 'zod';
import { isoDateSchema, paginationSchema, uuidSchema } from './common';

export const journalEntryTypeSchema = z.enum([
  'daily_review',
  'technical',
  'personal',
  'meeting',
  'learning',
  'achievement',
  'blocker',
  'general',
]);

export const createJournalEntrySchema = z.object({
  workspaceId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  title: z.string().trim().min(1, 'Give the entry a title.').max(200),
  content: z.string().max(100000).default(''),
  entryType: journalEntryTypeSchema.default('general'),
  entryDate: isoDateSchema,
  tagIds: z.array(uuidSchema).max(20).optional(),
  taskIds: z.array(uuidSchema).max(50).optional(),
});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export const updateJournalEntrySchema = createJournalEntrySchema.partial();
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;

export const listJournalQuerySchema = paginationSchema.extend({
  workspaceId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  entryType: journalEntryTypeSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListJournalQuery = z.infer<typeof listJournalQuerySchema>;

export const weeklyGoalSchema = z.object({
  workspaceId: uuidSchema.nullable().optional(),
  title: z.string().trim().min(1, 'Describe the goal.').max(200),
  description: z.string().trim().max(2000).default(''),
  weekStartDate: isoDateSchema,
  status: z.enum(['planned', 'in_progress', 'completed', 'dropped']).default('planned'),
  position: z.number().int().min(0).max(1000).optional(),
});
export type WeeklyGoalInput = z.infer<typeof weeklyGoalSchema>;
export const updateWeeklyGoalSchema = weeklyGoalSchema.omit({ weekStartDate: true }).partial();

export const dailyReviewSchema = z.object({
  reviewDate: isoDateSchema,
  workspaceId: uuidSchema.nullable().optional(),
  notes: z.string().max(20000).optional(),
  accomplishments: z.string().max(20000).optional(),
  blockers: z.string().max(20000).optional(),
  learnings: z.string().max(20000).optional(),
  tomorrowPriorities: z.string().max(20000).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  /** Marks the end-of-day review as completed. */
  reviewed: z.boolean().optional(),
});
export type DailyReviewInput = z.infer<typeof dailyReviewSchema>;
