import { test, expect } from '@playwright/test';

test.describe('Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('workflow-start executes bd ready queue', async ({ page }) => {
    await page.waitForSelector('[data-testid="workflow-panel"]');
    
    const startButton = page.locator('[data-testid="workflow-start-btn"]');
    await startButton.click();
    
    const taskList = page.locator('[data-testid="task-list"]');
    await expect(taskList).toBeVisible();
  });

  test('workflow-explore helps clarify requirements', async ({ page }) => {
    await page.waitForSelector('[data-testid="explore-btn"]');
    await page.click('[data-testid="explore-btn"]');
    
    const modal = page.locator('[data-testid="explore-modal"]');
    await expect(modal).toBeVisible();
  });
});
