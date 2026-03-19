import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';

import type { Hooks } from '@opencode-ai/plugin';

import { getWorkflowState } from '../workflow-state';

const execAsync = promisify(childProcessExec);

const PROHIBITED_PATTERNS = [
  /git\s+push\s+(-f|--force)/i,
  /rm\s+-rf\s+\//i,
  /:\s*!/,
  /\$\(\s*rm/i,
];

function isCommandProhibited(command: string): boolean {
  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(command));
}

function isBdClaimCommand(command: string): boolean {
  return /bd\s+(claim|update\s+--claim)/i.test(command);
}

function extractTaskIdFromClaim(command: string): string | null {
  const match = command.match(/bd\s+(?:update\s+--claim|claim)\s+(\S+)/i);
  return match ? match[1] : null;
}

async function isValidTask(taskId: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`bd show ${taskId} --json`);
    const task = JSON.parse(stdout);
    return (task.title as string | undefined)?.startsWith('Valid:') ?? false;
  } catch {
    return false;
  }
}

async function getWorkflowVerificationStatus(taskId: string): Promise<boolean> {
  const state = getWorkflowState();
  return state.currentTask === taskId && state.isVerified;
}

type ExecuteBeforeHook = NonNullable<Hooks['tool.execute.before']>;
type ExecuteBeforeHookInput = Parameters<ExecuteBeforeHook>[0];
type ExecuteBeforeHookOutput = Parameters<ExecuteBeforeHook>[1];

export async function executeBeforeHook(
  input: ExecuteBeforeHookInput,
  output: ExecuteBeforeHookOutput,
): Promise<void> {
  if (input.tool !== 'bash') {
    return;
  }

  const command = output.args?.command;
  if (!command || typeof command !== 'string') {
    return;
  }

  if (isCommandProhibited(command)) {
    throw new Error(
      `🚫 Prohibited command detected: ${command}\nThis command is blocked by workflow guard.`,
    );
  }

  if (isBdClaimCommand(command)) {
    const state = getWorkflowState();

    if (!state.canClaimNewTask()) {
      throw new Error(
        `🚫 Workflow Violation: Cannot claim task until current task is verified.\nCurrent: ${state.currentTask}\nStatus: ${state.isVerified ? 'Verified' : 'Not Verified'}\nRequired: Complete verification first.`,
      );
    }

    const taskId = extractTaskIdFromClaim(command);
    if (taskId) {
      const validTask = await isValidTask(taskId);
      if (validTask) {
        const alreadyVerified = await getWorkflowVerificationStatus(taskId);
        if (!alreadyVerified) {
          throw new Error(
            `🔍 Verification Required: Task "${taskId}" is a Valid: task.\n\nPlease call the verify-code tool first:\n  verify-code ${taskId}\n\nAfter verification passes, you can retry the claim.`,
          );
        }
      }
    }
  }
}
