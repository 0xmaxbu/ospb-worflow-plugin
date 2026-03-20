import { z } from 'zod';
export declare const initWorkflowTool: {
    description: string;
    args: {};
    execute(args: Record<string, never>, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const verifyCodeTool: {
    description: string;
    args: {
        taskId: z.ZodString;
    };
    execute(args: {
        taskId: string;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowExploreTool: {
    description: string;
    args: {
        requirement: z.ZodString;
        draftName: z.ZodOptional<z.ZodString>;
    };
    execute(args: {
        requirement: string;
        draftName?: string | undefined;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowProposeTool: {
    description: string;
    args: {
        draftName: z.ZodOptional<z.ZodString>;
    };
    execute(args: {
        draftName?: string | undefined;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowPlanTool: {
    description: string;
    args: {
        specName: z.ZodOptional<z.ZodString>;
    };
    execute(args: {
        specName?: string | undefined;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowTaskTool: {
    description: string;
    args: {
        planName: z.ZodOptional<z.ZodString>;
    };
    execute(args: {
        planName?: string | undefined;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowStartTool: {
    description: string;
    args: {};
    execute(args: Record<string, never>, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowArchiveTool: {
    description: string;
    args: {
        changeName: z.ZodOptional<z.ZodString>;
    };
    execute(args: {
        changeName?: string | undefined;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const planReviewTool: {
    description: string;
    args: {
        planName: z.ZodString;
        autoFix: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    };
    execute(args: {
        planName: string;
        autoFix: boolean;
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
};
export declare const workflowTools: {
    readonly 'init-workflow': {
        description: string;
        args: {};
        execute(args: Record<string, never>, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'verify-code': {
        description: string;
        args: {
            taskId: z.ZodString;
        };
        execute(args: {
            taskId: string;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-explore': {
        description: string;
        args: {
            requirement: z.ZodString;
            draftName: z.ZodOptional<z.ZodString>;
        };
        execute(args: {
            requirement: string;
            draftName?: string | undefined;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-propose': {
        description: string;
        args: {
            draftName: z.ZodOptional<z.ZodString>;
        };
        execute(args: {
            draftName?: string | undefined;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-plan': {
        description: string;
        args: {
            specName: z.ZodOptional<z.ZodString>;
        };
        execute(args: {
            specName?: string | undefined;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-task': {
        description: string;
        args: {
            planName: z.ZodOptional<z.ZodString>;
        };
        execute(args: {
            planName?: string | undefined;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-start': {
        description: string;
        args: {};
        execute(args: Record<string, never>, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'workflow-archive': {
        description: string;
        args: {
            changeName: z.ZodOptional<z.ZodString>;
        };
        execute(args: {
            changeName?: string | undefined;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
    readonly 'plan-review': {
        description: string;
        args: {
            planName: z.ZodString;
            autoFix: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        };
        execute(args: {
            planName: string;
            autoFix: boolean;
        }, context: import("@opencode-ai/plugin").ToolContext): Promise<string>;
    };
};
export type WorkflowToolName = keyof typeof workflowTools;
