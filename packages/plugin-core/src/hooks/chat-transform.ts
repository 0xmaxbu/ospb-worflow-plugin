import { getWorkflowState } from '../workflow-state';

type ChatTransformMessage = {
  role: string;
  content: string;
};

type ChatTransformInput = {
  messages: ChatTransformMessage[];
  params: Record<string, unknown>;
};

export async function chatTransformHook(
  input: ChatTransformInput,
): Promise<{
  messages: ChatTransformMessage[];
  params: Record<string, unknown>;
}> {
  const state = getWorkflowState();

  if (!state.currentTask) {
    return { messages: input.messages, params: input.params };
  }

  const contextMessage = {
    role: 'system' as const,
    content: `[Workflow Context]
Current Task: ${state.currentTask}
Verified: ${state.isVerified}
Requires Verification: ${state.requiresVerification}

Please ensure all changes are verified before marking tasks complete.`,
  };

  return {
    messages: [contextMessage, ...input.messages],
    params: input.params,
  };
}
