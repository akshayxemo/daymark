import type { Metadata } from 'next';
import { TimeTrackingPage } from '@/components/app/pages/time-tracking';

export const metadata: Metadata = { title: 'Time tracking' };

export default function Page() {
  return <TimeTrackingPage />;
}
