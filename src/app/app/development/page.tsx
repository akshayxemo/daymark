import type { Metadata } from 'next';
import { DevelopmentPage } from '@/components/app/pages/development';

export const metadata: Metadata = { title: 'Development' };

export default function Page() {
  return <DevelopmentPage />;
}
