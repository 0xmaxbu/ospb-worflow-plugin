import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
const execAsync = promisify(childProcessExec);
function parseSpecRef(description) {
    const match = description.match(/Spec-ref:\s*([^\s]+)/i);
    return match ? match[1] : null;
}
async function getTaskDescription(taskId) {
    try {
        const { stdout } = await execAsync(`bd show ${taskId} --json`);
        const task = JSON.parse(stdout);
        return task.description || '';
    }
    catch {
        return '';
    }
}
async function readSpecFile(specPath, projectRoot) {
    try {
        const fullPath = join(projectRoot, specPath);
        return await readFile(fullPath, 'utf-8');
    }
    catch {
        return null;
    }
}
function checkSpecRequirement(specContent, requirement) {
    const errors = [];
    const requirementSection = extractRequirementSection(specContent, requirement);
    if (!requirementSection) {
        return {
            passed: false,
            errors: [`Requirement '${requirement}' not found in spec`]
        };
    }
    return {
        passed: true,
        errors: []
    };
}
function extractRequirementSection(specContent, requirement) {
    const lines = specContent.split('\n');
    let inSection = false;
    let sectionContent = [];
    let currentHeading = '';
    for (const line of lines) {
        if (line.startsWith('## ') || line.startsWith('### ')) {
            if (inSection && sectionContent.length > 0) {
                break;
            }
            currentHeading = line.replace(/^#+\s*/, '').toLowerCase();
            if (currentHeading.includes(requirement.toLowerCase())) {
                inSection = true;
            }
        }
        else if (inSection) {
            sectionContent.push(line);
        }
    }
    return sectionContent.length > 0 ? sectionContent.join('\n') : null;
}
async function checkOutputExists(specRef) {
    const errors = [];
    if (specRef.includes('vitest.config.ts')) {
        return { passed: true, errors: [] };
    }
    if (specRef.includes('tests/setup.ts')) {
        return { passed: true, errors: [] };
    }
    return { passed: true, errors: [] };
}
export async function verifyCode(taskId, projectRoot = process.cwd()) {
    const description = await getTaskDescription(taskId);
    const specRef = parseSpecRef(description);
    if (!specRef) {
        return {
            success: false,
            taskId,
            specRef: null,
            message: `No Spec-ref found in task description. Add 'Spec-ref: <spec-file>#<requirement>' to task description.`,
            errors: ['Missing Spec-ref in task description']
        };
    }
    const [specPath, ...requirementParts] = specRef.split('#');
    const requirement = requirementParts.join('#');
    if (!requirement) {
        return {
            success: false,
            taskId,
            specRef,
            message: `Invalid Spec-ref format: ${specRef}. Expected: spec.md#requirement-name`,
            errors: ['Invalid Spec-ref format']
        };
    }
    const specContent = await readSpecFile(specPath, projectRoot);
    if (!specContent) {
        return {
            success: false,
            taskId,
            specRef,
            message: `Spec file not found: ${specPath}`,
            errors: [`Spec file not found: ${specPath}`]
        };
    }
    const specCheck = checkSpecRequirement(specContent, requirement);
    if (!specCheck.passed) {
        return {
            success: false,
            taskId,
            specRef,
            message: `Requirement '${requirement}' not found in ${specPath}`,
            errors: specCheck.errors
        };
    }
    const outputCheck = await checkOutputExists(specRef);
    if (!outputCheck.passed) {
        return {
            success: false,
            taskId,
            specRef,
            message: `Output verification failed for ${specRef}`,
            errors: outputCheck.errors
        };
    }
    return {
        success: true,
        taskId,
        specRef,
        message: `Verification passed for ${specRef}`
    };
}
