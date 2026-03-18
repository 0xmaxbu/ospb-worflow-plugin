import { beforeEach, describe, expect, it, vi } from 'vitest';
const { mockGetState } = vi.hoisted(() => ({
    mockGetState: vi.fn(),
}));
vi.mock('../workflow-state', () => ({
    getWorkflowState: mockGetState,
}));
import { sessionIdleHook } from './session-idle';
describe('sessionIdleHook', () => {
    beforeEach(() => {
        mockGetState.mockReset();
    });
    it('should return null when no pending verification', async () => {
        mockGetState.mockReturnValue({
            currentTask: null,
            isVerified: false,
            requiresVerification: false,
        });
        const input = {
            sessionId: 'session-123',
        };
        const result = await sessionIdleHook(input);
        expect(result).toBeNull();
    });
    it('should return reminder when task not verified', async () => {
        mockGetState.mockReturnValue({
            currentTask: 'bd-123',
            isVerified: false,
            requiresVerification: true,
        });
        const input = {
            sessionId: 'session-123',
        };
        const result = await sessionIdleHook(input);
        expect(result).not.toBeNull();
        expect(result?.content).toContain('bd-123');
        expect(result?.content).toContain('verify');
    });
    it('should return null when task is already verified', async () => {
        mockGetState.mockReturnValue({
            currentTask: 'bd-123',
            isVerified: true,
            requiresVerification: true,
        });
        const input = {
            sessionId: 'session-123',
        };
        const result = await sessionIdleHook(input);
        expect(result).toBeNull();
    });
});
