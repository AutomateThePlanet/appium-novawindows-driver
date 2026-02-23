/**
 * Unit tests for deleteFolder extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteFolder } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('deleteFolder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when path is not provided', async () => {
        const driver = createMockDriver();
        await expect(
            deleteFolder.call(driver, {})
        ).rejects.toThrow("'path' must be provided");
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('sends Remove-Item with -Recurse by default', async () => {
        const driver = createMockDriver();
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('-Recurse')
        );
    });

    it('omits -Recurse when recursive is false', async () => {
        const driver = createMockDriver();
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder', recursive: false });
        const call = driver.sendPowerShellCommand.mock.calls[0][0];
        expect(call).not.toContain('-Recurse');
    });

    it('uses -LiteralPath when path contains special chars', async () => {
        const driver = createMockDriver();
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder[1]' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('-LiteralPath')
        );
    });
});
