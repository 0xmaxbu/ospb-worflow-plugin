export async function sessionIdleHook(_input) {
    const { getWorkflowState } = await import('../workflow-state');
    const state = getWorkflowState();
    if (!state.currentTask || state.isVerified || !state.requiresVerification) {
        return null;
    }
    return {
        role: 'user',
        content: `🔔 Workflow Reminder: You have an unverified task "${state.currentTask}".

Please verify your work before:
- Claiming a new task
- Closing the session

Use \`bd show ${state.currentTask}\` to review and verify.`,
    };
}
