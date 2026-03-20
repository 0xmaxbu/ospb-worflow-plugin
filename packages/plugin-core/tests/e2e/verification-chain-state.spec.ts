import { test, expect } from '@playwright/test';
import { createMockWorkflowState } from '../setup';

test.describe('Verification Chain State Tests', () => {
  test('workflow state tracks current task', async () => {
    const state = createMockWorkflowState({
      currentTask: 'task-impl-1',
      isVerified: false,
    });
    
    expect(state.currentTask).toBe('task-impl-1');
    expect(state.canClaimNewTask()).toBe(false);
  });

  test('workflow state allows claiming after verification', async () => {
    const state = createMockWorkflowState({
      currentTask: 'task-impl-1',
      isVerified: true,
      requiresVerification: true,
    });
    
    expect(state.canClaimNewTask()).toBe(true);
  });

  test('workflow state resets after verification', async () => {
    const state = createMockWorkflowState({
      currentTask: 'task-impl-1',
      isVerified: true,
    });
    
    state.reset();
    
    expect(state.currentTask).toBeNull();
    expect(state.isVerified).toBe(false);
  });

  test('verification chain blocks non-sequential claims', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="task-list"]');
    
    const task3 = page.locator('[data-testid="task-impl-3"]');
    await task3.click();
    
    const claimBtn = page.locator('[data-testid="claim-task-btn"]');
    await claimBtn.click();
    
    const error = page.locator('[data-testid="non-sequential-claim-error"]');
    await expect(error).toBeVisible();
  });
});
