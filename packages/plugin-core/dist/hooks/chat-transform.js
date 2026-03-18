import { getWorkflowState } from '../workflow-state';
export async function chatTransformHook(input) {
    const state = getWorkflowState();
    if (!state.currentTask) {
        return { messages: input.messages, params: input.params };
    }
    const contextMessage = {
        role: 'system',
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
