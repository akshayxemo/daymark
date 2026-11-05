import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { carryOverSchema } from '@/lib/validation/tasks';
import { carryOverTasks } from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, carryOverSchema);
  return ok(await carryOverTasks(db, userId, input));
});
