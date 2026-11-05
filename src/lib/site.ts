/**
 * Public site configuration shared by metadata, the sitemap and the pages.
 * The canonical origin comes from APP_URL (or Vercel's URL on previews);
 * nothing here may be hardcoded to a particular domain.
 */
export const siteName = 'Daymark';
export const siteTagline = 'Make every day count';
export const siteDescription =
  'Daymark is an open-source, privacy-first work and life intelligence dashboard. Track tasks, time, projects, development activity and deliveries across private workspaces, then see what you actually delivered.';
export const repositoryUrl = 'https://github.com/akshayxemo/daymark';

export function siteUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/** Public, indexable routes listed in the sitemap. */
export const publicRoutes = ['/', '/features', '/docs', '/privacy', '/terms'] as const;
