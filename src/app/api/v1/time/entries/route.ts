import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createTimeEntrySchema, listTimeQuerySchema } from '@/lib/validation/time';
import { createTimeEntry, listTimeRecords } from '@/server/modules/time/service';

export const dynamic = 'force-dynamic';

/** Lists timer sessions and manual entries together, newest first. */
export const GET = authenticated(async ({ db, userId, request, settings }) => {
  const query = parseQuery(request, listTimeQuerySchema);
  const { timezone } = await settings();
  return ok(await listTimeRecords(db, userId, query, timezone));
});

export const POST = authenticated(async ({ db, userId, request, settings }) => {
  const input = await parseJsonBody(request, createTimeEntrySchema);
  const { timezone } = await settings();
  return created(await createTimeEntry(db, userId, input, timezone));
});
