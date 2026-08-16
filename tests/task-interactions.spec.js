import { test, expect } from '@playwright/test';

async function addTask(page, title, description = '') {
  await page.getByLabel('New task').fill(title);
  if (description) await page.getByLabel('Optional description').fill(description);
  await page.getByRole('button', { name: 'Add task' }).click();
}

test('reorders sibling tasks and disables unavailable move controls', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'First');
  await addTask(page, 'Second');
  await addTask(page, 'Third');

  await expect(page.getByRole('button', { name: 'Move First up' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move Third down' })).toBeDisabled();

  await page.getByRole('button', { name: 'Move Second up' }).click();
  await expect(page.locator('#task-list > li.task .task-title')).toHaveText(['Second', 'First', 'Third']);
  await expect(page.getByRole('status')).toHaveText('Moved “Second” up.');
  await expect(page.getByRole('button', { name: 'Edit task title: Second' })).toBeFocused();
});

test('reorders sibling tasks with a mouse drag handle', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'First');
  await addTask(page, 'Second');
  await addTask(page, 'Third');

  const firstTask = page.locator('#task-list > li.task').filter({ has: page.getByText('First', { exact: true }) });
  await page.locator('.drag-handle').nth(2).dragTo(firstTask, { targetPosition: { x: 10, y: 1 } });

  await expect(page.locator('#task-list > li.task .task-title')).toHaveText(['Third', 'First', 'Second']);
  await expect(page.getByRole('status')).toHaveText('Moved “Third”.');
});

test('collapses and expands a parent task details', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Plan trip', 'Pick dates first');
  const parent = page.locator('#task-list > li.task').filter({ has: page.getByText('Plan trip', { exact: true }) });
  await parent.getByPlaceholder('Add a subtask').fill('Book hotel');
  await parent.getByRole('button', { name: 'Add subtask to Plan trip' }).click();

  await page.getByRole('button', { name: 'Collapse details for Plan trip' }).click();
  await expect(page.getByRole('button', { name: 'Expand details for Plan trip' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Pick dates first', { exact: true })).toBeHidden();
  await expect(page.getByText('Book hotel', { exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Expand details for Plan trip' }).click();
  await expect(page.getByRole('button', { name: 'Collapse details for Plan trip' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Book hotel', { exact: true })).toBeVisible();
});

test('edits with the keyboard and tabs through parent tasks and subtasks', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'First task');
  await addTask(page, 'Second task');

  const firstTask = page.locator('#task-list > li.task').filter({ has: page.getByText('First task', { exact: true }) });
  await firstTask.getByPlaceholder('Add a subtask').fill('First subtask');
  await firstTask.getByRole('button', { name: 'Add subtask to First task' }).click();

  const firstTitle = page.getByRole('button', { name: 'Edit task title: First task' });
  await firstTitle.focus();
  await firstTitle.press('Enter');
  const titleEditor = page.getByLabel('Edit title for First task');
  await titleEditor.fill('Renamed task');
  await titleEditor.press('Enter');
  await expect(page.getByRole('button', { name: 'Edit task title: First subtask' })).toBeFocused();

  const renamedTitle = page.getByRole('button', { name: 'Edit task title: Renamed task' });
  await renamedTitle.focus();
  await renamedTitle.press('Enter');
  await page.getByLabel('Edit title for Renamed task').press('Tab');
  await expect(page.getByLabel('Edit title for First subtask')).toBeFocused();

  await page.getByLabel('Edit title for First subtask').press('Tab');
  await expect(page.getByLabel('Edit title for Second task')).toBeFocused();
});

test('tabs from the add-task form into the first parent task editor', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'First parent');
  await addTask(page, 'Second parent');

  await page.getByLabel('New task').focus();
  await page.getByLabel('New task').press('Tab');
  await expect(page.getByLabel('Optional description')).toBeFocused();

  await page.getByLabel('Optional description').press('Tab');
  await expect(page.getByRole('button', { name: 'Add task' })).toBeFocused();

  await page.getByRole('button', { name: 'Add task' }).press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toBeFocused();

  await page.getByRole('searchbox', { name: 'Search tasks' }).press('Tab');
  await expect(page.getByLabel('Edit title for First parent')).toBeFocused();

  await page.getByLabel('Edit title for First parent').press('Shift+Tab');
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toBeFocused();

  await page.getByRole('searchbox', { name: 'Search tasks' }).press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Add task' })).toBeFocused();
});

test('tabs in one unbroken chain from the composer through parents and subtasks', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent one');
  await addTask(page, 'Parent two');

  await page.getByRole('textbox', { name: 'Add a subtask to Parent one' }).fill('Sub A');
  await page.getByRole('button', { name: 'Add subtask to Parent one' }).click();
  await page.getByRole('textbox', { name: 'Add a subtask to Parent one' }).fill('Sub B');
  await page.getByRole('button', { name: 'Add subtask to Parent one' }).click();

  await page.getByLabel('New task').focus();
  await page.getByLabel('New task').press('Tab');
  await expect(page.getByLabel('Optional description')).toBeFocused();

  await page.getByLabel('Optional description').press('Tab');
  await expect(page.getByRole('button', { name: 'Add task' })).toBeFocused();

  await page.getByRole('button', { name: 'Add task' }).press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toBeFocused();

  await page.getByRole('searchbox', { name: 'Search tasks' }).press('Tab');
  await expect(page.getByLabel('Edit title for Parent one')).toBeFocused();

  await page.getByLabel('Edit title for Parent one').press('Tab');
  await expect(page.getByLabel('Edit title for Sub A')).toBeFocused();

  await page.getByLabel('Edit title for Sub A').press('Tab');
  await expect(page.getByLabel('Edit title for Sub B')).toBeFocused();

  await page.getByLabel('Edit title for Sub B').press('Tab');
  await expect(page.getByLabel('Edit title for Parent two')).toBeFocused();

  await page.getByLabel('Edit title for Parent two').press('Tab');
  await expect(page.getByLabel('New task')).toBeFocused();
});
