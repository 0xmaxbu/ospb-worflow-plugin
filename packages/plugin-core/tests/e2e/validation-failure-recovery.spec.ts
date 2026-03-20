import { test, expect } from '@playwright/test';
import { mockCodeReviewer } from './mocks/code-reviewer.mock';

test.describe('Verification Failure Recovery Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('failed validation reopens blocked tasks', async ({ page }) => {
    await page.waitForSelector('[data-testid="task-list"]');
    
    const validationTask = page.locator('[data-testid="task-valid-1"]');
    await validationTask.click();
    
    await page.locator('[data-testid="run-validation-btn"]').click();
    
    const result = await mockCodeReviewer.reviewWithIssues({
      specRef: 'spec-001',
      implementationPath: './src',
    });
    
    expect(result.passed).toBe(false);
    
    const blockedTask = page.locator('[data-testid="task-impl-1-reopened"]');
    await expect(blockedTask).toBeVisible();
  });

  test('validation errors show actionable suggestions', async ({ page }) => {
    await page.waitForSelector('[data-testid="verify-panel"]');
    
    const result = await mockCodeReviewer.reviewWithIssues({
      specRef: 'spec-001',
      implementationPath: './src',
    });
    
    expect(result.issues.length).toBeGreaterThan(0);
    
    const firstIssue = result.issues[0];
    expect(firstIssue.suggestion).toBeDefined();
  });
});
