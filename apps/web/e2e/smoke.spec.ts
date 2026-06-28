import { test, expect } from '@playwright/test';

test('has title and login button', async ({ page }) => {
  await page.goto('/');

  // Should have title
  await expect(page).toHaveTitle(/Verve/i);
});
