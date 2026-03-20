import { test, expect } from '@playwright/test';

test.describe('Task Claim Interception Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('prevents claiming task outside verification chain', async ({ page }) => {
    await page.waitForSelector('[data-testid="task-list"]');
    
    const unauthorizedTask = page.locator('[data-testid="task-other-1"]');
    await unauthorizedTask.click();
    
    const claimBtn = page.locator('[data-testid="claim-task-btn"]');
    await claimBtn.click();
    
    const warning = page.locator('[data-testid="claim-blocked-warning"]');
    await expect(warning).toBeVisible();
  });

  test('allows claiming tasks in verification chain', async ({ page }) => {
    await page.waitForSelector('[data-testid="task-list"]');
    
    const validTask = page.locator('[data-testid="task-impl-1"]');
    await validTask.click();
    
    const claimBtn = page.locator('[data-testid="claim-task-btn"]');
    await claimBtn.click();
    
    const success = page.locator('[data-testid="claim-success"]');
    await expect(success).toBeVisible();
  });

  test('workflow guard blocks dangerous commands', async ({ page }) => {
    await page.waitForSelector('[data-testid="terminal-input"]');
    
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.fill('rm -rf /');
    await terminal.press('Enter');
    
    const blocked = page.locator('[data-testid="command-blocked-warning"]');
    await expect(blocked).toBeVisible();
  });
});
