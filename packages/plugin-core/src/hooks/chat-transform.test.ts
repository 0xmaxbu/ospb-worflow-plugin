import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

import { chatTransformHook } from './chat-transform';

type ChatTransformInput = {
  messages: Array<{ role: string; content: string }>;
  params: Record<string, unknown>;
};

describe('chatTransformHook', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('should inject workflow context when present', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-123',
      isVerified: false,
      requiresVerification: true,
    });

    const input = {
      messages: [{ role: 'user', content: 'Hello' }],
      params: {},
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.messages[0].content).toContain('bd-123');
    expect(result.messages[0].content).toContain('Workflow Context');
  });

  it('should not inject when no current task', async () => {
    mockGetState.mockReturnValue({
      currentTask: null,
      isVerified: false,
      requiresVerification: true,
    });

    const input = {
      messages: [{ role: 'user', content: 'Hello' }],
      params: {},
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.messages[0].content).toBe('Hello');
  });

  it('should indicate verification status in context', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-123',
      isVerified: true,
      requiresVerification: true,
    });

    const input = {
      messages: [{ role: 'user', content: 'Hello' }],
      params: {},
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.messages[0].content).toContain('Verified: true');
  });
});
