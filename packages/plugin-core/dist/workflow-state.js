let workflowState = null;
let persistedWorkflowState = null;
export function createWorkflowState() {
    let currentTask = null;
    let isVerified = false;
    let requiresVerification = true;
    return {
        get currentTask() {
            return currentTask;
        },
        get isVerified() {
            return isVerified;
        },
        get requiresVerification() {
            return requiresVerification;
        },
        setCurrentTask(taskId) {
            currentTask = taskId;
            isVerified = false;
        },
        markVerified() {
            isVerified = true;
        },
        reset() {
            currentTask = null;
            isVerified = false;
        },
        canClaimNewTask() {
            if (!requiresVerification) {
                return true;
            }
            if (!currentTask) {
                return true;
            }
            return isVerified;
        },
        setRequiresVerification(required) {
            requiresVerification = required;
        },
    };
}
export function getWorkflowState() {
    if (!workflowState) {
        workflowState = createWorkflowState();
    }
    return workflowState;
}
export async function persistState() {
    const state = getWorkflowState();
    persistedWorkflowState = {
        currentTask: state.currentTask,
        isVerified: state.isVerified,
        requiresVerification: state.requiresVerification,
    };
}
export async function loadState() {
    if (!persistedWorkflowState) {
        return null;
    }
    const state = getWorkflowState();
    if (persistedWorkflowState.currentTask) {
        state.setCurrentTask(persistedWorkflowState.currentTask);
        if (persistedWorkflowState.isVerified) {
            state.markVerified();
        }
    }
    else {
        state.reset();
    }
    state.setRequiresVerification(persistedWorkflowState.requiresVerification);
    return state;
}
