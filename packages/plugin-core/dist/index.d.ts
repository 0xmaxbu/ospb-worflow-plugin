import type { Hooks, Plugin } from '@opencode-ai/plugin';
import { sessionIdleHook } from './hooks';
type RegisteredHooks = Hooks & {
    'session.idle': typeof sessionIdleHook;
};
export type RegisteredPlugin = {
    name: 'ospb-workflow-plugin';
    hooks: RegisteredHooks;
};
type PluginEntry = Plugin & (() => Promise<RegisteredPlugin>);
declare const plugin: PluginEntry;
export default plugin;
export * from './hooks';
export * from './tool-check';
export * from './workflow-state';
