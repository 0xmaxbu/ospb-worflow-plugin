import { tool } from '@opencode-ai/plugin/tool';
import { z } from 'zod';
import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, access, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { verifyCode } from './verify-code';
import { getWorkflowState } from './workflow-state';

const execAsync = promisify(childProcessExec);

export const initWorkflowTool = tool({
  description: 'Initialize the OSPB workflow environment. Run bd init, openspec init, and configure language.',
  args: {},
  async execute(_args, context) {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      await execAsync('bd init --quiet', { cwd: context.directory });
      results.push('✓ bd init succeeded');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already')) {
        results.push('✓ bd already initialized');
      } else {
        errors.push(`bd init failed: ${message}`);
      }
    }

    try {
      await execAsync('openspec init --tools opencode', { cwd: context.directory });
      results.push('✓ openspec init succeeded');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already')) {
        results.push('✓ openspec already initialized');
      } else {
        errors.push(`openspec init failed: ${message}`);
      }
    }

    try {
      const configDir = join(context.directory, 'openspec');
      const configPath = join(configDir, 'config.yaml');

      try {
        await access(configDir);
      } catch {
        await mkdir(configDir, { recursive: true });
      }

      let configContent = '';
      try {
        configContent = await readFile(configPath, 'utf-8');
      } catch {
        // File doesn't exist
      }

      if (configContent.includes('lang:')) {
        configContent = configContent.replace(/lang:\s*\w+/g, 'lang: zh');
      } else {
        const newEntry = 'lang: zh\n';
        configContent = configContent.trim() ? newEntry + configContent : newEntry;
      }

      await writeFile(configPath, configContent, 'utf-8');
      results.push('✓ openspec/config.yaml configured with lang: zh');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`config.yaml failed: ${message}`);
    }

    if (errors.length > 0) {
      return `Initialization completed with errors:\n${errors.join('\n')}\n\nPartial results:\n${results.join('\n')}`;
    }

    return `Workflow initialization complete:\n${results.join('\n')}`;
  },
});

export const verifyCodeTool = tool({
  description: 'Verify implementation against Spec requirements. Parse Spec-ref from task, validate output exists.',
  args: {
    taskId: z.string().describe('Task ID to verify'),
  },
  async execute(args, context) {
    const result = await verifyCode(args.taskId, context.directory);

    if (result.success) {
      const state = getWorkflowState();
      state.markVerified();
    }

    if (result.success) {
      return `✓ Verification passed for ${result.taskId}\nSpec-ref: ${result.specRef}\n${result.message}`;
    }

    return `✗ Verification failed for ${result.taskId}\nSpec-ref: ${result.specRef}\n${result.message}\nErrors: ${result.errors?.join(', ') || 'None'}`;
  },
});

