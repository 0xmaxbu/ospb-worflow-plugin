import { test, expect } from '@playwright/test';
import { mockCodeReviewer } from './mocks/code-reviewer.mock';

test.describe('Verification Task Trigger Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('validation triggers after implementation task completes', async ({ page }) => {
    await page.waitForSelector('[data-testid="task-list"]');
    
    const implementationTask = page.locator('[data-testid="task-impl-1"]');
    await implementationTask.click();
    await page.locator('[data-testid="complete-task-btn"]').click();
    
    const validationTask = page.locator('[data-testid="task-valid-1"]');
    await expect(validationTask).toBeVisible();
  });

  test('code-reviewer validates implementation against spec', async ({ page }) => {
    await page.waitForSelector('[data-testid="verify-panel"]');
    
    const result = await mockCodeReviewer.review({
      specRef: 'spec-001',
      implementationPath: './src',
    });
    
    expect(result.passed).toBe(true);
  });
});
