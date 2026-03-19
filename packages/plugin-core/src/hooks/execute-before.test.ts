import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Hooks } from '@opencode-ai/plugin';

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

import { executeBeforeHook } from './execute-before';

type ExecuteBeforeHook = NonNullable<Hooks['tool.execute.before']>;
type ExecuteBeforeHookInput = Parameters<ExecuteBeforeHook>[0];
type ExecuteBeforeHookOutput = Parameters<ExecuteBeforeHook>[1];

describe('executeBeforeHook', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  describe('bd claim blocking', () => {
    it('should block bd claim when task not verified', async () => {
      mockGetState.mockReturnValue({
        currentTask: 'bd-123',
        isVerified: false,
        requiresVerification: true,
        canClaimNewTask: () => false,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'bd claim bd-456' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Workflow Violation');
    });

    it('should allow bd claim when no current task', async () => {
      mockGetState.mockReturnValue({
        currentTask: null,
        isVerified: false,
        requiresVerification: true,
        canClaimNewTask: () => true,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'bd claim bd-456' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });

    it('should allow bd claim when task is verified', async () => {
      mockGetState.mockReturnValue({
        currentTask: 'bd-123',
        isVerified: true,
        requiresVerification: true,
        canClaimNewTask: () => true,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'bd claim bd-456' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('prohibited commands', () => {
    it('should block git push --force', async () => {
      mockGetState.mockReturnValue({
        currentTask: null,
        isVerified: false,
        requiresVerification: false,
        canClaimNewTask: () => true,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'git push --force origin main' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should block rm -rf /', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'rm -rf /' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should allow normal git commands', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'git status' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('non-bash tools', () => {
    it('should pass through non-bash tools', async () => {
      const input = {
        tool: 'read',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: {},
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('additional prohibited patterns', () => {
    it('should block git push -f (short form)', async () => {
      mockGetState.mockReturnValue({
        currentTask: null,
        isVerified: false,
        requiresVerification: false,
        canClaimNewTask: () => true,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'git push -f origin main' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should block rm -rf /*', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'rm -rf /*' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should block shell substitution $(rm', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'echo $(rm -rf /)' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should block dangerous bang pattern command:!', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'command:!dangerous' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
    });

    it('should not block git push without force', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'git push origin main' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('bd claim variants', () => {
    it('should block bd update --claim when task not verified', async () => {
      mockGetState.mockReturnValue({
        currentTask: 'bd-123',
        isVerified: false,
        requiresVerification: true,
        canClaimNewTask: () => false,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'bd update --claim bd-456' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).rejects.toThrow('Workflow Violation');
    });

    it('should allow bd update --claim when no current task', async () => {
      mockGetState.mockReturnValue({
        currentTask: null,
        isVerified: false,
        requiresVerification: true,
        canClaimNewTask: () => true,
      });

      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 'bd update --claim bd-456' },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing args.command', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: {},
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });

    it('should handle non-string command', async () => {
      const input = {
        tool: 'bash',
        sessionID: 'session-1',
        callID: 'call-1',
      } as ExecuteBeforeHookInput;

      const output = {
        args: { command: 123 },
      } as ExecuteBeforeHookOutput;

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });
});
