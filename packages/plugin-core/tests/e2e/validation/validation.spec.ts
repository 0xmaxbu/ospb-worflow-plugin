import { test, expect } from '@playwright/test';

test.describe('Validation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('verify-code validates implementation against spec', async ({ page }) => {
    await page.waitForSelector('[data-testid="verify-button"]');
    await page.click('[data-testid="verify-button"]');
    
    const result = page.locator('[data-testid="verify-result"]');
    await expect(result).toBeVisible();
  });

  test('openspec validator checks change structure', async ({ page }) => {
    await page.waitForSelector('[data-testid="openspec-panel"]');
    
    const panel = page.locator('[data-testid="openspec-panel"]');
    await expect(panel).toContainText('openspec');
  });
});
