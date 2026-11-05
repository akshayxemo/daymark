import { getEnv } from '@/server/config/env';
import { authenticated } from '@/server/http/handler';
import { ok } from '@/server/http/respond';
import { bootstrap } from '@/server/modules/bootstrap/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId }) =>
  ok(await bootstrap(db, userId, getEnv())),
);
