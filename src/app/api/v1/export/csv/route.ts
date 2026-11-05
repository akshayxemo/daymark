import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { parseQuery } from '@/server/http/respond';
import { isoDateSchema } from '@/lib/validation/common';
import { exportCsv } from '@/server/modules/data/csv';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  type: z.enum(['tasks', 'time', 'deliveries', 'activity']),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const GET = authenticated(async ({ db, userId, request, settings }) => {
  const query = parseQuery(request, querySchema);
  const { timezone } = await settings();
  const csv = await exportCsv(db, userId, query.type, { from: query.from, to: query.to, timezone });
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daymark-${query.type}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
