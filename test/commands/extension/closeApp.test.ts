/**
 * Unit tests for closeApp extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { closeApp } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('closeApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when no identifier is provided', async () => {
        const driver = createMockDriver();
        await expect(closeApp.call(driver, {})).rejects.toThrow(
            'Exactly one of processId, processName, or windowHandle must be provided.'
        );
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('throws when multiple identifiers are provided', async () => {
        const driver = createMockDriver();
        await expect(
            closeApp.call(driver, { processId: 123, processName: 'notepad' })
        ).rejects.toThrow(
            'Exactly one of processId, processName, or windowHandle must be provided.'
        );
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('closes app by processId with Stop-Process -Id', async () => {
        const driver = createMockDriver();
        await closeApp.call(driver, { processId: 12345 });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            'Stop-Process -Id 12345'
        );
    });

    it('closes app by processName with Stop-Process -Name', async () => {
        const driver = createMockDriver();
        await closeApp.call(driver, { processName: 'notepad' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            "Stop-Process -Name 'notepad'"
        );
    });

    it('closes app by windowHandle (string hex)', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('element-123') // findFirst returns element id
            .mockResolvedValueOnce('5678') // get process ID
            .mockResolvedValueOnce(undefined); // Stop-Process
        await closeApp.call(driver, { windowHandle: '0x1234' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(3);
        expect(driver.sendPowerShellCommand).toHaveBeenNthCalledWith(
            3,
            'Stop-Process -Id 5678'
        );
    });

    it('closes app by windowHandle (number)', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('element-456')
            .mockResolvedValueOnce('9999')
            .mockResolvedValueOnce(undefined);
        await closeApp.call(driver, { windowHandle: 0x1234 });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(3);
        expect(driver.sendPowerShellCommand).toHaveBeenNthCalledWith(
            3,
            'Stop-Process -Id 9999'
        );
    });

    it('throws NoSuchWindowError when windowHandle finds no window', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValueOnce(''); // findFirst returns empty
        await expect(
            closeApp.call(driver, { windowHandle: '0x9999' })
        ).rejects.toThrow('No window found with handle 0x9999');
    });

    it('throws UnknownError when process ID cannot be resolved from window', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('element-123')
            .mockResolvedValueOnce(''); // get process ID returns empty
        await expect(
            closeApp.call(driver, { windowHandle: '0x1234' })
        ).rejects.toThrow('Could not get process ID for window handle 0x1234');
    });
});
