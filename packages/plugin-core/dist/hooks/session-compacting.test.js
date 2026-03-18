import { beforeEach, describe, expect, it, vi } from 'vitest';
const { mockPersistState, mockLoadState } = vi.hoisted(() => ({
    mockPersistState: vi.fn(),
    mockLoadState: vi.fn(),
}));
vi.mock('../workflow-state', () => ({
    persistState: mockPersistState,
    loadState: mockLoadState,
}));
import { sessionCompactingHook } from './session-compacting';
describe('sessionCompactingHook', () => {
    beforeEach(() => {
        mockPersistState.mockReset();
        mockPersistState.mockResolvedValue(undefined);
        mockLoadState.mockReset();
        mockLoadState.mockResolvedValue(null);
    });
    it('should persist state during compaction', async () => {
        const input = {
            sessionID: 'session-123',
        };
        await sessionCompactingHook(input);
        expect(mockPersistState).toHaveBeenCalledTimes(1);
    });
    it('should load state after compaction', async () => {
        mockLoadState.mockResolvedValue({
            currentTask: 'bd-123',
            isVerified: false,
        });
        const input = {
            sessionID: 'session-123',
        };
        await sessionCompactingHook(input);
        expect(mockLoadState).toHaveBeenCalledTimes(1);
    });
});
