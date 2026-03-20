import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execAsyncMock, writeFileMock, mkdirMock } = vi.hoisted(() => ({
  execAsyncMock: vi.fn(),
  writeFileMock: vi.fn(),
  mkdirMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: vi.fn(() => execAsyncMock),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

// Mock stdin for interactive prompts
const stdinMock = {
  once: vi.fn((event: string, callback: (data: { toString: () => string }) => void) => {
    if (event === 'data') {
      callback({ toString: () => 'n\n' }); // Default: 'n' for yes/no prompts
    }
  }),
};

vi.stubGlobal('process', {
  ...process,
  stdin: stdinMock,
  stdout: { write: vi.fn() },
  stderr: { write: vi.fn() },
});

import { initCommand } from './init';

describe('initCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execAsyncMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockReset();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  describe('tool detection', () => {
    it('should detect openspec when available', async () => {
      execAsyncMock
        .mockResolvedValueOnce({ stdout: 'openspec v1.0.0', stderr: '' })
        .mockRejectedValueOnce(Object.assign(new Error('Command not found'), { code: 'ENOENT' }));

      const result = await initCommand(['init']);

      expect(result.openspecAvailable).toBe(true);
    });

    it('should detect beads when available', async () => {
      execAsyncMock
        .mockRejectedValueOnce(Object.assign(new Error('Command not found'), { code: 'ENOENT' }))
        .mockResolvedValueOnce({ stdout: 'bd version 1.0.0', stderr: '' });

      const result = await initCommand(['init']);

      expect(result.beadsAvailable).toBe(true);
    });

    it('should indicate tools not available', async () => {
      execAsyncMock.mockRejectedValue(Object.assign(new Error('Command not found'), { code: 'ENOENT' }));

      const result = await initCommand(['init']);

      expect(result.openspecAvailable).toBe(false);
      expect(result.beadsAvailable).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should create opencode.json config', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: '' });

      await initCommand(['init']);

      expect(writeFileMock).toHaveBeenCalledWith(
        '.opencode/opencode.json',
        expect.stringContaining('@ospb/plugin-core'),
        'utf-8',
      );
    });
  });
});
