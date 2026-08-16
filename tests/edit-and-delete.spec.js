import { test, expect } from '@playwright/test';

async function addTask(page, title, description = '') {
  await page.getByLabel('New task').fill(title);
  if (description) await page.getByLabel('Optional description').fill(description);
  await page.getByRole('button', { name: 'Add task' }).click();
}

test('edits a task title and description', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Old task', 'Old description');

  await page.getByRole('button', { name: 'Edit task title: Old task' }).click();
  await page.getByLabel('Edit title for Old task').fill('New task');
  await page.getByLabel('Edit title for Old task').press('Enter');
  await page.getByRole('button', { name: 'Edit description for New task' }).click();
  await page.getByLabel('Description editor for New task').fill('New description');
  await page.getByLabel('Description editor for New task').press('ControlOrMeta+Enter');

  const taskList = page.getByRole('list', { name: 'Tasks' });
  await expect(taskList.getByText('New task', { exact: true })).toBeVisible();
  await expect(taskList.getByText('New description', { exact: true })).toBeVisible();
  await expect(taskList.getByText('Old task', { exact: true })).toBeHidden();
});

test('cancels an inline title edit with Escape', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Keep this task');

  await page.getByRole('button', { name: 'Edit task title: Keep this task' }).click();
  await page.getByLabel('Edit title for Keep this task').fill('Discarded change');
  await page.getByLabel('Edit title for Keep this task').press('Escape');

  await expect(page.getByText('Keep this task', { exact: true })).toBeVisible();
});

test('deletes a task after confirmation', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Remove me');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete Remove me' }).click();

  await expect(page.getByText('Remove me', { exact: true })).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Task deleted.');
});
