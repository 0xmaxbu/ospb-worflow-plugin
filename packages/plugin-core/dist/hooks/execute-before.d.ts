import type { Hooks } from '@opencode-ai/plugin';
type ExecuteBeforeHook = NonNullable<Hooks['tool.execute.before']>;
type ExecuteBeforeHookInput = Parameters<ExecuteBeforeHook>[0];
type ExecuteBeforeHookOutput = Parameters<ExecuteBeforeHook>[1];
export declare function executeBeforeHook(input: ExecuteBeforeHookInput, output: ExecuteBeforeHookOutput): Promise<void>;
export {};
