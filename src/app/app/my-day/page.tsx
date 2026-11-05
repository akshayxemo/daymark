import type { Metadata } from 'next';
import { MyDayPage } from '@/components/app/pages/my-day';

export const metadata: Metadata = { title: 'My day' };

export default function Page() {
  return <MyDayPage />;
}
