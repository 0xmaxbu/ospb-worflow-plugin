export function validateToolDefinition(toolName, definition) {
    const errors = [];
    const warnings = [];
    if (!definition.description) {
        errors.push({
            toolName,
            field: 'description',
            message: 'Tool must have a description',
        });
    }
    else if (definition.description.length < 10) {
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
export function validateAllTools(tools) {
    const allErrors = [];
    const allWarnings = [];
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
