import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockAccess = vi.fn();
const mockMkdir = vi.fn();

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  access: mockAccess,
  mkdir: mockMkdir,
}));

vi.mock('./verify-code', () => ({
  verifyCode: vi.fn().mockResolvedValue({
    success: true,
    taskId: 'test-task',
    specRef: 'spec.md#requirement',
    message: 'Verification passed',
  }),
}));

vi.mock('./workflow-state', () => ({
  getWorkflowState: vi.fn().mockReturnValue({
    markVerified: vi.fn(),
    isVerified: false,
    currentTask: null,
    canClaimNewTask: () => true,
  }),
}));

describe('WorkflowTools', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('workflowExploreTool', () => {
    it('should create exploration draft successfully', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { workflowExploreTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await workflowExploreTool.execute(
        { requirement: 'Test feature', draftName: 'test-feature' },
        context,
      );

      expect(result).toContain('✓ Created exploration draft');
      expect(result).toContain('test-feature.md');
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toContain('test-feature.md');
      expect(writeCall[1]).toContain('Test feature');
    });

    it('should use generated draft name when not provided', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { workflowExploreTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await workflowExploreTool.execute(
        { requirement: 'Test feature' },
        context,
      );

      expect(result).toContain('✓ Created exploration draft');
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toMatch(/exploration-\d+\.md$/);
    });

    it('should handle file system errors gracefully', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      const { workflowExploreTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await workflowExploreTool.execute(
        { requirement: 'Test feature', draftName: 'test' },
        context,
      );

      expect(result).toContain('✗ Failed to create draft');
      expect(result).toContain('Permission denied');
    });
  });

  describe('planReviewTool', () => {
    it('should identify plan issues', async () => {
      mockReadFile.mockResolvedValue('# Plan without proper structure');

      const { planReviewTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await planReviewTool.execute({ planName: 'test-plan' }, context);

      expect(result).toContain('Plan Review: test-plan');
      expect(result).toContain('Issues');
      expect(result).toContain('Spec-ref references');
      expect(result).toContain('step headers');
    });

    it('should suggest TDD tasks for impl without tests', async () => {
      mockReadFile.mockResolvedValue(
        '## Impl: Some feature\nSome implementation content',
      );

      const { planReviewTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await planReviewTool.execute({ planName: 'test-plan' }, context);

      expect(result).toContain('Suggestions');
      expect(result).toContain('TDD workflow');
    });

    it('should suggest Valid tasks for verification', async () => {
      mockReadFile.mockResolvedValue(
        '## Impl: Some feature\n## Impl: Another feature',
      );

      const { planReviewTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await planReviewTool.execute({ planName: 'test-plan' }, context);

      expect(result).toContain('Suggestions');
      expect(result).toContain('Valid: tasks');
    });

    it('should pass plan with proper structure', async () => {
      mockReadFile.mockResolvedValue(
        '## Step 1\nSpec-ref: spec.md#requirement\n\n## Step 2\nSpec-ref: spec.md#another\n\nTest: Some test\nValid: Verification',
      );

      const { planReviewTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await planReviewTool.execute({ planName: 'test-plan' }, context);

      expect(result).toContain('Plan looks good');
    });

    it('should handle missing plan file', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const { planReviewTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await planReviewTool.execute({ planName: 'nonexistent' }, context);

      expect(result).toContain('✗ Failed to review plan');
    });
  });

  describe('workflowTools exports', () => {
    it('should export all workflow tools', async () => {
      const { workflowTools } = await import('./workflow-tools');

      expect(workflowTools).toHaveProperty('init-workflow');
      expect(workflowTools).toHaveProperty('verify-code');
      expect(workflowTools).toHaveProperty('workflow-explore');
      expect(workflowTools).toHaveProperty('workflow-propose');
      expect(workflowTools).toHaveProperty('workflow-plan');
      expect(workflowTools).toHaveProperty('workflow-task');
      expect(workflowTools).toHaveProperty('workflow-start');
      expect(workflowTools).toHaveProperty('workflow-archive');
      expect(workflowTools).toHaveProperty('plan-review');
    });

    it('should have correct number of tools', async () => {
      const { workflowTools } = await import('./workflow-tools');

      expect(Object.keys(workflowTools)).toHaveLength(9);
    });
  });

  describe('verifyCodeTool', () => {
    it('should verify code successfully', async () => {
      const { verifyCodeTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await verifyCodeTool.execute({ taskId: 'test-task' }, context);

      expect(result).toContain('✓ Verification passed');
      expect(result).toContain('test-task');
    });

    it('should show errors on verification failure', async () => {
      const { verifyCode } = await import('./verify-code');
      verifyCode.mockResolvedValueOnce({
        success: false,
        taskId: 'test-task',
        specRef: 'spec.md#requirement',
        message: 'Requirement not met',
        errors: ['Missing implementation'],
      });

      const { verifyCodeTool } = await import('./workflow-tools');

      const context = {
        directory: '/test/project',
        sessionID: 'test-session',
        messageID: 'test-message',
        agent: 'test-agent',
        worktree: '/test',
        abort: new AbortController().signal,
        metadata: vi.fn(),
        ask: vi.fn(),
      };

      const result = await verifyCodeTool.execute({ taskId: 'test-task' }, context);

      expect(result).toContain('✗ Verification failed');
      expect(result).toContain('Missing implementation');
    });
  });
});
