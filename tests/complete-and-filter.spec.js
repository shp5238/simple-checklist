import { test, expect } from '@playwright/test';

test('shows completed tasks in the Completed view', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Finished task');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByRole('checkbox', {
    name: 'Mark Finished task as complete'
  }).click();

  await page.getByRole('button', { name: 'Completed' }).click();

  await expect(
    page.getByText('Finished task', { exact: true })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Completed' })
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Active' }).click();
  await expect(page.getByText('Finished task', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByText('Finished task', { exact: true })).toBeVisible();
});

test('marks a task as complete', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Send email');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByRole('checkbox', {
    name: 'Mark Send email as complete'
  }).click();

  await expect(page.getByRole('checkbox', {
    name: 'Mark Send email as incomplete'
  })).toBeChecked();
});

test('completing a parent completes and filters its entire subtree', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Parent task');
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByRole('textbox', { name: 'Add a subtask to Parent task' }).fill('Child task');
  await page.getByRole('button', { name: 'Add subtask to Parent task' }).click();
  await page.getByRole('textbox', { name: 'Add a subtask to Child task' }).fill('Grandchild task');
  await page.getByRole('button', { name: 'Add subtask to Child task' }).click();

  await page.getByRole('checkbox', { name: 'Mark Parent task as complete' }).click();

  await expect(page.getByRole('checkbox', { name: 'Mark Parent task as incomplete' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Mark Child task as incomplete' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Mark Grandchild task as incomplete' })).toBeChecked();

  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(page.getByText('Parent task', { exact: true })).toBeVisible();
  await expect(page.getByText('Child task', { exact: true })).toBeVisible();
  await expect(page.getByText('Grandchild task', { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Child task as incomplete' })).toBeChecked();
});

test('reopening a subtask also reopens its ancestors', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Parent task');
  await page.getByRole('button', { name: 'Add task' }).click();
  await page.getByRole('textbox', { name: 'Add a subtask to Parent task' }).fill('Child task');
  await page.getByRole('button', { name: 'Add subtask to Parent task' }).click();
  await page.getByRole('checkbox', { name: 'Mark Parent task as complete' }).click();
  await page.getByRole('checkbox', { name: 'Mark Child task as incomplete' }).click();

  await expect(page.getByRole('checkbox', { name: 'Mark Parent task as complete' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Mark Child task as complete' })).not.toBeChecked();
});

test('repairs saved completed parents with incomplete descendants', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('plain-list.v1', JSON.stringify({
      version: 2,
      tasks: [{
        id: 'parent', title: 'Saved parent', description: '', completed: true,
        collapsed: false,
        children: [{
          id: 'child', title: 'Saved child', description: '', completed: false,
          collapsed: false, children: [],
        }],
      }],
    }));
  });

  await page.goto('/');

  await expect(page.getByRole('checkbox', { name: 'Mark Saved parent as incomplete' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Mark Saved child as incomplete' })).toBeChecked();
});
