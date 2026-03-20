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

const TASK_ID_REGEX = /^ospb-worflow-plugin-[a-z0-9]+$/i;
const VALID_TYPES: BdTaskMetadata['type'][] = ['bug', 'chore', 'epic', 'feature', 'task'];
const VALID_PRIORITIES = [0, 1, 2, 3, 4];

export function validateTaskId(taskId: string): BdMetadataValidationResult {
  const errors: BdMetadataError[] = [];
  const warnings: BdMetadataWarning[] = [];

  if (!taskId) {
    errors.push({ field: 'id', message: 'Task ID is required' });
  } else if (!TASK_ID_REGEX.test(taskId)) {
    errors.push({
      field: 'id',
      message: 'Task ID must match format: ospb-worflow-plugin-<suffix>',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTaskType(type: string): BdMetadataValidationResult {
  const errors: BdMetadataError[] = [];
  const warnings: BdMetadataWarning[] = [];

  if (!type) {
    errors.push({ field: 'type', message: 'Task type is required' });
  } else if (!VALID_TYPES.includes(type as BdTaskMetadata['type'])) {
    errors.push({
      field: 'type',
      message: `Task type must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validatePriority(priority: number): BdMetadataValidationResult {
  const errors: BdMetadataError[] = [];
  const warnings: BdMetadataWarning[] = [];

  if (priority === undefined || priority === null) {
    errors.push({ field: 'priority', message: 'Priority is required' });
  } else if (!Number.isInteger(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be an integer' });
  } else if (!VALID_PRIORITIES.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTaskTitle(title: string): BdMetadataValidationResult {
  const errors: BdMetadataError[] = [];
  const warnings: BdMetadataWarning[] = [];

  if (!title) {
    errors.push({ field: 'title', message: 'Task title is required' });
  } else if (title.length < 3) {
    warnings.push({ field: 'title', message: 'Task title seems too short' });
  } else if (title.length > 200) {
    warnings.push({ field: 'title', message: 'Task title seems too long' });
  }

  const validPrefixes = ['Impl:', 'Test:', 'Valid:', 'Setup -', 'Fix:'];
  const hasValidPrefix = validPrefixes.some((prefix) => title.startsWith(prefix));
  if (title && !hasValidPrefix) {
    warnings.push({
      field: 'title',
      message: `Task title should have a prefix like: ${validPrefixes.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTaskMetadata(metadata: Partial<BdTaskMetadata>): BdMetadataValidationResult {
  const allErrors: BdMetadataError[] = [];
  const allWarnings: BdMetadataWarning[] = [];

  if (metadata.id !== undefined) {
    const result = validateTaskId(metadata.id);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (metadata.type !== undefined) {
    const result = validateTaskType(metadata.type);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (metadata.priority !== undefined) {
    const result = validatePriority(metadata.priority);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (metadata.title !== undefined) {
    const result = validateTaskTitle(metadata.title);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

export function validateDependency(dependency: BdDependency): BdMetadataValidationResult {
  const errors: BdMetadataError[] = [];
  const warnings: BdMetadataWarning[] = [];

  if (!dependency.blocked) {
    errors.push({ field: 'blocked', message: 'Blocked task ID is required' });
  } else if (!TASK_ID_REGEX.test(dependency.blocked)) {
    errors.push({
      field: 'blocked',
      message: 'Blocked task ID must match format: ospb-worflow-plugin-<suffix>',
    });
  }

  if (!dependency.blocking) {
    errors.push({ field: 'blocking', message: 'Blocking task ID is required' });
  } else if (!TASK_ID_REGEX.test(dependency.blocking)) {
    errors.push({
      field: 'blocking',
      message: 'Blocking task ID must match format: ospb-worflow-plugin-<suffix>',
    });
  }

  if (dependency.blocked === dependency.blocking) {
    errors.push({
      field: 'blocked/blocking',
      message: 'A task cannot block itself',
    });
  }

  if (dependency.type !== 'blocks') {
    errors.push({
      field: 'type',
      message: 'Dependency type must be "blocks"',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateDependencyList(dependencies: BdDependency[]): BdMetadataValidationResult {
  const allErrors: BdMetadataError[] = [];
  const allWarnings: BdMetadataWarning[] = [];

  for (let i = 0; i < dependencies.length; i++) {
    const result = validateDependency(dependencies[i]);
    allErrors.push(...result.errors.map((e) => ({ ...e, field: `${e.field}[${i}]` })));
    allWarnings.push(...result.warnings.map((w) => ({ ...w, field: `${w.field}[${i}]` })));
  }

  const blockingMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const existing = blockingMap.get(dep.blocked) || [];
    existing.push(dep.blocking);
    blockingMap.set(dep.blocked, existing);
  }

  for (const [blocked, blockings] of blockingMap) {
    const duplicates = blockings.filter((b, i) => blockings.indexOf(b) !== i);
    if (duplicates.length > 0) {
      allErrors.push({
        field: 'dependencies',
        message: `Duplicate blocking relationship: ${blocked} -> ${duplicates[0]}`,
      });
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
