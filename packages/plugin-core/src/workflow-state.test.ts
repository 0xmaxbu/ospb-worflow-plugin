import { beforeEach, describe, expect, it } from 'vitest';

import { WorkflowState, createWorkflowState, getWorkflowState, persistState, loadState } from './workflow-state';

describe('WorkflowState', () => {
  let state: WorkflowState;

  beforeEach(() => {
    state = createWorkflowState();
  });

  it('should initialize with no current task', () => {
    expect(state.currentTask).toBeNull();
    expect(state.isVerified).toBe(false);
    expect(state.requiresVerification).toBe(true);
  });

  it('should set current task', () => {
    state.setCurrentTask('bd-123');

    expect(state.currentTask).toBe('bd-123');
  });

  it('should mark task as verified', () => {
    state.setCurrentTask('bd-123');
    state.markVerified();

    expect(state.isVerified).toBe(true);
  });

  it('should reset state', () => {
    state.setCurrentTask('bd-123');
    state.markVerified();
    state.reset();

    expect(state.currentTask).toBeNull();
    expect(state.isVerified).toBe(false);
  });

  it('should check if can claim new task when verification required', () => {
    state.setCurrentTask('bd-123');

    expect(state.canClaimNewTask()).toBe(false);

    state.markVerified();

    expect(state.canClaimNewTask()).toBe(true);
  });

  it('should allow bypassing verification if not required', () => {
    state.setRequiresVerification(false);

    expect(state.canClaimNewTask()).toBe(true);
  });

  it('should reset isVerified when setting new currentTask', () => {
    state.setCurrentTask('bd-123');
    state.markVerified();
    expect(state.isVerified).toBe(true);

    state.setCurrentTask('bd-456');

    expect(state.currentTask).toBe('bd-456');
    expect(state.isVerified).toBe(false);
  });

  it('should not allow claiming when currentTask set but not verified', () => {
    state.setCurrentTask('bd-123');
    state.markVerified();
    state.setCurrentTask('bd-789');

    expect(state.canClaimNewTask()).toBe(false);
  });
});

describe('persistState and loadState', () => {
  it('should return null when no persisted state exists', async () => {
    const result = await loadState();
    expect(result).toBeNull();
  });

  it('should persist and load state correctly', async () => {
    const state = getWorkflowState();
    state.setCurrentTask('bd-persist-test');
    state.markVerified();
    state.setRequiresVerification(true);

    await persistState();

    const freshState = getWorkflowState();
    freshState.reset();
    freshState.setRequiresVerification(false);

    await loadState();

    expect(freshState.currentTask).toBe('bd-persist-test');
    expect(freshState.isVerified).toBe(true);
    expect(freshState.requiresVerification).toBe(true);
  });

  it('should handle null currentTask in persisted state', async () => {
    const state = getWorkflowState();
    state.reset();
    state.setRequiresVerification(false);

    await persistState();

    const freshState = getWorkflowState();
    freshState.setCurrentTask('some-task');
    freshState.markVerified();

    await loadState();

    expect(freshState.currentTask).toBeNull();
    expect(freshState.isVerified).toBe(false);
  });
});

describe('getWorkflowState singleton', () => {
  it('should return the same instance', () => {
    const instance1 = getWorkflowState();
    const instance2 = getWorkflowState();

    expect(instance1).toBe(instance2);
  });

  it('should share state across calls', () => {
    const instance1 = getWorkflowState();
    instance1.setCurrentTask('bd-shared');

    const instance2 = getWorkflowState();
    expect(instance2.currentTask).toBe('bd-shared');
  });
});
