export interface BdTaskMetadata {
    id: string;
    title: string;
    type: 'bug' | 'chore' | 'epic' | 'feature' | 'task';
    priority: number;
    status: string;
    description?: string;
}
export interface BdDependency {
    blocked: string;
    blocking: string;
    type: 'blocks';
}
export interface BdMetadataValidationResult {
    valid: boolean;
    errors: BdMetadataError[];
    warnings: BdMetadataWarning[];
}
export interface BdMetadataError {
    field: string;
    message: string;
}
export interface BdMetadataWarning {
    field: string;
    message: string;
}
export declare function validateTaskId(taskId: string): BdMetadataValidationResult;
export declare function validateTaskType(type: string): BdMetadataValidationResult;
export declare function validatePriority(priority: number): BdMetadataValidationResult;
export declare function validateTaskTitle(title: string): BdMetadataValidationResult;
export declare function validateTaskMetadata(metadata: Partial<BdTaskMetadata>): BdMetadataValidationResult;
export declare function validateDependency(dependency: BdDependency): BdMetadataValidationResult;
export declare function validateDependencyList(dependencies: BdDependency[]): BdMetadataValidationResult;
