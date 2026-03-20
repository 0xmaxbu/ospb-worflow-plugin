export interface SpecRef {
    type: 'task' | 'phase';
    ref: string;
    taskTitle: string;
}
export interface TaskCreationResult {
    taskId: string;
    title: string;
    success: boolean;
    error?: string;
}
export interface DependencyResult {
    blocked: string;
    blocking: string;
    success: boolean;
    error?: string;
}
export declare function parseSpecRefs(planContent: string): SpecRef[];
export declare function createValidTask(description: string, specRef: string, priority?: number): Promise<TaskCreationResult>;
export declare function createImplTask(description: string, specRef: string, priority?: number): Promise<TaskCreationResult>;
export declare function createTestTask(description: string, specRef: string, priority?: number): Promise<TaskCreationResult>;
export declare function addTaskDependency(blockedTaskId: string, blockingTaskId: string): Promise<DependencyResult>;
export interface TddTaskPair {
    implTask: TaskCreationResult;
    testTask: TaskCreationResult;
    dependency: DependencyResult;
}
export declare function createTddTaskPair(description: string, specRef: string, priority?: number): Promise<TddTaskPair | null>;
export declare function findOutputTasksForSpecRef(specRef: string): Promise<string[]>;
export declare function generateValidTasksFromPlan(planContent: string, outputTaskIds: Map<string, string>): Promise<{
    validTasks: TaskCreationResult[];
    dependencies: DependencyResult[];
}>;
