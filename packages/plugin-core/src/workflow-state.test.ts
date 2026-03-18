import { beforeEach, describe, expect, it } from 'vitest';

import { WorkflowState, createWorkflowState } from './workflow-state';

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
});
