import { test, expect } from '@playwright/test';

async function addTask(page, title) {
  await page.getByLabel('New task').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

test('exports the current list as a JSON backup', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Back up this task');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('plain-list-backup.json');
  await expect(page.getByRole('status')).toHaveText('Backup downloaded.');
});

test('imports a valid backup and replaces the current list', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Task to replace');
  const backup = {
    version: 1,
    tasks: [{ id: 'imported-task', title: 'Imported task', description: 'Restored from backup', completed: false, expanded: true, children: [] }],
  };

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-input').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await expect(page.getByText('Imported task', { exact: true })).toBeVisible();
  await expect(page.getByText('Restored from backup', { exact: true })).toBeVisible();
  await expect(page.getByText('Task to replace', { exact: true })).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Backup imported.');
});

test('rejects an invalid backup without replacing the list', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Keep this task');

  await page.locator('#import-input').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not valid JSON'),
  });

  await expect(page.getByRole('status')).toHaveText('That file is not a valid Plain List backup.');
  await expect(page.getByText('Keep this task', { exact: true })).toBeVisible();
});
