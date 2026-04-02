/**
 * Unit tests for the W3C closeApp command (session-scoped).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeApp } from '../../../lib/commands/app';
import { createMockDriver } from '../../fixtures/driver';

describe('closeApp (W3C)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('closes the session app window via UI Automation close', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('element-123') // automationRoot.buildCommand()
            .mockResolvedValueOnce(undefined) // buildCloseCommand()
            .mockResolvedValueOnce(undefined); // $rootElement = $null

        await closeApp.call(driver);

        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(3);
    });

    it('throws NoSuchWindowError when no root element exists', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValueOnce(''); // empty = window already gone

        await expect(closeApp.call(driver)).rejects.toThrow('No active app window');
    });

    it('throws NoSuchWindowError when root element returns only whitespace', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValueOnce('  \n  \n  ');

        await expect(closeApp.call(driver)).rejects.toThrow('No active app window');
    });
});
