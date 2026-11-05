import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { noContent, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { updateTimeEntrySchema } from '@/lib/validation/time';
import { deleteTimeEntry, updateTimeEntry } from '@/server/modules/time/service';

export const dynamic = 'force-dynamic';

type Params = { entryId: string };

export const PATCH = authenticated<Params>(async ({ db, userId, params, request, settings }) => {
  const input = await parseJsonBody(request, updateTimeEntrySchema);
  const { timezone } = await settings();
  return ok(await updateTimeEntry(db, userId, params.entryId, input, timezone));
});

export const DELETE = authenticated<Params>(async ({ db, userId, params, request }) => {
  const query = parseQuery(request, z.object({ reason: z.string().max(500).optional() }));
  await deleteTimeEntry(db, userId, params.entryId, query.reason);
  return noContent();
});
