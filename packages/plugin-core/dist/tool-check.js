import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(childProcessExec);
function getExec() {
    const globalExec = globalThis.exec;
    if (typeof globalExec === 'function') {
        return globalExec;
    }
    return async (command) => {
        const result = await execAsync(command);
        return {
            stdout: result.stdout,
            stderr: result.stderr,
        };
    };
}
async function isCommandAvailable(command) {
    try {
        await getExec()(`${command} --version`);
        return true;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return false;
        }
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ENOENT') {
            return false;
        }
        return true;
    }
}
export async function isOpenSpecAvailable() {
    return isCommandAvailable('openspec');
}
export async function isBeadsAvailable() {
    return isCommandAvailable('bd');
}
export async function checkAllTools() {
    const [openspec, beads] = await Promise.all([
        isOpenSpecAvailable(),
        isBeadsAvailable(),
    ]);
    return { openspec, beads };
}
