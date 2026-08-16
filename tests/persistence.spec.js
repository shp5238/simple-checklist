import { test, expect } from '@playwright/test';

test('keeps tasks after a reload', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Persistent task');
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByLabel('Optional description').fill('This should survive a reload.');
  await page.getByRole('button', { name: 'Add task' }).click();

  const parentTask = page.locator('#task-list > li.task').filter({
    has: page.getByText('Persistent task', { exact: true }),
  });
  await parentTask.getByPlaceholder('Add a subtask').fill('Persistent subtask');
  await parentTask.getByRole('button', { name: 'Add subtask to Persistent task' }).click();

  await page.reload();

  await expect(
    page.getByText('Persistent task', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('This should survive a reload.', { exact: true })).toBeVisible();
  await expect(page.getByText('Persistent subtask', { exact: true })).toBeVisible();
});
