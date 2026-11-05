import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { ok } from '@/server/http/respond';
import { setRepositoryArchived } from '@/server/modules/development/service';

export const dynamic = 'force-dynamic';

type Params = { repositoryId: string; action: string };

export const POST = authenticated<Params>(async ({ db, userId, params }) => {
  switch (params.action) {
    case 'archive':
      return ok(await setRepositoryArchived(db, userId, params.repositoryId, true));
    case 'restore':
      return ok(await setRepositoryArchived(db, userId, params.repositoryId, false));
    default:
      throw new NotFoundError();
  }
});
