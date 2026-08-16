import { test, expect } from '@playwright/test';

test('search shows matching tasks', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Buy apples');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByLabel('New task').fill('Call dentist');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('apple');

  await expect(
    page.getByText('Buy apples', { exact: true })
  ).toBeVisible();

  await expect(
    page.getByText('Call dentist', { exact: true })
  ).toBeHidden();

  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText('Call dentist', { exact: true })).toBeVisible();
});

test('searches task descriptions and subtasks', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('New task').fill('Plan weekend');
  await page.getByLabel('Optional description').fill('Look for a museum exhibit');
  await page.getByRole('button', { name: 'Add task' }).click();

  const parentTask = page.locator('#task-list > li.task').filter({
    has: page.getByText('Plan weekend', { exact: true }),
  });
  await parentTask.getByPlaceholder('Add a subtask').fill('Reserve tickets');
  await parentTask.getByRole('button', { name: 'Add subtask to Plan weekend' }).click();

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('tickets');
  await expect(page.getByText('Reserve tickets', { exact: true })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('museum');
  await expect(page.getByText('Plan weekend', { exact: true })).toBeVisible();
});