export const workflowExploreTool = tool({
  description: 'Enter explore mode - investigate requirements, clarify scope, maintain draft notes.',
  args: {
    requirement: z.string().describe('The requirement or idea to explore'),
    draftName: z.string().optional().describe('Optional name for the draft file (English, hyphenated)'),
  },
  async execute(args, context) {
    const draftDir = join(context.directory, 'workflow', 'drafts');
    const draftName = args.draftName || `exploration-${Date.now()}`;
    const draftPath = join(draftDir, `${draftName}.md`);

    try {
      await mkdir(draftDir, { recursive: true });

      // Create initial draft structure
      const initialContent = `# Exploration: ${args.requirement}

## Initial Thoughts

- 

## Questions

-

## Approach

-

## Notes

-
`;

      await writeFile(draftPath, initialContent, 'utf-8');

      // Try to invoke explore agent via session.prompt() if client is available
      let agentResponse = '';
      const client = (context as { client?: { session?: { prompt?: (params: unknown) => Promise<unknown> } } }).client;
      
      if (client?.session?.prompt) {
        try {
          const promptResult = await client.session.prompt({
            agent: 'explore',
            prompt: `Explore the requirement: ${args.requirement}

Draft file: ${draftPath}

Explore this requirement thoroughly:
1. Ask clarifying questions (what, why, expected results)
2. Investigate the codebase for relevant patterns
3. Identify implicit requirements and constraints
4. Document key technical decisions

Use the openspec-explore skill to guide your exploration process.`,
          });
          
          if (promptResult && typeof promptResult === 'object' && 'message' in promptResult) {
            const resultObj = promptResult as { message: { content?: string } };
            agentResponse = resultObj.message?.content || '';
          }
        } catch {
          // Agent invocation failed, continue without agent response
        }
      }

      // Update draft with agent response if available
      if (agentResponse) {
        const updatedContent = `# Exploration: ${args.requirement}

## Initial Thoughts

- ${agentResponse.slice(0, 500)}

## Questions

-

## Approach

-

## Notes

${agentResponse}
`;
        await writeFile(draftPath, updatedContent, 'utf-8');
      }

      // Ask user to confirm draft direction
      const askFn = (context as { ask?: (q: unknown) => Promise<unknown> }).ask;
      if (askFn) {
        try {
          await askFn({
            question: `Exploration draft created at ${draftPath}. Do you want to continue exploring, or proceed to proposal?`,
            options: [
              { label: 'Continue exploring', description: 'Investigate more with the explore agent' },
              { label: 'Proceed to proposal', description: 'Convert draft to OpenSpec proposal' },
            ],
          });
        } catch {
          // User declined to answer, continue
        }
      }

      return `✓ Exploration draft created: ${draftPath}

${agentResponse ? 'Exploration agent has analyzed the requirement.' : 'Draft created - use the explore agent to investigate further.'}

Next steps:
1. Review the draft at: ${draftPath}
2. Use /workflow-propose when ready to create OpenSpec documents`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to create draft: ${message}`;
    }
  },
});

export const workflowProposeTool = tool({
  description: 'Convert exploration draft to OpenSpec specification documents.',
  args: {
    draftName: z.string().optional().describe('Name of the draft to convert (without .md extension)'),
  },
  async execute(args, context) {
    const draftsDir = join(context.directory, 'workflow', 'drafts');
    let draftName = args.draftName;

    // If no draftName provided, list drafts and let user select
    if (!draftName) {
      try {
        const draftFiles = await readdir(draftsDir);
        const markdownDrafts = draftFiles.filter((f) => f.endsWith('.md'));

        if (markdownDrafts.length === 0) {
          return '✗ No drafts found. Use /workflow-explore first to create a draft.';
        }

        if (markdownDrafts.length === 1) {
          draftName = markdownDrafts[0].replace('.md', '');
        } else {
          // Use question tool to let user select
          const ctx = context as unknown as { ask?: (q: unknown) => Promise<unknown> };
          const askFn = ctx.ask;
          if (askFn) {
            const answer = await askFn({
              question: 'Which draft do you want to convert to OpenSpec proposal?',
              options: markdownDrafts.map((d: string) => ({
                label: d.replace('.md', ''),
                description: `Convert ${d} to OpenSpec documents`,
              })),
            });
            draftName = (answer as { choice?: string })?.choice;
          }

          if (!draftName) {
            return '✗ No draft selected. Please specify a draft name.';
          }
        }
      } catch {
        return '✗ Failed to list drafts. Make sure you have created a draft with /workflow-explore first.';
      }
    }

    const draftPath = join(draftsDir, `${draftName}.md`);

    try {
      // Read draft content
      const draftContent = await readFile(draftPath, 'utf-8');

      // Try to invoke propose agent via session.prompt() if client is available
      let agentResponse = '';
      const client = (context as { client?: { session?: { prompt?: (params: unknown) => Promise<unknown> } } }).client;

      if (client?.session?.prompt) {
        try {
          const promptResult = await client.session.prompt({
            agent: 'propose',
            prompt: `Convert this exploration draft to OpenSpec documents.

Draft content:
${draftContent}

Follow the openspec-propose skill to:
1. Understand what the user wants to build
2. Create the change with openspec new change "<name>"
3. Generate all required artifacts (proposal.md, design.md, tasks.md)
4. Discuss details with user until satisfied

Use the openspec-propose skill to guide the conversation.`,
          });

          if (promptResult && typeof promptResult === 'object' && 'message' in promptResult) {
            const resultObj = promptResult as { message: { content?: string } };
            agentResponse = resultObj.message?.content || '';
          }
        } catch {
          // Agent invocation failed, continue with direct openspec command
        }
      }

      // Run openspec propose to generate artifacts
      const { stdout } = await execAsync(`openspec propose "${draftName}"`, {
        cwd: context.directory,
      });

      return `✓ OpenSpec proposal created:\n${stdout}

${agentResponse ? `Proposal agent feedback:\n${agentResponse}` : ''}
Draft: ${draftPath}
Change: openspec/changes/${draftName}/`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to create proposal: ${message}`;
    }
  },
});

