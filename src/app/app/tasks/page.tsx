import type { Metadata } from 'next';
import { TasksPage } from '@/components/app/pages/tasks';

export const metadata: Metadata = { title: 'Tasks' };

export default function Page() {
  return <TasksPage />;
}
