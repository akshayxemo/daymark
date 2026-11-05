import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { ok } from '@/server/http/respond';
import { setProjectArchived } from '@/server/modules/projects/service';

export const dynamic = 'force-dynamic';

type Params = { projectId: string; action: string };

/** POST /projects/:id/archive and /projects/:id/restore */
export const POST = authenticated<Params>(async ({ db, userId, params }) => {
  switch (params.action) {
    case 'archive':
      return ok(await setProjectArchived(db, userId, params.projectId, true));
    case 'restore':
      return ok(await setProjectArchived(db, userId, params.projectId, false));
    default:
      throw new NotFoundError();
  }
});
