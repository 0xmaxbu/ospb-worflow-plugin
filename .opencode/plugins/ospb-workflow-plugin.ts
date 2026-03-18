/**
 * OSPB Workflow Plugin - Local Development Entry
 * 
 * This file is for local testing only.
 * OpenCode automatically loads .ts files from .opencode/plugins/
 * 
 * Usage:
 * 1. Ensure plugin-core is built: pnpm run build
 * 2. Copy this file to your project's .opencode/plugins/
 * 3. Start OpenCode - plugin will auto-load
 */

import type { Plugin, Hooks } from '@opencode-ai/plugin';

// Workflow state management
interface WorkflowState {
  currentTask: string | null;
  isVerified: boolean;
  requiresVerification: boolean;
}

const PROHIBITED_PATTERNS = [
  /git\s+push\s+--force/i,
  /rm\s+-rf\s+\//i,
  /:\s*!/,
  /\$\(\s*rm/i,
];

function isCommandProhibited(command: string): boolean {
  return PROHIBITED_PATTERNS.some(pattern => pattern.test(command));
}

function isBdClaimCommand(command: string): boolean {
  return /bd\s+(claim|update\s+--claim)/i.test(command);
}

// In-memory workflow state (for session)
let workflowState: WorkflowState = {
  currentTask: null,
  isVerified: false,
  requiresVerification: true,
};

// tool.execute.before Hook
async function executeBeforeHook(
  input: { tool: string; args?: { command?: string } },
  _output: unknown
): Promise<void> {
  if (input.tool !== 'bash') {
    return;
  }

  const command = input.args?.command;
  if (!command || typeof command !== 'string') {
    return;
  }

  if (isCommandProhibited(command)) {
    throw new Error(
      `🚫 Prohibited command detected: ${command}\nThis command is blocked by workflow guard.`
    );
  }

  if (isBdClaimCommand(command)) {
    if (workflowState.currentTask && !workflowState.isVerified && workflowState.requiresVerification) {
      throw new Error(
        `🚫 Workflow Violation: Cannot claim task until current task is verified.
Current: ${workflowState.currentTask}
Status: Not Verified
Required: Complete verification first.`
      );
    }
  }
}

// experimental.chat.system.transform Hook
async function chatTransformHook(
  input: { messages: Array<{ role: string; content: string }>; params: Record<string, unknown> }
): Promise<{ messages: Array<{ role: string; content: string }>; params: Record<string, unknown> }> {
  if (!workflowState.currentTask) {
    return { messages: input.messages, params: input.params };
  }

  const contextMessage = {
    role: 'system' as const,
    content: `[Workflow Context]
Current Task: ${workflowState.currentTask}
Verified: ${workflowState.isVerified}
Requires Verification: ${workflowState.requiresVerification}

Please ensure all changes are verified before marking tasks complete.`,
  };

  return {
    messages: [contextMessage, ...input.messages],
    params: input.params,
  };
}

// session.idle Hook
async function sessionIdleHook(_input: { sessionId: string }): Promise<{ role: 'user'; content: string } | null> {
  if (!workflowState.currentTask || workflowState.isVerified || !workflowState.requiresVerification) {
    return null;
  }

  return {
    role: 'user',
    content: `🔔 Workflow Reminder: You have an unverified task "${workflowState.currentTask}". 

Please verify your work before:
- Claiming a new task
- Closing the session

Use \`bd show ${workflowState.currentTask}\` to review and verify.`,
  };
}

// experimental.session.compacting Hook
async function sessionCompactingHook(): Promise<void> {
  // In production, persist state to disk here
  console.log('[ospb-workflow-plugin] Session compacting - state:', workflowState);
}

export const OspbWorkflowPlugin: Plugin = async () => {
  return {
    name: 'ospb-workflow-plugin',
    hooks: {
      'tool.execute.before': executeBeforeHook,
      'experimental.chat.system.transform': chatTransformHook,
      'session.idle': sessionIdleHook,
      'experimental.session.compacting': sessionCompactingHook,
    } as Hooks,
  };
};

export default OspbWorkflowPlugin;
