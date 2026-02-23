/**
 * Unit tests for deleteFile extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteFile } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('deleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when path is not provided', async () => {
        const driver = createMockDriver();
        await expect(
            deleteFile.call(driver, {})
        ).rejects.toThrow("'path' must be provided");
        await expect(
            deleteFile.call(driver, { path: '' })
        ).rejects.toThrow("'path' must be provided");
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('sends Remove-Item with -Path for simple paths', async () => {
        const driver = createMockDriver();
        await deleteFile.call(driver, { path: 'C:\\temp\\file.txt' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Remove-Item')
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('-Path \'C:\\temp\\file.txt\'')
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('-Force')
        );
    });

    it('uses -LiteralPath when path contains brackets', async () => {
        const driver = createMockDriver();
        await deleteFile.call(driver, { path: 'C:\\temp\\file[1].txt' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('-LiteralPath')
        );
    });

    it('escapes single quotes in path', async () => {
        const driver = createMockDriver();
        await deleteFile.call(driver, { path: "C:\\temp\\file's.txt" });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('file\'\'s.txt')
        );
    });
});
