import type { MetadataRoute } from 'next';
import { absoluteUrl, publicRoutes } from '@/lib/site';

/**
 * Only the public, indexable routes are listed. The application shell, the
 * auth pages and the API are deliberately absent (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/privacy' || route === '/terms' ? 0.3 : 0.7,
  }));
}
