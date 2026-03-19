import { vi } from 'vitest';

type MockClient = {
  session: {
    prompt: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
  };
  telemetry: {
    record: ReturnType<typeof vi.fn>;
  };
};

type MockShell = {
  exec: ReturnType<typeof vi.fn>;
  spawn: ReturnType<typeof vi.fn>;
};

export function createMockPluginInput(overrides?: {
  project?: { id: string; worktree: string; vcs: string; name: string };
  directory?: string;
  worktree?: string;
  client?: MockClient;
  shell?: MockShell;
}) {
  return {
    project: overrides?.project ?? {
      id: 'test-project',
      worktree: '/tmp/test',
      vcs: 'git',
      name: 'test',
    },
    directory: overrides?.directory ?? '/tmp/test',
    worktree: overrides?.worktree ?? '/tmp/test',
    serverUrl: new URL('http://localhost:3000'),
    client: overrides?.client ?? createMockClient(),
    $: overrides?.shell ?? createMockShell(),
  };
}

function createMockClient(): MockClient {
  return {
    session: {
      prompt: vi.fn().mockResolvedValue({ message: { content: 'test' } }),
      complete: vi.fn().mockResolvedValue({ message: { content: 'test' } }),
    },
    telemetry: {
      record: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function createMockShell(): MockShell {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    spawn: vi.fn(),
  };
}

export function createMockHookContext() {
  return {
    tool: 'bash',
    sessionID: 'test-session',
    callID: 'test-call',
  };
}

export function createMockWorkflowState(overrides?: {
  currentTask?: string | null;
  isVerified?: boolean;
  requiresVerification?: boolean;
}) {
  return {
    currentTask: overrides?.currentTask ?? null,
    isVerified: overrides?.isVerified ?? false,
    requiresVerification: overrides?.requiresVerification ?? true,
    canClaimNewTask: () => {
      if (!overrides?.requiresVerification) return true;
      if (!overrides?.currentTask) return true;
      return overrides?.isVerified ?? false;
    },
    setCurrentTask: vi.fn(),
    markVerified: vi.fn(),
    reset: vi.fn(),
    setRequiresVerification: vi.fn(),
  };
}
