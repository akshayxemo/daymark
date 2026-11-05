import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateRepositorySchema } from '@/lib/validation/development';
import { getRepository, updateRepository } from '@/server/modules/development/service';

export const dynamic = 'force-dynamic';

type Params = { repositoryId: string };

export const GET = authenticated<Params>(async ({ db, userId, params }) =>
  ok(await getRepository(db, userId, params.repositoryId)),
);

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateRepositorySchema);
  return ok(await updateRepository(db, userId, params.repositoryId, input));
});
