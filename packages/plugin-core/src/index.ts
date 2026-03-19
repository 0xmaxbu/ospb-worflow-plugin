import type { Hooks, Plugin } from '@opencode-ai/plugin';

import {
  chatTransformHook,
  executeBeforeHook,
  sessionCompactingHook,
  sessionIdleHook,
} from './hooks';
import { workflowTools } from './workflow-tools';

const registeredChatTransformHook =
  chatTransformHook as unknown as NonNullable<Hooks['experimental.chat.system.transform']>;

type RegisteredHooks = Hooks & {
  'session.idle': typeof sessionIdleHook;
};

function createHooks(): RegisteredHooks {
  return {
    'tool.execute.before': executeBeforeHook,
    'experimental.chat.system.transform': registeredChatTransformHook,
    'session.idle': sessionIdleHook,
    'experimental.session.compacting': sessionCompactingHook,
    tool: workflowTools as unknown as Hooks['tool'],
  };
}

export const OspbWorkflowPlugin: Plugin = async (_input) => {
  return createHooks();
};
