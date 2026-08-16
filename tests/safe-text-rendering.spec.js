import { test, expect } from '@playwright/test';

test('renders HTML-like task text safely', async ({ page }) => {
  await page.goto('/');

  const unsafeLookingText = '<img src=x onerror=alert(1)>';

  await page.getByLabel('New task').fill(unsafeLookingText);
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(
    page.getByText(unsafeLookingText, { exact: true })
  ).toBeVisible();

  await expect(page.locator('#task-list img')).toHaveCount(0);
  await expect(page.locator('#task-list script')).toHaveCount(0);
});
