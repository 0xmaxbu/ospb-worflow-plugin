export interface WorkflowState {
  currentTask: string | null;
  isVerified: boolean;
  requiresVerification: boolean;
  setCurrentTask(taskId: string): void;
  markVerified(): void;
  reset(): void;
  canClaimNewTask(): boolean;
  setRequiresVerification(required: boolean): void;
}

interface PersistedWorkflowState {
  currentTask: string | null;
  isVerified: boolean;
  requiresVerification: boolean;
}

let workflowState: WorkflowState | null = null;
let persistedWorkflowState: PersistedWorkflowState | null = null;

export function createWorkflowState(): WorkflowState {
  let currentTask: string | null = null;
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

    setCurrentTask(taskId: string) {
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

    canClaimNewTask(): boolean {
      if (!requiresVerification) {
        return true;
      }

      if (!currentTask) {
        return true;
      }

      return isVerified;
    },

    setRequiresVerification(required: boolean) {
      requiresVerification = required;
    },
  };
}

export function getWorkflowState(): WorkflowState {
  if (!workflowState) {
    workflowState = createWorkflowState();
  }

  return workflowState;
}

export async function persistState(): Promise<void> {
  const state = getWorkflowState();

  persistedWorkflowState = {
    currentTask: state.currentTask,
    isVerified: state.isVerified,
    requiresVerification: state.requiresVerification,
  };
}

export async function loadState(): Promise<WorkflowState | null> {
  if (!persistedWorkflowState) {
    return null;
  }

  const state = getWorkflowState();

  if (persistedWorkflowState.currentTask) {
    state.setCurrentTask(persistedWorkflowState.currentTask);
    if (persistedWorkflowState.isVerified) {
      state.markVerified();
    }
  } else {
    state.reset();
  }

  state.setRequiresVerification(persistedWorkflowState.requiresVerification);

  return state;
}
