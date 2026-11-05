import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Daymark — Make every day count',
  description:
    'Your personal work and life intelligence dashboard. A local interactive design preview.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
