import { test, expect } from '@playwright/test';

async function addTask(page, title) {
  await page.getByLabel('New task').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

async function addSubtask(page, parent, title) {
  await page.getByRole('textbox', { name: `Add a subtask to ${parent}` }).fill(title);
  await page.getByRole('button', { name: `Add subtask to ${parent}` }).click();
}

// Native drag needs a shared DataTransfer across the event sequence, which
// synthetic DragEvents give us consistently on all three engines.
async function dragTask(page, fromTitle, toTitle, intent = 'inside') {
  await page.evaluate(([from, to, placement]) => {
    const li = title => Array.from(document.querySelectorAll('li.task'))
      .find(node => node.querySelector('.task-title')?.textContent === title);
    const source = li(from);
    const target = li(to);
    const handle = source.querySelector('.drag-handle');
    const dataTransfer = new DataTransfer();
    const bounds = target.getBoundingClientRect();
    const clientY = placement === 'before' ? bounds.top + 1 : placement === 'after' ? bounds.bottom - 1 : bounds.top + bounds.height / 2;
    const fire = (node, type) => node.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer, clientY }));
    fire(handle, 'dragstart');
    fire(target, 'dragover');
    fire(target, 'drop');
    fire(handle, 'dragend');
  }, [fromTitle, toTitle, intent]);
}

// Drives the browser's real drag machinery. `locator.dragTo` emits too few
// moves for Chromium to promote the gesture into a native drag, so step it out.
async function dragTaskWithMouse(page, fromTitle, toTitle) {
  const source = page.locator('#task-list > li.task').filter({ hasText: fromTitle }).locator('.drag-handle').first();
  const target = page.locator('#task-list > li.task').filter({ hasText: toTitle }).first();
  const box = await target.boundingBox();
  await source.hover();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 8, { steps: 10 });
  await page.mouse.move(box.x + box.width / 2, box.y + 9, { steps: 5 });
  await page.mouse.up();
}

const topLevelTitles = page => page.locator('#task-list > li.task > .task-main .task-title');

test('reorders with a real mouse drag', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await addTask(page, 'Gamma');

  await dragTaskWithMouse(page, 'Alpha', 'Gamma');
  await expect(topLevelTitles(page)).toHaveText(['Beta', 'Alpha', 'Gamma']);
});

test('drags a parent task below a later sibling', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await addTask(page, 'Gamma');

  await dragTask(page, 'Alpha', 'Gamma', 'after');
  await expect(topLevelTitles(page)).toHaveText(['Beta', 'Gamma', 'Alpha']);
  await expect(page.getByRole('status')).toHaveText('Moved “Alpha”.');
});

test('drags a parent task above an earlier sibling', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await addTask(page, 'Gamma');

  await dragTask(page, 'Gamma', 'Alpha', 'before');
  await expect(topLevelTitles(page)).toHaveText(['Gamma', 'Alpha', 'Beta']);
});

test('drag reordering survives a reload', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');

  await dragTask(page, 'Beta', 'Alpha', 'before');
  await page.reload();
  await expect(topLevelTitles(page)).toHaveText(['Beta', 'Alpha']);
});

test('drags a subtask within its own parent', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent');
  await addSubtask(page, 'Parent', 'Sub A');
  await addSubtask(page, 'Parent', 'Sub B');
  await addSubtask(page, 'Parent', 'Sub C');

  await dragTask(page, 'Sub C', 'Sub A', 'before');
  await expect(page.locator('.subtasks .task-title')).toHaveText(['Sub C', 'Sub A', 'Sub B']);
});

test('moves a subtask and its nested subtree into another parent', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent one');
  await addTask(page, 'Parent two');
  await addSubtask(page, 'Parent one', 'Sub one');
  await addSubtask(page, 'Sub one', 'Nested child');

  await dragTask(page, 'Sub one', 'Parent two', 'inside');

  const firstParent = page.locator('#task-list > li.task').filter({ has: page.getByText('Parent one', { exact: true }) });
  const secondParent = page.locator('#task-list > li.task').filter({ has: page.getByText('Parent two', { exact: true }) });
  await expect(firstParent.getByText('Sub one', { exact: true })).toHaveCount(0);
  await expect(secondParent.getByText('Sub one', { exact: true })).toBeVisible();
  await expect(secondParent.getByText('Nested child', { exact: true })).toBeVisible();
  await expect(topLevelTitles(page)).toHaveText(['Parent one', 'Parent two']);
  await expect(page.getByRole('status')).toHaveText('Moved “Sub one” into “Parent two”.');
});

test('promotes a deeply nested subtask to a top-level parent', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent');
  await addTask(page, 'Other parent');
  await addSubtask(page, 'Parent', 'Child');
  await addSubtask(page, 'Child', 'Grandchild');
  await addSubtask(page, 'Grandchild', 'Great grandchild');

  await dragTask(page, 'Grandchild', 'Other parent', 'after');

  await expect(topLevelTitles(page)).toHaveText(['Parent', 'Other parent', 'Grandchild']);
  const promoted = page.locator('#task-list > li.task').filter({ has: page.getByText('Grandchild', { exact: true }) });
  await expect(promoted.getByText('Great grandchild', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Moved “Grandchild” to the top level.');
});

test('nests a top-level parent inside another task', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent one');
  await addTask(page, 'Parent two');

  await dragTask(page, 'Parent one', 'Parent two', 'inside');

  await expect(topLevelTitles(page)).toHaveText(['Parent two']);
  const parentTwo = page.locator('#task-list > li.task').filter({ has: page.getByText('Parent two', { exact: true }) });
  await expect(parentTwo.getByText('Parent one', { exact: true })).toBeVisible();
});

test('prevents dropping a task into its own descendant', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Parent');
  await addSubtask(page, 'Parent', 'Child');

  await dragTask(page, 'Parent', 'Child', 'inside');

  await expect(topLevelTitles(page)).toHaveText(['Parent']);
  await expect(page.getByText('Child', { exact: true })).toBeVisible();
});

test('keeps the move up and down buttons working', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');

  await expect(page.getByRole('button', { name: 'Move Alpha up' })).toBeDisabled();
  await page.getByRole('button', { name: 'Move Alpha down' }).click();
  await expect(topLevelTitles(page)).toHaveText(['Beta', 'Alpha']);
});

test('leaves the drag handle out of the tab order', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');

  const handle = page.locator('.drag-handle').first();
  await expect(handle).toHaveAttribute('aria-hidden', 'true');
  await expect(handle).toHaveAttribute('tabindex', '-1');
  await expect(handle).toHaveAttribute('draggable', 'true');
});

test('places the drag handle before and aligned with the checkbox', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Alpha');

  const handleBox = await page.locator('.drag-handle').first().boundingBox();
  const checkboxBox = await page.getByRole('checkbox', { name: 'Mark Alpha as complete' }).boundingBox();
  expect(handleBox.x).toBeLessThan(checkboxBox.x);
  expect(Math.abs((handleBox.y + handleBox.height / 2) - (checkboxBox.y + checkboxBox.height / 2))).toBeLessThan(1);
});
