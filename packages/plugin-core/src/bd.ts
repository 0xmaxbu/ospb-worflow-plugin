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

export async function createValidTask(
  description: string,
  specRef: string,
  priority: number = 2
): Promise<TaskCreationResult> {
  try {
    const title = `Valid: ${description}`;
    const fullDescription = `Spec-ref: ${specRef}`;

    const command = `bd create "${title}" --description "${fullDescription}" -t task -p ${priority} --json`;

    const { stdout } = await execAsync(command);

    const output = stdout.trim();
    let taskId: string;

    try {
      const parsed = JSON.parse(output);
      taskId = parsed[0]?.id || parsed.id || '';
    } catch {
      const idMatch = output.match(/ospb[_-]workflow[_-]plugin[_-](\w+)/i);
      taskId = idMatch ? `ospb-worflow-plugin-${idMatch[1]}` : output;
    }

    return {
      taskId,
      title,
      success: true,
    };
  } catch (error) {
    return {
      taskId: '',
      title: `Valid: ${description}`,
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
    await execAsync(command);

    return {
      blocked: blockedTaskId,
      blocking: blockingTaskId,
      success: true,
    };
  } catch (error) {
    return {
      blocked: blockedTaskId,
      blocking: blockingTaskId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
