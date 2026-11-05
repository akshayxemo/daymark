import type { Metadata, Viewport } from 'next';
import { siteDescription, siteName, siteTagline, siteUrl } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${siteName} — ${siteTagline}`, template: `%s · ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: 'website',
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
  },
  twitter: { card: 'summary_large_image' },
  // Private routes override this with noindex in their own layouts.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#101211' },
    { media: '(prefers-color-scheme: light)', color: '#f5f6f2' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
