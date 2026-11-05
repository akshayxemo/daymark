import { expect, type Page } from '@playwright/test';
import { waitForLink } from './mail';

export const PASSWORD = 'e2e-correct-horse-battery';

/** Registers through the UI, verifies the email from the test inbox and completes onboarding. */
export async function registerAndOnboard(page: Page, name: string, email: string) {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();

  const link = await waitForLink(email, 'Verify your Daymark email');
  await page.goto(link);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(
    page.getByRole('heading', { name: new RegExp(`Welcome, ${name.split(' ')[0]}`) }),
  ).toBeVisible();
  await page.getByLabel('Timezone').fill('UTC');
  await page.getByRole('button', { name: /Create 2 workspaces/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible();
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app/);
}

export async function signOut(page: Page) {
  await page.goto('/app/settings/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
}
