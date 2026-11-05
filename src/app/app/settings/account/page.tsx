import type { Metadata } from 'next';
import { AccountPage } from '@/components/app/pages/account';

export const metadata: Metadata = { title: 'Account' };

export default function Page() {
  return <AccountPage />;
}
