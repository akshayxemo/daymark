import type { Metadata } from 'next';
import { JournalPage } from '@/components/app/pages/journal';

export const metadata: Metadata = { title: 'Journal' };

export default function Page() {
  return <JournalPage />;
}
