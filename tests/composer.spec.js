import { test, expect } from '@playwright/test';

test('keeps a compact composer at the bottom of the desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const composer = page.getByRole('form', { name: 'Add a task' });
  await expect(composer).toHaveCSS('position', 'fixed');
  await expect(page.getByLabel('Optional description')).toBeHidden();

  const box = await composer.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeLessThan(80);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  expect(720 - (box.y + box.height)).toBeLessThanOrEqual(16);
});

test('reveals the optional note only when requested and resets after adding', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Add note' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  const description = page.getByLabel('Optional description');
  await expect(description).toBeVisible();
  await expect(description).toBeFocused();
  await expect(page.getByRole('button', { name: 'Hide note' })).toHaveAttribute('aria-expanded', 'true');

  await page.getByLabel('New task').fill('Task with a note');
  await description.fill('Remember this detail');
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByText('Remember this detail', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Optional description')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add note' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('New task')).toBeFocused();
});

test('keeps repeated task entry focused and reveals the newest task', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 500 });
  await page.goto('/');

  for (let index = 1; index <= 18; index += 1) {
    await page.getByLabel('New task').fill(`Task ${index}`);
    await page.getByRole('button', { name: 'Add task' }).click();
  }

  await expect(page.getByLabel('New task')).toBeFocused();
  const newestTask = page.locator('#task-list > .task').filter({ hasText: 'Task 18' });
  await expect(newestTask).toBeInViewport();
  const newestBox = await newestTask.boundingBox();
  const composerBox = await page.getByRole('form', { name: 'Add a task' }).boundingBox();
  expect(newestBox.y + newestBox.height).toBeLessThanOrEqual(composerBox.y);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('adjusts a restrictive view so a new task remains visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Completed' }).click();
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('does not match');

  await page.getByLabel('New task').fill('Visible new task');
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toHaveValue('');
  await expect(page.getByText('Visible new task', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Task added. The view was adjusted to show it.');
});

test('supports a keyboard shortcut to return to the composer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search tasks' }).focus();

  await page.keyboard.press('Alt+n');

  await expect(page.getByLabel('New task')).toBeFocused();
});

test('moves the composer into document flow while editing on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const tasks = Array.from({ length: 16 }, (_, index) => ({
      id: `mobile-task-${index}`,
      title: `Mobile task ${index + 1}`,
      description: '',
      completed: false,
      collapsed: false,
      children: [],
    }));
    localStorage.setItem('plain-list.v1', JSON.stringify({ version: 2, tasks }));
  });
  await page.goto('/');

  const composer = page.getByRole('form', { name: 'Add a task' });
  await expect(composer).toHaveCSS('position', 'fixed');
  await page.getByLabel('New task').focus();
  await expect(composer).toHaveCSS('position', 'static');
  await expect(composer).toBeInViewport();
});
