import type { Metadata } from 'next';
import { AnalyticsPage } from '@/components/app/pages/analytics';

export const metadata: Metadata = { title: 'Analytics' };

export default function Page() {
  return <AnalyticsPage />;
}
