import { chatTransformHook, executeBeforeHook, sessionCompactingHook, sessionIdleHook, } from './hooks';
const registeredChatTransformHook = chatTransformHook;
function createHooks() {
    return {
        'tool.execute.before': executeBeforeHook,
        'experimental.chat.system.transform': registeredChatTransformHook,
        'session.idle': sessionIdleHook,
        'experimental.session.compacting': sessionCompactingHook,
    };
}
const plugin = (async (input) => {
    const hooks = createHooks();
    if (input) {
        return hooks;
    }
    return {
        name: 'ospb-workflow-plugin',
        hooks,
    };
});
export default plugin;
export * from './hooks';
export * from './tool-check';
export * from './workflow-state';
