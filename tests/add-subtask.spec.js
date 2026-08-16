import { test, expect } from '@playwright/test';

test('adds a nested subtask', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Plan trip');
  await page.getByRole('button', { name: 'Add task' }).click();

  const parentTask = page.locator('#task-list > li.task').filter({
    has: page.getByText('Plan trip', { exact: true }),
  });
  await parentTask.getByPlaceholder('Add a subtask').fill('Book hotel');
  await parentTask.getByRole('button', { name: 'Add subtask to Plan trip' }).click();

  await expect(
    parentTask.locator('.subtasks').getByText('Book hotel', { exact: true })
  ).toBeVisible();
});