export const workflowPlanTool = tool({
  description: 'Convert OpenSpec spec into detailed implementation plan.',
  args: {
    specName: z.string().optional().describe('Name of the spec change (without .md extension)'),
  },
  async execute(args, context) {
    const changesDir = join(context.directory, 'openspec', 'changes');
    let specName = args.specName;

    // If no specName provided, list changes and let user select
    if (!specName) {
      try {
        const changeDirs = await readdir(changesDir);

        if (changeDirs.length === 0) {
          return '✗ No OpenSpec changes found. Use /workflow-propose first to create a change.';
        }

        if (changeDirs.length === 1) {
          specName = changeDirs[0];
        } else {
          // Use question tool to let user select
          const ctx = context as unknown as { ask?: (q: unknown) => Promise<unknown> };
          const askFn = ctx.ask;
          if (askFn) {
            const answer = await askFn({
              question: 'Which change do you want to create a plan for?',
              options: changeDirs.map((d: string) => ({
                label: d,
                description: `Create implementation plan for ${d}`,
              })),
            });
            specName = (answer as { choice?: string })?.choice;
          }

          if (!specName) {
            return '✗ No change selected. Please specify a change name.';
          }
        }
      } catch {
        return '✗ Failed to list changes. Make sure you have created a change with /workflow-propose first.';
      }
    }

    const changeDir = join(changesDir, specName!);

    try {
      // Read spec documents for context
      const specsDir = join(changeDir, 'specs');
      let specContent = '';

      try {
        const specFiles = await readdir(specsDir);
        for (const specFile of specFiles) {
          if (specFile.endsWith('.md')) {
            const content = await readFile(join(specsDir, specFile), 'utf-8');
            specContent += `\n## ${specFile}\n${content}\n`;
          }
        }
      } catch {
        // No specs directory, continue without spec content
      }

      // Also read tasks.md if exists
      const tasksPath = join(changeDir, 'tasks.md');
      let tasksContent = '';
      try {
        tasksContent = await readFile(tasksPath, 'utf-8');
      } catch {
        // No tasks.md, continue
      }

      // Try to invoke planner agent via session.prompt()
      let agentResponse = '';
      const client = (context as unknown as { client?: { session?: { prompt?: (params: unknown) => Promise<unknown> } } }).client;

      if (client?.session?.prompt) {
        try {
          const promptResult = await client.session.prompt({
            agent: 'planner',
            prompt: `Create a detailed implementation plan from this OpenSpec change.

Change: ${specName}

${tasksContent ? `Tasks:\n${tasksContent}\n` : ''}
${specContent ? `Specs:\n${specContent}\n` : ''}

Follow the openspec-plan skill to:
1. Read all spec documents in ${specsDir}
2. Generate a detailed plan with DAG structure
3. Each step should be independently verifiable
4. Mark steps with Spec-task-ref for small tasks, Spec-ref for phases
5. Write plan to .workflow/plans/${specName}.md

Use the openspec-plan or planner agent to generate the plan.`,
          });

          if (promptResult && typeof promptResult === 'object' && 'message' in promptResult) {
            const resultObj = promptResult as { message: { content?: string } };
            agentResponse = resultObj.message?.content || '';
          }
        } catch {
          // Agent invocation failed, continue with openspec command
        }
      }

      // Run openspec plan to generate the plan file
      const { stdout } = await execAsync(`openspec plan "${specName}"`, {
        cwd: context.directory,
      });

      // After plan is created, trigger Plan Review
      let reviewMessage = '';
      const planPath = join(context.directory, '.workflow', 'plans', `${specName}.md`);
      try {
        await access(planPath);
        reviewMessage = `\n\n📋 Plan Review triggered. Use /plan-review to review the plan before creating tasks.`;
      } catch {
        // Plan file not created
      }

      return `✓ Implementation plan created:\n${stdout}

${agentResponse ? `Planner feedback:\n${agentResponse}` : ''}
${reviewMessage}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to create plan: ${message}`;
    }
  },
});

