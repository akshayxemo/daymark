import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createJournalEntrySchema, listJournalQuerySchema } from '@/lib/validation/journal';
import { createJournalEntry, listJournalEntries } from '@/server/modules/journal/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, listJournalQuerySchema);
  return ok(await listJournalEntries(db, userId, query));
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createJournalEntrySchema);
  return created(await createJournalEntry(db, userId, input));
});
