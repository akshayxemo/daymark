import { z } from 'zod';
import { isoDateSchema, isoDateTimeSchema, paginationSchema, uuidSchema } from './common';

export const startTimerSchema = z.object({
  taskId: uuidSchema,
  phaseId: uuidSchema.nullable().optional(),
  description: z.string().trim().max(500).optional(),
});
export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const stopTimerSchema = z.object({
  description: z.string().trim().max(500).optional(),
});

export const updateSessionSchema = z.object({
  description: z.string().trim().max(500).optional(),
  phaseId: uuidSchema.nullable().optional(),
});

const baseEntry = {
  phaseId: uuidSchema.nullable().optional(),
  description: z.string().trim().max(500).default(''),
  /** Acknowledge an overlap with an existing record instead of rejecting it. */
  allowOverlap: z.boolean().default(false),
};

export const createTimeEntrySchema = z
  .object({
    taskId: uuidSchema,
    workDate: isoDateSchema.optional(),
    durationMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
    startedAt: isoDateTimeSchema.optional(),
    endedAt: isoDateTimeSchema.optional(),
    ...baseEntry,
  })
  .superRefine((value, ctx) => {
    const hasRange = Boolean(value.startedAt || value.endedAt);
    if (hasRange && !(value.startedAt && value.endedAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Provide both a start and an end time.',
      });
      return;
    }
    if (hasRange) {
      const start = new Date(value.startedAt!).getTime();
      const end = new Date(value.endedAt!).getTime();
      if (!(end > start)) {
        ctx.addIssue({
          code: 'custom',
          path: ['endedAt'],
          message: 'End time must be after the start time.',
        });
      } else if (end - start > 24 * 60 * 60 * 1000) {
        ctx.addIssue({
          code: 'custom',
          path: ['endedAt'],
          message: 'A single entry cannot exceed 24 hours.',
        });
      }
    } else if (!value.durationMinutes) {
      ctx.addIssue({
        code: 'custom',
        path: ['durationMinutes'],
        message: 'Enter a duration or a time range.',
      });
    } else if (!value.workDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['workDate'],
        message: 'Choose the date the work happened.',
      });
    }
  });
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntrySchema = z.object({
  workDate: isoDateSchema.optional(),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .optional(),
  startedAt: isoDateTimeSchema.nullable().optional(),
  endedAt: isoDateTimeSchema.nullable().optional(),
  phaseId: uuidSchema.nullable().optional(),
  description: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
  allowOverlap: z.boolean().default(false),
});
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

export const listTimeQuerySchema = paginationSchema.extend({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  workspaceId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
});
export type ListTimeQuery = z.infer<typeof listTimeQuerySchema>;
