import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateSessionSchema } from '@/lib/validation/time';
import { updateSession } from '@/server/modules/time/service';

export const dynamic = 'force-dynamic';

type Params = { sessionId: string };

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateSessionSchema);
  return ok(await updateSession(db, userId, params.sessionId, input));
});
