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

  it('should show Verified: false when not verified', async () => {
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

    expect(result.messages[0].content).toContain('Verified: false');
  });

  it('should pass through params unchanged', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-123',
      isVerified: false,
      requiresVerification: true,
    });

    const input = {
      messages: [{ role: 'user', content: 'Hello' }],
      params: { temperature: 0.7, top_p: 0.9 },
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.params).toEqual({ temperature: 0.7, top_p: 0.9 });
  });

  it('should prepend context message to existing messages', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-test',
      isVerified: true,
      requiresVerification: true,
    });

    const input = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
      params: {},
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.messages.length).toBe(3);
    expect(result.messages[0].content).toContain('Workflow Context');
    expect(result.messages[1].content).toBe('You are a helpful assistant.');
    expect(result.messages[2].content).toBe('Hello');
  });

  it('should include requiresVerification status in context', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-123',
      isVerified: false,
      requiresVerification: false,
    });

    const input = {
      messages: [{ role: 'user', content: 'Hello' }],
      params: {},
    } as ChatTransformInput;

    const result = await chatTransformHook(input);

    expect(result.messages[0].content).toContain('Requires Verification: false');
  });
});
