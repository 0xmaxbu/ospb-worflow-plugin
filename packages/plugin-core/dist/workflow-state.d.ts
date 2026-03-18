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
export declare function createWorkflowState(): WorkflowState;
export declare function getWorkflowState(): WorkflowState;
export declare function persistState(): Promise<void>;
export declare function loadState(): Promise<WorkflowState | null>;
