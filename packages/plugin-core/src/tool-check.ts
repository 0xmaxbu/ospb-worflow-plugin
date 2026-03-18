import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(childProcessExec);

type ExecResult = {
  stdout: string;
  stderr: string;
};

type ExecFunction = (command: string) => Promise<ExecResult>;

export interface ToolCheckResult {
  openspec: boolean;
  beads: boolean;
}

function getExec(): ExecFunction {
  const globalExec = globalThis.exec;

  if (typeof globalExec === 'function') {
    return globalExec as ExecFunction;
  }

  return async (command: string) => {
    const result = await execAsync(command);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  };
}

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await getExec()(`${command} --version`);
    return true;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ENOENT') {
      return false;
    }

    return true;
  }
}

export async function isOpenSpecAvailable(): Promise<boolean> {
  return isCommandAvailable('openspec');
}

export async function isBeadsAvailable(): Promise<boolean> {
  return isCommandAvailable('bd');
}

export async function checkAllTools(): Promise<ToolCheckResult> {
  const [openspec, beads] = await Promise.all([
    isOpenSpecAvailable(),
    isBeadsAvailable(),
  ]);

  return { openspec, beads };
}

declare global {
  var exec: ExecFunction | undefined;
}
