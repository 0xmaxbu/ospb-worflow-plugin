import type { Hooks, Plugin, PluginInput } from '@opencode-ai/plugin';

import {
  chatTransformHook,
  executeBeforeHook,
  sessionCompactingHook,
  sessionIdleHook,
} from './hooks';

const registeredChatTransformHook =
  chatTransformHook as unknown as NonNullable<Hooks['experimental.chat.system.transform']>;

type RegisteredHooks = Hooks & {
  'session.idle': typeof sessionIdleHook;
};

export type RegisteredPlugin = {
  name: 'ospb-workflow-plugin';
  hooks: RegisteredHooks;
};

function createHooks(): RegisteredHooks {
  return {
    'tool.execute.before': executeBeforeHook,
    'experimental.chat.system.transform': registeredChatTransformHook,
    'session.idle': sessionIdleHook,
    'experimental.session.compacting': sessionCompactingHook,
  };
}

type PluginEntry = Plugin & (() => Promise<RegisteredPlugin>);

const plugin = (async (input?: PluginInput) => {
  const hooks = createHooks();

  if (input) {
    return hooks;
  }

  return {
    name: 'ospb-workflow-plugin' as const,
    hooks,
  };
}) as PluginEntry;

export default plugin;
export * from './hooks';
export * from './tool-check';
export * from './workflow-state';
