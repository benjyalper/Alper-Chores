import { test, expect } from '@playwright/test';

// Critical-path smoke tests. Requires a running app backed by a TEST database
// (configured via playwright.config.ts webServer). These do not run against the
// production Railway database.

test.describe('Alper Chores — critical workflows', () => {
  test('1. loads the current week schedule', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByText(/This week|Past week|Upcoming week/)).toBeVisible();
  });

  test('2. renames a family member', async ({ page }) => {
    await page.goto('/family');
    await page.getByRole('button', { name: 'Edit' }).first().click();
    const input = page.getByRole('dialog').getByLabel('Name');
    await input.fill('Benjy');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Benjy')).toBeVisible();
  });

  test('3. adds a family member', async ({ page }) => {
    await page.goto('/family');
    await page.getByLabel('Name').first().fill('Guest');
    await page.getByRole('button', { name: 'Add family member' }).click();
    await expect(page.getByText('Guest')).toBeVisible();
  });

  test('4. assigns a breakfast chore', async ({ page }) => {
    await page.goto('/');
    // Find a Breakfast card's member select and assign the first member.
    const select = page.getByLabel(/Assign Breakfast/i).first();
    await select.selectOption({ index: 1 });
    // Recurring -> scope dialog -> Save.
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved')).toBeVisible();
  });

  test('5. adds a one-time chore', async ({ page }) => {
    await page.goto('/chores');
    await page.getByRole('button', { name: /Add chore/ }).click();
    await page.getByLabel(/Chore name/).fill('Test one-time chore');
    await page.getByLabel('Repeats').selectOption('ONCE');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Test one-time chore')).toBeVisible();
  });

  test('6. adds a recurring chore and it persists after reload', async ({ page }) => {
    await page.goto('/chores');
    await page.getByRole('button', { name: /Add chore/ }).click();
    await page.getByLabel(/Chore name/).fill('Weekly recurring chore');
    await page.getByLabel('Repeats').selectOption('WEEKLY');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Weekly recurring chore')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Weekly recurring chore')).toBeVisible();
  });
});
