export interface ToolDefinition {
    description?: string;
    args?: {
        [key: string]: {
            describe?: string;
            type?: unknown;
            optional?: boolean;
            default?: unknown;
        };
    };
    execute?: (args: unknown, context: unknown) => Promise<unknown>;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    toolName: string;
    field: string;
    message: string;
}
export interface ValidationWarning {
    toolName: string;
    field: string;
    message: string;
}
export declare function validateToolDefinition(toolName: string, definition: ToolDefinition): ValidationResult;
export declare function validateAllTools(tools: Record<string, ToolDefinition>): ValidationResult;
