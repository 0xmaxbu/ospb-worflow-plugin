import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(childProcessExec);

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

export function parseSpecRefs(planContent: string): SpecRef[] {
  const refs: SpecRef[] = [];

  const taskRefRegex = /Spec-task-ref:\s*([^\s]+)/gi;
  const phaseRefRegex = /Spec-ref:\s*([^\s#]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = taskRefRegex.exec(planContent)) !== null) {
    refs.push({
      type: 'task',
      ref: match[1],
      taskTitle: extractTaskTitle(planContent, match.index),
    });
  }

  while ((match = phaseRefRegex.exec(planContent)) !== null) {
    const existing = refs.find((r) => r.ref === match![1] && r.type === 'phase');
    if (!existing) {
      refs.push({
        type: 'phase',
        ref: match[1],
        taskTitle: extractTaskTitle(planContent, match.index),
      });
    }
  }

  return refs;
}

function extractTaskTitle(content: string, matchIndex: number): string {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
  const lines = beforeMatch.split('\n');

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.match(/^##\s+/)) {
      const cleaned = line.replace(/^##\s+/, '').trim();
      const afterNumber = cleaned.replace(/^\d+\.\d+(\s*[：:]\s*)?/, '');
      if (afterNumber) {
        return afterNumber.trim();
      }
      return cleaned;
    }
    if (line.match(/^\d+\.\d+/)) {
      return line.replace(/^\d+\.\d+(\s*[：:]\s*)?/, '').trim();
    }
    if (line.match(/^[-*]\s+/)) {
      return line.replace(/^[-*]\s+/, '').trim();
    }
  }

  return 'Unnamed step';
}

async function execBdCommand(command: string): Promise<string> {
  const { stdout } = await execAsync(command);
  return stdout.trim();
}

function parseTaskIdFromOutput(output: string): string {
  try {
    const parsed = JSON.parse(output);
    return parsed[0]?.id || parsed.id || '';
  } catch {
    const idMatch = output.match(/ospb[_-]workflow[_-]plugin[_-](\w+)/i);
    return idMatch ? `ospb-worflow-plugin-${idMatch[1]}` : output;
  }
}

export async function createValidTask(
  description: string,
  specRef: string,
  priority: number = 2
): Promise<TaskCreationResult> {
  try {
    const title = `Valid: ${description}`;
    const fullDescription = `Spec-ref: ${specRef}`;
    const command = `bd create "${title}" --description "${fullDescription}" -t task -p ${priority} --json`;
    const output = await execBdCommand(command);
    const taskId = parseTaskIdFromOutput(output);

    return { taskId, title, success: true };
  } catch (error) {
    return {
      taskId: '',
      title: `Valid: ${description}`,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createImplTask(
  description: string,
  specRef: string,
  priority: number = 2
): Promise<TaskCreationResult> {
  try {
    const title = `Impl: ${description}`;
    const fullDescription = `Spec-ref: ${specRef}`;
    const command = `bd create "${title}" --description "${fullDescription}" -t feature -p ${priority} --json`;
    const output = await execBdCommand(command);
    const taskId = parseTaskIdFromOutput(output);

    return { taskId, title, success: true };
  } catch (error) {
    return {
      taskId: '',
      title: `Impl: ${description}`,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createTestTask(
  description: string,
  specRef: string,
  priority: number = 2
): Promise<TaskCreationResult> {
  try {
    const title = `Test: ${description}`;
    const fullDescription = `Spec-ref: ${specRef}`;
    const command = `bd create "${title}" --description "${fullDescription}" -t task -p ${priority} --json`;
    const output = await execBdCommand(command);
    const taskId = parseTaskIdFromOutput(output);

    return { taskId, title, success: true };
  } catch (error) {
    return {
      taskId: '',
      title: `Test: ${description}`,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function addTaskDependency(
  blockedTaskId: string,
  blockingTaskId: string
): Promise<DependencyResult> {
  try {
    const command = `bd dep add ${blockedTaskId} ${blockingTaskId} --type blocks --json`;
    await execBdCommand(command);

    return { blocked: blockedTaskId, blocking: blockingTaskId, success: true };
  } catch (error) {
    return {
      blocked: blockedTaskId,
      blocking: blockingTaskId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface TddTaskPair {
  implTask: TaskCreationResult;
  testTask: TaskCreationResult;
  dependency: DependencyResult;
}

export async function createTddTaskPair(
  description: string,
  specRef: string,
  priority: number = 2
): Promise<TddTaskPair | null> {
  const implTask = await createImplTask(description, specRef, priority);
  if (!implTask.success || !implTask.taskId) {
    return null;
  }

  const testTask = await createTestTask(description, specRef, priority);
  if (!testTask.success || !testTask.taskId) {
    return null;
  }

  const dependency = await addTaskDependency(implTask.taskId, testTask.taskId);

  return { implTask, testTask, dependency };
}

export async function findOutputTasksForSpecRef(specRef: string): Promise<string[]> {
  return [];
}

export async function generateValidTasksFromPlan(
  planContent: string,
  outputTaskIds: Map<string, string>
): Promise<{
  validTasks: TaskCreationResult[];
  dependencies: DependencyResult[];
}> {
  const specRefs = parseSpecRefs(planContent);

  const validTasks: TaskCreationResult[] = [];
  const dependencies: DependencyResult[] = [];

  for (const specRef of specRefs) {
    const title = specRef.type === 'task'
      ? `验证任务 ${specRef.ref}`
      : `验证阶段 ${specRef.ref}`;

    const result = await createValidTask(title, specRef.ref);
    validTasks.push(result);

    if (result.success) {
      const outputTaskId = outputTaskIds.get(specRef.ref);
      if (outputTaskId) {
        const depResult = await addTaskDependency(result.taskId, outputTaskId);
        dependencies.push(depResult);
      }
    }
  }

  return { validTasks, dependencies };
}
