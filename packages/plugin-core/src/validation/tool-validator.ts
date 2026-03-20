import type { ZodType } from 'zod';

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

export function validateToolDefinition(
  toolName: string,
  definition: ToolDefinition,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!definition.description) {
    errors.push({
      toolName,
      field: 'description',
      message: 'Tool must have a description',
    });
  } else if (definition.description.length < 10) {
    warnings.push({
      toolName,
      field: 'description',
      message: 'Description should be at least 10 characters',
    });
  }

  if (definition.args) {
    for (const [argName, argDef] of Object.entries(definition.args)) {
      if (!argDef.describe) {
        warnings.push({
          toolName,
          field: `args.${argName}`,
          message: `Argument '${argName}' should have a description`,
        });
      }
    }
  }

  if (!definition.execute) {
    errors.push({
      toolName,
      field: 'execute',
      message: 'Tool must have an execute function',
    });
  }

  if (!/^[a-z][a-z0-9-]*$/.test(toolName)) {
    errors.push({
      toolName,
      field: 'name',
      message: 'Tool name must be in kebab-case (e.g., my-tool)',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllTools(tools: Record<string, ToolDefinition>): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  for (const [toolName, definition] of Object.entries(tools)) {
    const result = validateToolDefinition(toolName, definition);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
