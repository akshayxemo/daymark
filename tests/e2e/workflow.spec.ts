import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { waitForLink } from './mail';
import { PASSWORD, registerAndOnboard, signIn, signOut } from './helpers';

const stamp = Date.now();
const alice = { name: 'Alice Example', email: `alice-${stamp}@daymark.test` };
const bob = { name: 'Bob Example', email: `bob-${stamp}@daymark.test` };

test.describe.configure({ mode: 'serial' });

let taskId = '';
let exportPath = '';

test('register, verify email, onboard and run the full daily workflow', async ({ page }) => {
  await registerAndOnboard(page, alice.name, alice.email);

  // Reopening the site with the existing session resumes the dashboard.
  const reopened = await page.context().newPage();
  await reopened.goto('/');
  await expect(reopened).toHaveURL(/\/app$/);
  await reopened.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(reopened).toHaveURL(/\/?\?home=1$/);
  await expect(reopened.getByRole('heading', { level: 1, name: /clear record/i })).toBeVisible();
  await reopened.close();

  // Workspaces: Office and Personal exist; add a custom one.
  await page.goto('/app/settings/workspaces');
  await page.getByRole('button', { name: 'New workspace' }).click();
  const workspaceDialog = page.getByRole('dialog', { name: 'New workspace' });
  await workspaceDialog.getByLabel(/^Name/).fill('Side project');
  await workspaceDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Side project/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Office/ })).toBeVisible();

  // Project in Office.
  await page.goto('/app/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel(/^Project name/).fill('Launch site');
  await projectDialog.getByLabel(/^Workspace/).selectOption({ label: 'Office' });
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'Launch site' })).toBeVisible();

  // Task planned for today.
  await page.getByRole('button', { name: 'New task' }).first().click();
  const taskDialog = page.getByRole('dialog', { name: 'A new next step' });
  await taskDialog.getByLabel(/^Task name/).fill('Ship the landing page');
  await taskDialog.getByLabel(/^Workspace/).selectOption({ label: 'Office' });
  await taskDialog.getByLabel(/^Project/).selectOption({ label: 'Launch site' });
  await taskDialog.getByLabel('Estimate (minutes)', { exact: true }).fill('60');
  await taskDialog.getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByRole('status')).toContainText('DM-1 added to your plan');

  // Open it, change status and phase, and re-plan.
  await page.goto('/app/tasks');
  await page.getByRole('button', { name: 'Open Ship the landing page', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Task details' });
  await expect(drawer.getByRole('heading', { name: 'Ship the landing page' })).toBeVisible();
  await drawer.getByLabel(/^Status/).selectOption({ label: 'In Progress' });
  await expect(drawer.getByLabel(/^Status/)).toHaveValue(/.+/);
  await drawer.getByLabel(/^Phase/).selectOption({ label: 'Development' });
  await expect(drawer.getByText('Phase changed to Development')).toBeVisible();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await drawer.getByLabel(/^Planned date/).fill(tomorrow);
  await drawer.getByRole('button', { name: /Plans \(2\)/ }).click();
  await expect(drawer.getByText(/^Moved from \d{4}-\d{2}-\d{2} to /)).toBeVisible();

  // Timer: start, pause, resume, stop.
  await drawer.getByRole('button', { name: 'Focus on this task' }).click();
  await expect(drawer.getByRole('button', { name: 'Session already active' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Close dialog' }).click();
  const timer = page.locator('.floating-timer');
  await expect(timer).toBeVisible();
  await page.waitForTimeout(2200);
  await timer.getByRole('button', { name: 'Pause or resume timer' }).click();
  const pausedAt = await timer.locator('strong').textContent();
  await page.waitForTimeout(1500);
  await expect(timer.locator('strong')).toHaveText(pausedAt!);
  await page.reload();
  await expect(page.locator('.floating-timer strong')).toHaveText(pausedAt!);
  await page
    .locator('.floating-timer')
    .getByRole('button', { name: 'Pause or resume timer' })
    .click();
  await page.waitForTimeout(1200);
  await page.locator('.floating-timer').getByRole('button', { name: 'Stop timer' }).click();
  await expect(page.getByRole('status')).toContainText('Focus session saved');
  await expect(page.locator('.floating-timer')).toHaveCount(0);

  // Manual time, a Jira reference and a production deployment.
  await page.getByRole('button', { name: 'Open Ship the landing page', exact: true }).click();
  await drawer.getByRole('button', { name: 'Add manual time' }).click();
  await drawer.getByLabel(/^Minutes/).fill('30');
  await drawer.getByRole('button', { name: 'Save time' }).click();
  await expect(drawer.getByText('Manual · Development')).toBeVisible();
  await expect(drawer.getByText(/0h 30m tracked/)).toBeVisible();
  await drawer.getByRole('button', { name: 'Add reference' }).click();
  await drawer.getByLabel(/^Identifier/).fill('WEB-42');
  await drawer.getByRole('button', { name: 'Add', exact: true }).last().click();
  await expect(drawer.getByText('WEB-42').first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Record delivery' }).click();
  await drawer.getByLabel(/^Event/).selectOption('deployed');
  await drawer.getByLabel(/^Environment/).selectOption('production');
  await drawer.getByLabel(/^Version/).fill('v1.0.0');
  await drawer.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(drawer.getByText('Deployed · production · v1.0.0').first()).toBeVisible();
  await drawer.getByLabel(/^Status/).selectOption({ label: 'Completed' });
  await expect(drawer.getByText(/Ship the landing page → Completed/).first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Close dialog' }).click();

  // Activity timeline and analytics reflect the real records.
  await page.goto('/app/activity');
  await expect(page.getByText('Deployed · production · v1.0.0').first()).toBeVisible();
  await expect(page.getByText(/Focus session saved/).first()).toBeVisible();
  await expect(page.getByText(/Manual time added · 30m/).first()).toBeVisible();
  await page.goto('/app/analytics');
  await page.getByLabel(/^Report date range/).selectOption('month');
  await expect(page.locator('.stat').filter({ hasText: 'tasks completed' })).toContainText('1');
  await expect(page.getByRole('table').last()).toContainText('production');

  // Export everything as JSON.
  await page.goto('/app/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Export JSON' }).click(),
  ]);
  exportPath = path.join(os.tmpdir(), `daymark-e2e-export-${stamp}.json`);
  await download.saveAs(exportPath);
  const archive = JSON.parse(await readFile(exportPath, 'utf8'));
  expect(archive.format).toBe('daymark-export');
  expect(archive.data.tasks).toHaveLength(1);
  expect(archive.data.deliveryRecords).toHaveLength(1);

  // Fetch the task id for the isolation check.
  const list = await page.request.get('/api/v1/tasks?search=landing');
  taskId = (await list.json()).data.items[0].id;
  expect(taskId).toMatch(/^[0-9a-f-]{36}$/);
  await signOut(page);
});

test('a second account cannot see the first account’s data and can restore an export', async ({
  page,
}) => {
  await registerAndOnboard(page, bob.name, bob.email);

  const direct = await page.request.get(`/api/v1/tasks/${taskId}`);
  expect(direct.status()).toBe(404);
  const status = await page.request.post(`/api/v1/tasks/${taskId}/status`, {
    data: { statusId: taskId },
  });
  expect(status.status()).toBe(404);
  const listed = await page.request.get('/api/v1/tasks');
  expect((await listed.json()).data.total).toBe(0);

  await page.goto('/app/settings');
  await page.getByLabel(/^Daymark export file/).setInputFiles(exportPath);
  await expect(page.getByText(/is valid\. It contains/)).toBeVisible();
  await page.getByRole('button', { name: 'Restore into my account' }).click();
  await expect(page.getByText(/Restored 1 tasks into/)).toBeVisible();
  await page.goto('/app/tasks');
  await page.getByLabel(/^Completion/).selectOption('all');
  await expect(
    page.getByRole('button', { name: 'Open Ship the landing page', exact: true }),
  ).toBeVisible();

  // The restored copy belongs to Bob and has a new id; Alice's original is still unreachable.
  const mine = (
    await (await page.request.get('/api/v1/tasks?search=landing&completed=true')).json()
  ).data.items;
  expect(mine).toHaveLength(1);
  expect(mine[0].id).not.toBe(taskId);
  await signOut(page);
});

test('password reset works through the emailed link', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel(/^Email/).fill(alice.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  const link = await waitForLink(alice.email, 'Reset your Daymark password');
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  const next = `${PASSWORD}-new`;
  await page.getByLabel(/^New password/).fill(next);
  await page.getByLabel(/^Confirm password/).fill(next);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, alice.email, next);
  await expect(page.getByText('Welcome back, Alice')).toBeVisible();
});

test('signed-out visitors are redirected away from the app', async ({ page }) => {
  await page.goto('/app/tasks');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Ftasks/);
  const api = await page.request.get('/api/v1/tasks');
  expect(api.status()).toBe(401);
});
