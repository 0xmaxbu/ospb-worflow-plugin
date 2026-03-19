import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecAsync = vi.fn();

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: (fn: unknown) => () => mockExecAsync(),
}));

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

import { executeBeforeHook } from './execute-before';

type ExecuteBeforeHookInput = {
  tool: string;
  sessionId: string;
  callId: string;
};

type ExecuteBeforeHookOutput = {
  args?: {
    command?: string;
  };
};

function createMockInput(tool: string = 'bash'): ExecuteBeforeHookInput {
  return { tool, sessionId: 'test-session', callId: 'test-call' };
}

function createMockOutput(command: string): ExecuteBeforeHookOutput {
  return { args: { command } };
}

describe('executeBeforeHook', () => {
  beforeEach(() => {
    mockGetState.mockReset();
    mockExecAsync.mockReset();
  });

  describe('tool filtering', () => {
    it('should skip non-bash tools', async () => {
      const input = createMockInput('python');
      const output = createMockOutput('python script.py');

      await executeBeforeHook(input, output);

      expect(mockGetState).not.toHaveBeenCalled();
    });

    it('should skip bash tool with no command', async () => {
      const input = createMockInput('bash');
      const output = { args: {} } as ExecuteBeforeHookOutput;

      await executeBeforeHook(input, output);

      expect(mockGetState).not.toHaveBeenCalled();
    });

    it('should skip bash tool with non-string command', async () => {
      const input = createMockInput('bash');
      const output = { args: { command: 123 } } as unknown as ExecuteBeforeHookOutput;

      await executeBeforeHook(input, output);

      expect(mockGetState).not.toHaveBeenCalled();
    });
  });

  describe('prohibited command detection', () => {
    it('should block git push --force', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('git push --force origin main');

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Prohibited command/);
    });

    it('should block git push -f', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('git push -f origin main');

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Prohibited command/);
    });

    it('should block rm -rf /', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('rm -rf /');

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Prohibited command/);
    });

    it('should block :! shell expansion', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput(':!cat /etc/passwd');

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Prohibited command/);
    });

    it('should block $(rm ...) command substitution', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('$(rm -rf /tmp)');

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Prohibited command/);
    });

    it('should allow safe git commands', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('git status');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('bd claim command detection', () => {
    it('should detect bd claim command and check task', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Impl: some task"}', stderr: '' });

      await executeBeforeHook(input, output);

      expect(mockExecAsync).toHaveBeenCalled();
    });

    it('should detect bd update --claim command and check task', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd update --claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Impl: some task"}', stderr: '' });

      await executeBeforeHook(input, output);

      expect(mockExecAsync).toHaveBeenCalled();
    });
  });

  describe('workflow verification blocking', () => {
    it('should block claim when workflow verification required', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({
        canClaimNewTask: () => false,
        currentTask: 'ospb-workflow-plugin-abc',
        isVerified: false,
      });

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Cannot claim task until current task is verified/);
    });

    it('should allow claim when verification not required', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Impl: some task"}', stderr: '' });

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });

  describe('Valid: task verification', () => {
    it('should throw error for Valid: task claim requiring verification', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({
        canClaimNewTask: () => true,
        currentTask: 'ospb-worflow-plugin-xyz',
        isVerified: false,
      });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Valid: Verify spec compliance"}', stderr: '' });

      await expect(executeBeforeHook(input, output)).rejects.toThrow(/Verification Required/);
    });

    it('should allow Valid: task claim when already verified', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({
        canClaimNewTask: () => true,
        currentTask: 'ospb-worflow-plugin-xyz',
        isVerified: true,
      });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Valid: Verify spec compliance"}', stderr: '' });

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });

    it('should allow non-Valid: task claims', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({
        canClaimNewTask: () => true,
        currentTask: null,
        isVerified: false,
      });
      mockExecAsync.mockResolvedValue({ stdout: '{"title":"Impl: Implement feature X"}', stderr: '' });

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });

    it('should handle bd show command failure gracefully', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });
      mockExecAsync.mockRejectedValue(new Error('bd not found'));

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });

    it('should handle invalid JSON from bd show', async () => {
      const input = createMockInput('bash');
      const output = createMockOutput('bd claim ospb-worflow-plugin-xyz');
      mockGetState.mockReturnValue({ canClaimNewTask: () => true });
      mockExecAsync.mockResolvedValue({ stdout: 'not valid json', stderr: '' });

      await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
    });
  });
});