export const workflowTaskTool = tool({
  description: 'Create bd tasks from implementation plan with proper dependencies.',
  args: {
    planName: z.string().optional().describe('Name of the plan (without .md extension)'),
  },
  async execute(args, context) {
    const planArg = args.planName ? `"${args.planName}"` : '';

    try {
      const { stdout } = await execAsync(`openspec task ${planArg}`, {
        cwd: context.directory,
      });

      return `✓ Tasks created:\n${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to create tasks: ${message}`;
    }
  },
});

export const workflowStartTool = tool({
  description: 'Start executing workflow tasks from bd ready queue.',
  args: {},
  async execute(_args, context) {
    try {
      const { stdout: readyOutput } = await execAsync('bd ready --json', {
        cwd: context.directory,
      });

      interface BdTask {
        id: string;
        title: string;
      }

      const tasks: BdTask[] = JSON.parse(readyOutput);

      if (!tasks || tasks.length === 0) {
        return 'No ready tasks in the queue.';
      }

      const taskList = tasks.map((t) => `- ${t.id}: ${t.title}`).join('\n');

      return `Ready tasks:\n${taskList}\n\nUse 'bd update <task-id> --claim' to claim a task, then implement it.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to get ready tasks: ${message}`;
    }
  },
});

export const workflowArchiveTool = tool({
  description: 'Archive a completed workflow change.',
  args: {
    changeName: z.string().describe('Name of the change to archive (without .md extension)'),
  },
  async execute(args, context) {
    try {
      const { stdout } = await execAsync(`openspec archive "${args.changeName}"`, {
        cwd: context.directory,
      });

      return `✓ Change archived:\n${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to archive: ${message}`;
    }
  },
});

export const planReviewTool = tool({
  description: 'Review implementation plan for quality and completeness.',
  args: {
    planName: z.string().describe('Name of the plan to review (without .md extension)'),
  },
  async execute(args, context) {
    const planPath = join(context.directory, '.workflow', 'plans', `${args.planName}.md`);

    try {
      const planContent = await readFile(planPath, 'utf-8');

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (!planContent.includes('Spec-ref:')) {
        issues.push('Plan lacks Spec-ref references');
      }

      if (!planContent.includes('##')) {
        issues.push('Plan lacks step headers');
      }

      if (planContent.includes('Impl:') && !planContent.includes('Test:')) {
        suggestions.push('Consider adding Test: tasks for TDD workflow');
      }

      if (!planContent.includes('Valid:')) {
        suggestions.push('Consider adding Valid: tasks for verification');
      }

      let response = `Plan Review: ${args.planName}\n`;
      response += `${'='.repeat(40)}\n\n`;

      if (issues.length > 0) {
        response += `Issues:\n${issues.map((i) => `  • ${i}`).join('\n')}\n\n`;
      }

      if (suggestions.length > 0) {
        response += `Suggestions:\n${suggestions.map((s) => `  • ${s}`).join('\n')}\n\n`;
      }

      if (issues.length === 0 && suggestions.length === 0) {
        response += '✓ Plan looks good!\n';
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `✗ Failed to review plan: ${message}`;
    }
  },
});

export const workflowTools = {
  'init-workflow': initWorkflowTool,
  'verify-code': verifyCodeTool,
  'workflow-explore': workflowExploreTool,
  'workflow-propose': workflowProposeTool,
  'workflow-plan': workflowPlanTool,
  'workflow-task': workflowTaskTool,
  'workflow-start': workflowStartTool,
  'workflow-archive': workflowArchiveTool,
  'plan-review': planReviewTool,
} as const;

export type WorkflowToolName = keyof typeof workflowTools;
