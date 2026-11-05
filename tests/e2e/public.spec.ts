import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: /clear record/i },
  { path: '/features', heading: /./ },
  { path: '/docs', heading: /./ },
  { path: '/privacy', heading: /privacy/i },
  { path: '/terms', heading: /terms/i },
];

test.describe('public account actions', () => {
  for (const signedIn of [false, true]) {
    test(`${signedIn ? 'signed-in' : 'signed-out'} navigation and calls to action`, async ({
      page,
      isMobile,
    }) => {
      await page.route('**/api/auth/get-session**', (route) =>
        route.fulfill({
          json: signedIn
            ? {
                user: {
                  id: 'public-nav-user',
                  name: 'Navigation Test',
                  email: 'navigation@daymark.test',
                  emailVerified: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                session: {
                  id: 'public-nav-session',
                  token: 'mock-session-token',
                  userId: 'public-nav-user',
                  expiresAt: new Date(Date.now() + 3600000).toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              }
            : null,
        }),
      );

      for (const { path } of pages) {
        await page.goto(path);
        if (isMobile) await page.locator('.site-menu summary').click();
        const header = page.locator('.site-header');
        const footer = page.locator('.site-footer');
        if (signedIn) {
          await expect(header.getByRole('link', { name: 'Open dashboard' })).toBeVisible();
          await expect(footer.getByRole('link', { name: 'Open dashboard' })).toBeVisible();
          await expect(page.locator('a[href="/login"], a[href="/register"]')).toHaveCount(0);
          if (['/', '/features', '/docs'].includes(path)) {
            await expect(
              page.locator('main').getByRole('link', { name: 'Open dashboard' }).first(),
            ).toBeVisible();
          }
        } else {
          await expect(header.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
          await expect(header.getByRole('link', { name: 'Get started' })).toBeVisible();
          await expect(footer.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
          await expect(page.locator('a[href="/app"]')).toHaveCount(0);
        }
      }
    });
  }

  test('account actions wait until the session is known', async ({ page }) => {
    let releaseSession!: () => void;
    const sessionReady = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });
    await page.route('**/api/auth/get-session**', async (route) => {
      await sessionReady;
      await route.fulfill({ json: null });
    });
    const sessionRequest = page.waitForRequest('**/api/auth/get-session**');
    await page.goto('/docs');
    await sessionRequest;
    await expect(page.locator('a[href="/login"], a[href="/register"]')).toHaveCount(0);
    releaseSession();
    await expect(page.locator('.site-footer').getByRole('link', { name: 'Log in' })).toBeVisible();
  });
});

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
