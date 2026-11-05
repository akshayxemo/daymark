import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createTaskSchema, listTasksQuerySchema } from '@/lib/validation/tasks';
import { createTask, listTasks } from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, listTasksQuerySchema);
  return ok(await listTasks(db, userId, query));
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createTaskSchema);
  return created(await createTask(db, userId, input));
});
