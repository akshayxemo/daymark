import type { Metadata } from 'next';
import { WorkspacesSettingsPage } from '@/components/app/pages/workspaces-settings';

export const metadata: Metadata = { title: 'Workspaces' };

export default function Page() {
  return <WorkspacesSettingsPage />;
}
