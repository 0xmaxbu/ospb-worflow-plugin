import { beforeAll, describe, expect, it } from 'vitest';
import plugin from './index';
describe('Plugin Integration', () => {
    let registeredPlugin;
    beforeAll(async () => {
        registeredPlugin = await plugin();
    });
    it('should register plugin with correct name', () => {
        expect(registeredPlugin.name).toBe('ospb-workflow-plugin');
    });
    it('should register all required hooks', () => {
        expect(registeredPlugin.hooks).toBeDefined();
        expect(typeof registeredPlugin.hooks['tool.execute.before']).toBe('function');
        expect(typeof registeredPlugin.hooks['experimental.chat.system.transform']).toBe('function');
        expect(typeof registeredPlugin.hooks['session.idle']).toBe('function');
        expect(typeof registeredPlugin.hooks['experimental.session.compacting']).toBe('function');
    });
    it('should have hooks that return promises', () => {
        const executeBeforeResult = registeredPlugin.hooks['tool.execute.before']?.({
            tool: 'read',
            sessionID: 'session-1',
            callID: 'call-1',
        }, { args: {} });
        expect(executeBeforeResult).toBeInstanceOf(Promise);
    });
});
