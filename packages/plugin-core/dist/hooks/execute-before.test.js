import { beforeEach, describe, expect, it, vi } from 'vitest';
const { mockGetState } = vi.hoisted(() => ({
    mockGetState: vi.fn(),
}));
vi.mock('../workflow-state', () => ({
    getWorkflowState: mockGetState,
}));
import { executeBeforeHook } from './execute-before';
describe('executeBeforeHook', () => {
    beforeEach(() => {
        mockGetState.mockReset();
    });
    describe('bd claim blocking', () => {
        it('should block bd claim when task not verified', async () => {
            mockGetState.mockReturnValue({
                currentTask: 'bd-123',
                isVerified: false,
                requiresVerification: true,
                canClaimNewTask: () => false,
            });
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'bd claim bd-456' },
            };
            await expect(executeBeforeHook(input, output)).rejects.toThrow('Workflow Violation');
        });
        it('should allow bd claim when no current task', async () => {
            mockGetState.mockReturnValue({
                currentTask: null,
                isVerified: false,
                requiresVerification: true,
                canClaimNewTask: () => true,
            });
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'bd claim bd-456' },
            };
            await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
        });
        it('should allow bd claim when task is verified', async () => {
            mockGetState.mockReturnValue({
                currentTask: 'bd-123',
                isVerified: true,
                requiresVerification: true,
                canClaimNewTask: () => true,
            });
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'bd claim bd-456' },
            };
            await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
        });
    });
    describe('prohibited commands', () => {
        it('should block git push --force', async () => {
            mockGetState.mockReturnValue({
                currentTask: null,
                isVerified: false,
                requiresVerification: false,
                canClaimNewTask: () => true,
            });
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'git push --force origin main' },
            };
            await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
        });
        it('should block rm -rf /', async () => {
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'rm -rf /' },
            };
            await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited command');
        });
        it('should allow normal git commands', async () => {
            const input = {
                tool: 'bash',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: { command: 'git status' },
            };
            await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
        });
    });
    describe('non-bash tools', () => {
        it('should pass through non-bash tools', async () => {
            const input = {
                tool: 'read',
                sessionID: 'session-1',
                callID: 'call-1',
            };
            const output = {
                args: {},
            };
            await expect(executeBeforeHook(input, output)).resolves.toBeUndefined();
        });
    });
});
