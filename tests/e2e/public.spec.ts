import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: /clear record/i },
  { path: '/features', heading: /./ },
  { path: '/docs', heading: /./ },
  { path: '/privacy', heading: /privacy/i },
  { path: '/terms', heading: /terms/i },
];

for (const { path, heading } of pages) {
  test(`public page ${path} renders, is indexable and fits the viewport`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      path === '/' ? /^https?:\/\/[^/]+\/?$/ : new RegExp(`${path}$`),
    );
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('private pages are not indexable and robots/sitemap exclude them', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const robots = await (await page.request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /app');
  expect(robots).toContain('Disallow: /api/');
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/features');
  expect(sitemap).not.toContain('/app');
  expect(sitemap).not.toContain('/login');
});

test('API responses carrying data are never publicly cacheable', async ({ page }) => {
  const response = await page.request.get('/api/v1/tasks');
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.headers()['x-frame-options']).toBe('DENY');
});
