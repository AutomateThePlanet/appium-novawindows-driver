/**
 * Unit tests for stopRecordingScreen extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stopRecordingScreen } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

const mockReadFile = vi.fn();
const mockUnlink = vi.fn();
vi.mock('node:fs/promises', () => ({
    readFile: (...args: unknown[]) => mockReadFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
}));

describe('stopRecordingScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadFile.mockResolvedValue(Buffer.from('video-data'));
        mockUnlink.mockResolvedValue(undefined);
    });

    it('throws when no recording in progress', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = undefined;
        driver.recordingOutputPath = undefined;

        await expect(
            stopRecordingScreen.call(driver, {})
        ).rejects.toThrow('No screen recording in progress');
    });

    it('returns base64 video content', async () => {
        const driver = createMockDriver() as any;
        const mockStdin = { write: vi.fn() };
        driver.recordingProcess = {
            stdin: mockStdin,
            on: vi.fn((event: string, cb: () => void) => {
                if (event === 'exit') setTimeout(cb, 0);
            }),
        };
        driver.recordingOutputPath = 'C:\\temp\\rec.mp4';

        const result = await stopRecordingScreen.call(driver, {});

        expect(mockStdin.write).toHaveBeenCalledWith('q');
        expect(mockReadFile).toHaveBeenCalledWith('C:\\temp\\rec.mp4');
        expect(mockUnlink).toHaveBeenCalledWith('C:\\temp\\rec.mp4');
        expect(result).toBe(Buffer.from('video-data').toString('base64'));
    });

    it('returns empty string when remotePath is set', async () => {
        const driver = createMockDriver() as any;
        const mockStdin = { write: vi.fn() };
        driver.recordingProcess = {
            stdin: mockStdin,
            on: vi.fn((event: string, cb: () => void) => {
                if (event === 'exit') setTimeout(cb, 0);
            }),
        };
        driver.recordingOutputPath = 'C:\\temp\\rec.mp4';

        const result = await stopRecordingScreen.call(driver, { remotePath: 'http://upload.example.com' });

        expect(result).toBe('');
        expect(mockUnlink).toHaveBeenCalledWith('C:\\temp\\rec.mp4');
    });

    it('clears recording state on driver', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = {
            stdin: { write: vi.fn() },
            on: vi.fn((event: string, cb: () => void) => {
                if (event === 'exit') setTimeout(cb, 0);
            }),
        };
        driver.recordingOutputPath = 'C:\\temp\\rec.mp4';

        await stopRecordingScreen.call(driver, {});

        expect(driver.recordingProcess).toBeUndefined();
        expect(driver.recordingOutputPath).toBeUndefined();
    });
});
