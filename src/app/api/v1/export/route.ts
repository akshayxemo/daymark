import { authenticated } from '@/server/http/handler';
import { exportUserData } from '@/server/modules/data/export';

export const dynamic = 'force-dynamic';

/** Downloads a schema-versioned JSON archive of the caller's records. */
export const GET = authenticated(async ({ db, userId, settings }) => {
  const data = await exportUserData(db, userId);
  const { timezone } = await settings();
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="daymark-export-${day}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
