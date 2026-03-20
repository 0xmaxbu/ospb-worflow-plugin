import { test, expect } from '@playwright/test';

test.describe('Tools E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('blocked commands are prevented', async ({ page }) => {
    await page.waitForSelector('[data-testid="terminal-input"]');
    
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.fill('git push --force');
    await terminal.press('Enter');
    
    const warning = page.locator('[data-testid="command-blocked-warning"]');
    await expect(warning).toBeVisible();
  });

  test('tool-check validates required tools', async ({ page }) => {
    await page.waitForSelector('[data-testid="tools-status"]');
    
    const status = page.locator('[data-testid="tools-status"]');
    await expect(status).toContainText('bd');
    await expect(status).toContainText('openspec');
  });
});
