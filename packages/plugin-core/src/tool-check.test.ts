import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ToolCheck', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe('isOpenSpecAvailable', () => {
    it('should return true when openspec command exists', async () => {
      const mockExec = vi
        .fn()
        .mockResolvedValue({ stdout: 'openspec version 1.0.0\n', stderr: '' });

      vi.stubGlobal('exec', mockExec);

      const { isOpenSpecAvailable } = await import('./tool-check');
      const result = await isOpenSpecAvailable();

      expect(result).toBe(true);
    });

    it('should return false when openspec command not found', async () => {
      const error = new Error('Command not found');
      error.name = 'ENOENT';

      const mockExec = vi.fn().mockRejectedValue(error);
      vi.stubGlobal('exec', mockExec);

      const { isOpenSpecAvailable } = await import('./tool-check');
      const result = await isOpenSpecAvailable();

      expect(result).toBe(false);
    });
  });

  describe('isBeadsAvailable', () => {
    it('should return true when bd command exists', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: 'bd version 1.0.0\n', stderr: '' });
      vi.stubGlobal('exec', mockExec);

      const { isBeadsAvailable } = await import('./tool-check');
      const result = await isBeadsAvailable();

      expect(result).toBe(true);
    });

    it('should return false when bd command not found', async () => {
      const error = new Error('Command not found');
      error.name = 'ENOENT';

      const mockExec = vi.fn().mockRejectedValue(error);
      vi.stubGlobal('exec', mockExec);

      const { isBeadsAvailable } = await import('./tool-check');
      const result = await isBeadsAvailable();

      expect(result).toBe(false);
    });
  });

  describe('checkAllTools', () => {
    it('should return status for all required tools', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: 'version\n', stderr: '' });
      vi.stubGlobal('exec', mockExec);

      const { checkAllTools } = await import('./tool-check');
      const result = await checkAllTools();

      expect(result).toEqual({
        openspec: true,
        beads: true,
      });
    });
  });
});
