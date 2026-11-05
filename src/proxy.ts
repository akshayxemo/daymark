import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic session check. Only the presence of the session cookie is
 * inspected here; every page and API route still verifies the session
 * against the database. This keeps signed-out visitors away from the app
 * shell and signed-in users away from the auth pages without a lookup.
 */
const sessionCookies = ['daymark.session_token', '__Secure-daymark.session_token'];
const authPages = ['/login', '/register', '/forgot-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = sessionCookies.some((name) => request.cookies.has(name));

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (!hasSession) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next({ headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (hasSession && authPages.includes(pathname)) {
    return NextResponse.redirect(new URL('/app', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register', '/forgot-password'],
};
