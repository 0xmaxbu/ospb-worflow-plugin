import { getWorkflowState } from '../workflow-state';
const PROHIBITED_PATTERNS = [
    /git\s+push\s+--force/i,
    /rm\s+-rf\s+\//i,
    /:\s*!/,
    /\$\(\s*rm/i,
];
function isCommandProhibited(command) {
    return PROHIBITED_PATTERNS.some((pattern) => pattern.test(command));
}
function isBdClaimCommand(command) {
    return /bd\s+(claim|update\s+--claim)/i.test(command);
}
export async function executeBeforeHook(input, output) {
    if (input.tool !== 'bash') {
        return;
    }
    const command = output.args?.command;
    if (!command || typeof command !== 'string') {
        return;
    }
    if (isCommandProhibited(command)) {
        throw new Error(`🚫 Prohibited command detected: ${command}\nThis command is blocked by workflow guard.`);
    }
    if (isBdClaimCommand(command)) {
        const state = getWorkflowState();
        if (!state.canClaimNewTask()) {
            throw new Error(`🚫 Workflow Violation: Cannot claim task until current task is verified.\nCurrent: ${state.currentTask}\nStatus: ${state.isVerified ? 'Verified' : 'Not Verified'}\nRequired: Complete verification first.`);
        }
    }
}
