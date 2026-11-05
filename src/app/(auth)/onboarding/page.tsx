import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/auth/onboarding-form';
import { requireSession } from '@/server/auth/session';
import { getDatabase } from '@/server/db';
import { getUserSettings } from '@/server/modules/users/service';
import { listWorkspaces } from '@/server/modules/workspaces/service';

export const metadata: Metadata = { title: 'Set up your space' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await requireSession('/onboarding');
  const db = getDatabase();
  const [settings, workspaces] = await Promise.all([
    getUserSettings(db, session.user.id),
    listWorkspaces(db, session.user.id),
  ]);
  if (settings.onboardingCompletedAt) redirect('/app');
  return (
    <OnboardingForm
      name={session.user.name}
      timezone={settings.timezone}
      existing={workspaces.map((workspace) => workspace.name)}
    />
  );
}
