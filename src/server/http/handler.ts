import type { NextRequest } from 'next/server';
import { requireSessionFromRequest } from '@/server/auth/session';
import type { AuthSession } from '@/server/auth';
import { getDatabase, type DatabaseClient } from '@/server/db';
import { getUserSettings } from '@/server/modules/users/service';
import { errorResponse } from './respond';

export type ApiContext<P = Record<string, string>> = {
  request: NextRequest;
  params: P;
  db: DatabaseClient;
  session: AuthSession;
  userId: string;
  /** Lazily loads the caller's settings (timezone, week start, ...). */
  settings: () => Promise<Awaited<ReturnType<typeof getUserSettings>>>;
};

type RouteParams<P> = { params: Promise<P> };

/**
 * Wraps a route handler with authentication, parameter resolution and error
 * translation. Every protected endpoint derives the user from the verified
 * server session; client-supplied user identifiers are never trusted.
 */
export function authenticated<P = Record<string, string>>(
  handler: (ctx: ApiContext<P>) => Promise<Response>,
) {
  return async (request: NextRequest, context: RouteParams<P>): Promise<Response> => {
    try {
      const session = await requireSessionFromRequest(request);
      const db = getDatabase();
      const params = await context.params;
      let cachedSettings: Awaited<ReturnType<typeof getUserSettings>> | undefined;
      return await handler({
        request,
        params,
        db,
        session,
        userId: session.user.id,
        settings: async () => (cachedSettings ??= await getUserSettings(db, session.user.id)),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** For endpoints that work without a session (e.g. registration policy). */
export function publicRoute<P = Record<string, string>>(
  handler: (ctx: { request: NextRequest; params: P; db: DatabaseClient }) => Promise<Response>,
) {
  return async (request: NextRequest, context: RouteParams<P>): Promise<Response> => {
    try {
      return await handler({ request, params: await context.params, db: getDatabase() });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
