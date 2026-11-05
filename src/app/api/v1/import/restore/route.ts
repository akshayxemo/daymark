import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { ValidationError } from '@/server/http/errors';
import { ok, parseQuery } from '@/server/http/respond';
import { queryBoolean } from '@/lib/validation/common';
import { previewRestore, restoreUserData } from '@/server/modules/data/restore';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

/** POST a Daymark JSON export. `?dryRun=true` validates and summarises without writing. */
export const POST = authenticated(async ({ db, userId, request }) => {
  const { dryRun } = parseQuery(request, z.object({ dryRun: queryBoolean }));
  const text = await request.text();
  if (text.length > MAX_BYTES) throw new ValidationError('The file is larger than 25 MB.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ValidationError('The file is not valid JSON.');
  }
  if (dryRun) return ok({ summary: previewRestore(raw).summary });
  return ok({ summary: await restoreUserData(db, userId, raw) });
});
