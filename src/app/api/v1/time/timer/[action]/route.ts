import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { ok, parseJsonBody } from '@/server/http/respond';
import { startTimerSchema, stopTimerSchema } from '@/lib/validation/time';
import {
  cancelTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
} from '@/server/modules/time/service';

export const dynamic = 'force-dynamic';

type Params = { action: string };

/** POST /time/timer/start | pause | resume | stop | cancel */
export const POST = authenticated<Params>(async ({ db, userId, params, request }) => {
  switch (params.action) {
    case 'start':
      return ok(await startTimer(db, userId, await parseJsonBody(request, startTimerSchema)));
    case 'pause':
      return ok(await pauseTimer(db, userId));
    case 'resume':
      return ok(await resumeTimer(db, userId));
    case 'stop': {
      const body =
        request.headers.get('content-length') === '0'
          ? {}
          : await parseJsonBody(request, stopTimerSchema);
      return ok(await stopTimer(db, userId, body));
    }
    case 'cancel':
      return ok(await cancelTimer(db, userId));
    default:
      throw new NotFoundError();
  }
});
