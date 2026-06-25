import { test, expect } from '@playwright/test';

test.describe('Task Creation & Command Palette', () => {
  test('should open command palette and navigate to task creation', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Press CMD+K to open the command palette
    await page.keyboard.press('Meta+k');
    
    // Expect the command palette to be visible
    const commandDialog = page.locator('[role="dialog"]');
    await expect(commandDialog).toBeVisible();

    // Type "Create Task" in the input
    await page.fill('input[cmdk-input]', 'Create Task');
    
    // Click on the Create Task item
    await page.click('text="Create Task"');

    // The router should have pushed /dashboard?newTask=true
    await expect(page).toHaveURL(/.*newTask=true/);
  });
});
