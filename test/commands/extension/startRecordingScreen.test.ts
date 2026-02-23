/**
 * Unit tests for startRecordingScreen extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startRecordingScreen } from '../../../lib/commands/extension';
import { getBundledFfmpegPath } from '../../../lib/util';
import { createMockDriver } from '../../fixtures/driver';

const BUNDLED_FFMPEG = 'C:\\path\\to\\bundled\\ffmpeg.exe';

const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
    spawn: (...args: unknown[]) => mockSpawn(...args),
}));
vi.mock('../../../lib/util', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../lib/util')>();
    return {
        ...actual,
        getBundledFfmpegPath: vi.fn(() => BUNDLED_FFMPEG),
    };
});

describe('startRecordingScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSpawn.mockReturnValue({
            stdin: { write: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn(),
        });
    });

    it('spawns bundled ffmpeg with default args', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = undefined;
        driver.recordingOutputPath = undefined;

        await startRecordingScreen.call(driver, { outputPath: 'C:\\temp\\rec.mp4' });

        expect(mockSpawn).toHaveBeenCalledWith(BUNDLED_FFMPEG, expect.arrayContaining([
            '-f', 'gdigrab',
            '-framerate', '15',
            '-i', 'desktop',
            '-t', '180',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-y',
            'C:\\temp\\rec.mp4',
        ]), expect.any(Object));
    });

    it('spawns ffmpeg with custom options', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = undefined;

        await startRecordingScreen.call(driver, {
            outputPath: 'C:\\recordings\\test.mp4',
            timeLimit: 60,
            videoFps: 30,
            videoSize: '1280x720',
        });

        expect(mockSpawn).toHaveBeenCalledWith(BUNDLED_FFMPEG, expect.arrayContaining([
            '-framerate', '30',
            '-t', '60',
            '-video_size', '1280x720',
            'C:\\recordings\\test.mp4',
        ]), expect.any(Object));
    });

    it('throws when bundled ffmpeg is missing', async () => {
        vi.mocked(getBundledFfmpegPath).mockReturnValueOnce(null);

        const driver = createMockDriver() as any;
        driver.recordingProcess = undefined;

        await expect(
            startRecordingScreen.call(driver, { outputPath: 'C:\\out.mp4' })
        ).rejects.toThrow('bundled ffmpeg is missing');
    });

    it('throws when already recording without forceRestart', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = { stdin: { write: vi.fn() } };
        driver.recordingOutputPath = 'C:\\tmp\\rec.mp4';

        await expect(
            startRecordingScreen.call(driver, { outputPath: 'C:\\other.mp4' })
        ).rejects.toThrow('Screen recording is already in progress');
    });

    it('stores process and path on driver', async () => {
        const driver = createMockDriver() as any;
        driver.recordingProcess = undefined;
        const proc = { stdin: { write: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn() };
        mockSpawn.mockReturnValue(proc);

        await startRecordingScreen.call(driver, { outputPath: 'C:\\out.mp4' });

        expect(driver.recordingProcess).toBe(proc);
        expect(driver.recordingOutputPath).toBe('C:\\out.mp4');
    });
});
