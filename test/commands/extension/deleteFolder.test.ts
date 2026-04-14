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
        const driver = createMockDriver() as any;
        await expect(
            deleteFolder.call(driver, {} as any)
        ).rejects.toThrow("'path' must be provided");
        expect(driver.sendCommand).not.toHaveBeenCalled();
    });

    it('sends deleteFolder command with recursive true by default', async () => {
        const driver = createMockDriver() as any;
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder' });
        expect(driver.sendCommand).toHaveBeenCalledWith('deleteFolder', { path: 'C:\\temp\\folder', recursive: true });
    });

    it('sends deleteFolder command with recursive false when specified', async () => {
        const driver = createMockDriver() as any;
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder', recursive: false });
        expect(driver.sendCommand).toHaveBeenCalledWith('deleteFolder', { path: 'C:\\temp\\folder', recursive: false });
    });

    it('sends deleteFolder command with special chars in path', async () => {
        const driver = createMockDriver() as any;
        await deleteFolder.call(driver, { path: 'C:\\temp\\folder[1]' });
        expect(driver.sendCommand).toHaveBeenCalledWith('deleteFolder', { path: 'C:\\temp\\folder[1]', recursive: true });
    });
});
