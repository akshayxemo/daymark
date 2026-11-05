'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

/** Account actions share Better Auth's session store across public pages. */
export function PublicAuthLink({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: '/login' | '/register';
  className?: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;
  return (
    <Link className={className} href={session ? '/app' : href}>
      {session ? 'Open dashboard' : children}
    </Link>
  );
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  return session || isPending ? null : children;
}
