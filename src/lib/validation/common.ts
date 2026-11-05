import { z } from 'zod';

/** Calendar date as YYYY-MM-DD (interpreted in the user's timezone). */
export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const uuidSchema = z.uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});

/** Query strings arrive as strings; this accepts "true"/"false"/"1"/"0". */
export const queryBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (value === undefined) return undefined;
    return value === 'true' || value === '1';
  });

export const dateRangeQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
