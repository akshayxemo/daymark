import { authenticated } from '@/server/http/handler';
import { noContent, ok, parseJsonBody } from '@/server/http/respond';
import { updateJournalEntrySchema } from '@/lib/validation/journal';
import {
  archiveJournalEntry,
  getJournalEntry,
  updateJournalEntry,
} from '@/server/modules/journal/service';

export const dynamic = 'force-dynamic';

type Params = { entryId: string };

export const GET = authenticated<Params>(async ({ db, userId, params }) =>
  ok(await getJournalEntry(db, userId, params.entryId)),
);

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateJournalEntrySchema);
  return ok(await updateJournalEntry(db, userId, params.entryId, input));
});

export const DELETE = authenticated<Params>(async ({ db, userId, params }) => {
  await archiveJournalEntry(db, userId, params.entryId);
  return noContent();
});
