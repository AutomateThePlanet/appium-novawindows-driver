/**
 * Unit tests for startRecordingScreen extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(import('node:path'), async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual };
});

import { startRecordingScreen } from '../../../lib/commands/extension';
import { ScreenRecorder } from '../../../lib/commands/screen-recorder';
import { createMockDriver } from '../../fixtures/driver';

vi.mock('../../../lib/commands/screen-recorder', () => {
    const MockScreenRecorder = vi.fn();
    return {
        ScreenRecorder: MockScreenRecorder,
        DEFAULT_EXT: 'mp4',
        uploadRecordedMedia: vi.fn(),
    };
});

const MockScreenRecorder = vi.mocked(ScreenRecorder);

describe('startRecordingScreen', () => {
    let mockRecorderInstance: { isRunning: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        mockRecorderInstance = {
            isRunning: vi.fn().mockReturnValue(false),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue(''),
        };
        MockScreenRecorder.mockImplementation(() => mockRecorderInstance as any);
    });

    it('creates a ScreenRecorder and starts recording', async () => {
        const driver = createMockDriver() as any;
        driver._screenRecorder = null;

        await startRecordingScreen.call(driver, { outputPath: 'C:\\temp\\rec.mp4' });

        expect(MockScreenRecorder).toHaveBeenCalledWith(
            'C:\\temp\\rec.mp4',
            driver,
            expect.any(Object),
        );
        expect(mockRecorderInstance.start).toHaveBeenCalledOnce();
        expect(driver._screenRecorder).toBe(mockRecorderInstance);
    });

    it('passes options to ScreenRecorder', async () => {
        const driver = createMockDriver() as any;
        driver._screenRecorder = null;

        await startRecordingScreen.call(driver, {
            outputPath: 'C:\\rec.mp4',
            timeLimit: 60,
            videoFps: 30,
            preset: 'ultrafast',
            captureCursor: true,
            captureClicks: true,
            audioInput: 'Microphone',
            videoFilter: 'scale=1280:-2',
        });

        expect(MockScreenRecorder).toHaveBeenCalledWith(
            'C:\\rec.mp4',
            driver,
            expect.objectContaining({
                fps: 30,
                timeLimit: 60,
                preset: 'ultrafast',
                captureCursor: true,
                captureClicks: true,
                audioInput: 'Microphone',
                videoFilter: 'scale=1280:-2',
            }),
        );
    });

    it('does nothing when already recording and forceRestart=false', async () => {
        const driver = createMockDriver() as any;
        const existingRecorder = {
            isRunning: vi.fn().mockReturnValue(true),
            stop: vi.fn(),
        };
        driver._screenRecorder = existingRecorder;

        await startRecordingScreen.call(driver, { forceRestart: false });

        expect(existingRecorder.stop).not.toHaveBeenCalled();
        expect(MockScreenRecorder).not.toHaveBeenCalled();
    });

    it('force-stops existing recording when forceRestart=true (default)', async () => {
        const driver = createMockDriver() as any;
        const existingRecorder = {
            isRunning: vi.fn().mockReturnValue(true),
            stop: vi.fn().mockResolvedValue(''),
        };
        driver._screenRecorder = existingRecorder;

        await startRecordingScreen.call(driver, { outputPath: 'C:\\new.mp4' });

        expect(existingRecorder.stop).toHaveBeenCalledWith(true);
        expect(MockScreenRecorder).toHaveBeenCalled();
        expect(mockRecorderInstance.start).toHaveBeenCalled();
    });

    it('clears _screenRecorder if start() throws', async () => {
        const driver = createMockDriver() as any;
        driver._screenRecorder = null;
        mockRecorderInstance.start.mockRejectedValue(new Error('ffmpeg failed'));

        await expect(
            startRecordingScreen.call(driver, { outputPath: 'C:\\out.mp4' })
        ).rejects.toThrow('ffmpeg failed');

        expect(driver._screenRecorder).toBeNull();
    });
});
