import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateSessionSchema } from '@/lib/validation/time';
import { getTimerState, updateActiveSession } from '@/server/modules/time/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId }) => ok(await getTimerState(db, userId)));

export const PATCH = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, updateSessionSchema);
  return ok(await updateActiveSession(db, userId, input));
});
