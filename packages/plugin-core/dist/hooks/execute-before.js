import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';
import { getWorkflowState } from '../workflow-state';
const execAsync = promisify(childProcessExec);
const PROHIBITED_PATTERNS = [
    /git\s+push\s+(-f|--force)/i,
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
function extractTaskIdFromClaim(command) {
    const match = command.match(/bd\s+(?:update\s+--claim|claim)\s+(\S+)/i);
    return match ? match[1] : null;
}
async function isValidTask(taskId) {
    try {
        const { stdout } = await execAsync(`bd show ${taskId} --json`);
        const task = JSON.parse(stdout);
        return task.title?.startsWith('Valid:') ?? false;
    }
    catch {
        return false;
    }
}
async function getWorkflowVerificationStatus(taskId) {
    const state = getWorkflowState();
    return state.currentTask === taskId && state.isVerified;
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
        const taskId = extractTaskIdFromClaim(command);
        if (taskId) {
            const validTask = await isValidTask(taskId);
            if (validTask) {
                const alreadyVerified = await getWorkflowVerificationStatus(taskId);
                if (!alreadyVerified) {
                    throw new Error(`🔍 Verification Required: Task "${taskId}" is a Valid: task.\n\nPlease call the verify-code tool first:\n  verify-code ${taskId}\n\nAfter verification passes, you can retry the claim.`);
                }
            }
        }
    }
}
