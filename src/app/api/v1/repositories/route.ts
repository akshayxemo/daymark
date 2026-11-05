import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createRepositorySchema, listRepositoriesQuerySchema } from '@/lib/validation/development';
import { createRepository, listRepositories } from '@/server/modules/development/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, listRepositoriesQuerySchema);
  return ok(await listRepositories(db, userId, query));
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createRepositorySchema);
  return created(await createRepository(db, userId, input));
});
