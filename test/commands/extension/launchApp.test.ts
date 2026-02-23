/**
 * Unit tests for launchApp extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { launchApp } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('launchApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when app is missing', async () => {
        const driver = createMockDriver();
        await expect(launchApp.call(driver, {})).rejects.toThrow("'app' must be provided.");
        await expect(launchApp.call(driver, { app: '' })).rejects.toThrow("'app' must be provided.");
        await expect(launchApp.call(driver, null as any)).rejects.toThrow("'app' must be provided.");
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('launches classic app (notepad.exe) with correct Start-Process command', async () => {
        const driver = createMockDriver();
        await launchApp.call(driver, { app: 'notepad.exe' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining("Start-Process 'notepad.exe'")
        );
    });

    it('launches classic app with appArguments', async () => {
        const driver = createMockDriver();
        await launchApp.call(driver, {
            app: 'notepad.exe',
            appArguments: 'C:\\path\\to\\file.txt',
        });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining("-ArgumentList 'C:\\path\\to\\file.txt'")
        );
    });

    it('launches UWP app with explorer shell:AppsFolder format', async () => {
        const driver = createMockDriver();
        const uwpAppId = 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App';
        await launchApp.call(driver, { app: uwpAppId });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining("Start-Process 'explorer.exe'")
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining(`shell:AppsFolder\\${uwpAppId}`)
        );
    });

    it('launches UWP app with appArguments', async () => {
        const driver = createMockDriver();
        await launchApp.call(driver, {
            app: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App',
            appArguments: '--some-flag',
        });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining("-ArgumentList '--some-flag'")
        );
    });
});
