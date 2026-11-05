import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppProvider } from '@/components/app/context';
import { AppShell } from '@/components/app/shell';
import { QueryProvider } from '@/components/providers/query-provider';
import '@/styles/app.css';
import { getEnv } from '@/server/config/env';
import { requireSession } from '@/server/auth/session';
import { getDatabase } from '@/server/db';
import { bootstrap } from '@/server/modules/bootstrap/service';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * Authenticated application shell. The session is verified against the
 * database here; the bootstrap payload is loaded once on the server so the
 * first paint already knows the user's workspaces, configuration and timer.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession('/app');
  const data = await bootstrap(getDatabase(), session.user.id, getEnv());
  if (!data.settings.onboardingCompletedAt) redirect('/onboarding');
  const theme = (await cookies()).get('daymark.theme')?.value === 'light' ? 'light' : 'dark';
  return (
    <>
      <script
        // Applies the saved theme before hydration so the shell never flashes.
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)};`,
        }}
      />
      <QueryProvider>
        <AppProvider initial={data}>
          <AppShell user={{ name: session.user.name, email: session.user.email }}>
            {children}
          </AppShell>
        </AppProvider>
      </QueryProvider>
    </>
  );
}
