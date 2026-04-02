/**
 * Unit tests for stopRecordingScreen extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stopRecordingScreen } from '../../../lib/commands/extension';
import { uploadRecordedMedia } from '../../../lib/commands/screen-recorder';
import { createMockDriver } from '../../fixtures/driver';

vi.mock('../../../lib/commands/screen-recorder', () => ({
    ScreenRecorder: vi.fn(),
    DEFAULT_EXT: 'mp4',
    uploadRecordedMedia: vi.fn(),
}));

const mockUploadRecordedMedia = vi.mocked(uploadRecordedMedia);

describe('stopRecordingScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUploadRecordedMedia.mockResolvedValue('base64data');
    });

    it('returns empty string when no recording in progress', async () => {
        const driver = createMockDriver() as any;
        driver._screenRecorder = null;

        const result = await stopRecordingScreen.call(driver);

        expect(result).toBe('');
    });

    it('returns base64 video content', async () => {
        const driver = createMockDriver() as any;
        const mockRecorder = { stop: vi.fn().mockResolvedValue('C:\\temp\\rec.mp4') };
        driver._screenRecorder = mockRecorder;
        mockUploadRecordedMedia.mockResolvedValue('dmlkZW8tZGF0YQ==');

        const result = await stopRecordingScreen.call(driver);

        expect(mockRecorder.stop).toHaveBeenCalledWith();
        expect(mockUploadRecordedMedia).toHaveBeenCalledWith(
            'C:\\temp\\rec.mp4',
            undefined,
            expect.any(Object),
        );
        expect(result).toBe('dmlkZW8tZGF0YQ==');
    });

    it('returns empty string when stop() returns no file path', async () => {
        const driver = createMockDriver() as any;
        const mockRecorder = { stop: vi.fn().mockResolvedValue('') };
        driver._screenRecorder = mockRecorder;

        const result = await stopRecordingScreen.call(driver);

        expect(result).toBe('');
        expect(mockUploadRecordedMedia).not.toHaveBeenCalled();
    });

    it('passes remotePath and upload options to uploadRecordedMedia', async () => {
        const driver = createMockDriver() as any;
        const mockRecorder = { stop: vi.fn().mockResolvedValue('C:\\temp\\rec.mp4') };
        driver._screenRecorder = mockRecorder;

        await stopRecordingScreen.call(driver, {
            remotePath: 'https://example.com/upload',
            user: 'admin',
            pass: 'secret',
        });

        expect(mockUploadRecordedMedia).toHaveBeenCalledWith(
            'C:\\temp\\rec.mp4',
            'https://example.com/upload',
            expect.objectContaining({ user: 'admin', pass: 'secret' }),
        );
    });
});
