import { authenticated } from '@/server/http/handler';
import { ok, parseQuery } from '@/server/http/respond';
import { listActivity, listActivityQuerySchema } from '@/server/modules/activity/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request, settings }) => {
  const query = parseQuery(request, listActivityQuerySchema);
  const { timezone } = await settings();
  return ok(await listActivity(db, userId, query, timezone));
});
