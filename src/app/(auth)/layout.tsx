import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import '@/styles/app.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Centered card layout shared by the sign-in, registration and recovery pages. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark">
          <span />
          <span />
          <span />
        </span>
        daymark<span className="brand-period">.</span>
      </Link>
      <main className="auth-card card">{children}</main>
      <p className="auth-footer">
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{' '}
        <Link href="/docs">Docs</Link>
      </p>
    </div>
  );
}
