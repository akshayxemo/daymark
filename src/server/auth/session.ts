import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { UnauthorizedError } from '@/server/http/errors';
import { getAuth, type AuthSession } from './index';

/**
 * Reads the verified session for the current server render. Cached per
 * request so layouts and pages share one database lookup.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return getAuth().api.getSession({ headers: await headers() });
});

/** Server Components: redirects to the login page when signed out. */
export async function requireSession(next?: string): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return session;
}

/** Route Handlers: throws a 401 that the API layer converts into JSON. */
export async function requireSessionFromRequest(request: Request): Promise<AuthSession> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new UnauthorizedError();
  return session;
}
