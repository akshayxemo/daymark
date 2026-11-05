import type { Metadata } from 'next';
import { ProjectsPage } from '@/components/app/pages/projects';

export const metadata: Metadata = { title: 'Projects' };

export default function Page() {
  return <ProjectsPage />;
}
