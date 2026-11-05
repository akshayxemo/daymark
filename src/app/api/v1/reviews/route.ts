import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { isoDateSchema, uuidSchema } from '@/lib/validation/common';
import { dailyReviewSchema } from '@/lib/validation/journal';
import {
  getDailyReview,
  listDailyReviews,
  upsertDailyReview,
} from '@/server/modules/journal/service';

export const dynamic = 'force-dynamic';

/** GET /reviews?date=YYYY-MM-DD[&workspaceId] or ?from=&to= */
export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(
    request,
    z.object({
      date: isoDateSchema.optional(),
      workspaceId: uuidSchema.optional(),
      from: isoDateSchema.optional(),
      to: isoDateSchema.optional(),
    }),
  );
  if (query.from && query.to) return ok(await listDailyReviews(db, userId, query.from, query.to));
  if (!query.date) return ok(null);
  return ok(await getDailyReview(db, userId, query.date, query.workspaceId ?? null));
});

export const PUT = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, dailyReviewSchema);
  return ok(await upsertDailyReview(db, userId, input));
});
