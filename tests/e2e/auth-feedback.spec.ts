import { expect, test, type Page } from '@playwright/test';

async function rejectSignIn(page: Page, code: string, message: string) {
  await page.route('**/api/auth/sign-in/email', (route) =>
    route.fulfill({ status: 403, json: { code, message } }),
  );
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('auth-feedback@daymark.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('origin rejection does not tell users to verify their email', async ({ page }) => {
  await rejectSignIn(page, 'INVALID_ORIGIN', 'Invalid origin');
  await expect(page.locator('form').getByRole('alert')).toHaveText('Invalid origin');
  await expect(
    page.getByText('Verify your email before signing in.', { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'send it again' })).toHaveCount(0);
});

for (const status of [200, 429, 500]) {
  test(`verification resend handles HTTP ${status}`, async ({ page }) => {
    await page.route('**/api/auth/send-verification-email', (route) =>
      route.fulfill({
        status,
        json:
          status === 200
            ? { status: true }
            : { code: 'EMAIL_SEND_FAILED', message: 'Request failed' },
      }),
    );
    await rejectSignIn(page, 'EMAIL_NOT_VERIFIED', 'Email not verified');
    await page.getByRole('button', { name: 'send it again' }).click();
    if (status === 200) {
      await expect(page.locator('form').getByRole('alert')).toContainText(
        'A new link has been sent.',
      );
      await expect(page.getByRole('button', { name: 'send it again' })).toHaveCount(0);
    } else {
      await expect(page.locator('form').getByRole('alert').first()).toHaveText(
        status === 429
          ? 'Too many email requests. Please wait a minute and try again.'
          : 'The verification email could not be sent. Please try again later.',
      );
      await expect(page.getByText('A new link has been sent.', { exact: false })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'send it again' })).toBeEnabled();
    }
  });
}
