import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { importLegacy, previewLegacyImport } from '@/server/modules/data/legacy-import';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  state: z.unknown(),
  dryRun: z.boolean().default(false),
  includeSample: z.boolean().default(false),
});

/** Imports data from the browser-local prototype (localStorage `daymark.design.v1`). */
export const POST = authenticated(async ({ db, userId, request, settings }) => {
  const body = await parseJsonBody(request, bodySchema);
  if (body.dryRun) return ok({ preview: await previewLegacyImport(db, userId, body.state) });
  const { timezone } = await settings();
  return ok({
    summary: await importLegacy(db, userId, body.state, {
      includeSample: body.includeSample,
      timezone,
    }),
  });
});
