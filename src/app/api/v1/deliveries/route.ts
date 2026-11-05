import { authenticated } from '@/server/http/handler';
import { ok, parseQuery } from '@/server/http/respond';
import { listDeliveriesQuerySchema } from '@/lib/validation/development';
import { listDeliveries } from '@/server/modules/development/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, listDeliveriesQuerySchema);
  return ok(await listDeliveries(db, userId, query));
});
