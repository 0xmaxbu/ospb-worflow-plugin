import { chatTransformHook, executeBeforeHook, sessionCompactingHook, sessionIdleHook, } from './hooks';
import { workflowTools } from './workflow-tools';
const registeredChatTransformHook = chatTransformHook;
function createHooks() {
    return {
        'tool.execute.before': executeBeforeHook,
        'experimental.chat.system.transform': registeredChatTransformHook,
        'session.idle': sessionIdleHook,
        'experimental.session.compacting': sessionCompactingHook,
        tool: workflowTools,
    };
}
export const OspbWorkflowPlugin = async (_input) => {
    return createHooks();
};
