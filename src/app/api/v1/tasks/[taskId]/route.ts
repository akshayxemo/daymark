import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateTaskSchema } from '@/lib/validation/tasks';
import { getTaskDetail, updateTask } from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

type Params = { taskId: string };

export const GET = authenticated<Params>(async ({ db, userId, params }) =>
  ok(await getTaskDetail(db, userId, params.taskId)),
);

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateTaskSchema);
  return ok(await updateTask(db, userId, params.taskId, input));
});
