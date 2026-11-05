import type { Metadata } from 'next';
import { PlannerPage } from '@/components/app/pages/planner';

export const metadata: Metadata = { title: 'Planner' };

export default function Page() {
  return <PlannerPage />;
}
