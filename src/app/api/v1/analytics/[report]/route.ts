import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { ok, parseQuery } from '@/server/http/respond';
import { isoDateSchema, uuidSchema } from '@/lib/validation/common';
import { rangeForPeriod, todayIn } from '@/lib/dates';
import { overviewMetrics, reportMetrics } from '@/server/modules/analytics/service';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  period: z.enum(['today', 'week', 'month']).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  workspaceId: uuidSchema.optional(),
});

/** GET /analytics/overview and /analytics/report with period or explicit range. */
export const GET = authenticated<{ report: string }>(
  async ({ db, userId, params, request, settings }) => {
    const query = parseQuery(request, querySchema);
    const prefs = await settings();
    const today = todayIn(prefs.timezone);
    const range =
      query.from && query.to
        ? { from: query.from, to: query.to }
        : rangeForPeriod(query.period ?? 'week', today, prefs.weekStartsOn);
    const options = { ...range, workspaceId: query.workspaceId, timezone: prefs.timezone };
    switch (params.report) {
      case 'overview':
        return ok(
          await overviewMetrics(db, userId, {
            ...options,
            today,
            weekStartsOn: prefs.weekStartsOn,
          }),
        );
      case 'report':
        return ok(await reportMetrics(db, userId, options));
      default:
        throw new NotFoundError();
    }
  },
);
