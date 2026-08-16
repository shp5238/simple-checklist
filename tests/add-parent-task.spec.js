import { test, expect } from '@playwright/test';

test('adds a parent task with a description', async ({ page }) => {
  await page.goto('/');

  // Act: fill out and submit the add-task form.
  await page.getByLabel('New task').fill('Buy groceries');
  await page.getByLabel('Optional description').fill('Milk\nBread');
  await page.getByRole('button', { name: 'Add task' }).click();

  // Assert: the user can see the newly created task and description.
  await expect(
    page.getByText('Buy groceries', { exact: true })
  ).toBeVisible();

  await expect(
    page.getByText('Milk\nBread', { exact: true })
  ).toBeVisible();

  await expect(page.getByLabel('New task')).toHaveValue('');
  await expect(page.getByLabel('Optional description')).toHaveValue('');
});

test('does not add a task with an empty title', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByText('Your list is clear. Add the first task above.')).toBeVisible();
  await expect(page.locator('#task-list > li.task')).toHaveCount(0);
});
