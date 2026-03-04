/**
 * Unit tests for the execute command router.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as extension from '../../../lib/commands/extension';
import { createMockDriver, MOCK_ELEMENT } from '../../fixtures/driver';

describe('execute (command router)', () => {
    let driver: any;

    beforeEach(() => {
        vi.clearAllMocks();
        driver = createMockDriver() as any;
        Object.assign(driver, extension);
    });

    it('routes windows:launchApp to windowsLaunchApp', async () => {
        driver.launchApp = vi.fn().mockResolvedValue(undefined);
        await extension.execute.call(driver, 'windows: launchApp', []);
        expect(driver.launchApp).toHaveBeenCalledOnce();
    });

    it('routes windows:closeApp to windowsCloseApp', async () => {
        driver.closeApp = vi.fn().mockResolvedValue(undefined);
        await extension.execute.call(driver, 'windows: closeApp', []);
        expect(driver.closeApp).toHaveBeenCalledOnce();
    });

    it('routes windows:getDeviceTime with format arg', async () => {
        driver.getDeviceTime = vi.fn().mockResolvedValue('2026');
        const result = await extension.execute.call(driver, 'windows: getDeviceTime', [{ format: 'yyyy' }]);
        expect(driver.getDeviceTime).toHaveBeenCalledWith(undefined, 'yyyy');
        expect(result).toBe('2026');
    });

    it('routes windows:getDeviceTime without format defaults to ISO 8601', async () => {
        driver.getDeviceTime = vi.fn().mockResolvedValue('2026-03-03T10:00:00+00:00');
        const result = await extension.execute.call(driver, 'windows: getDeviceTime', []);
        expect(driver.getDeviceTime).toHaveBeenCalledWith(undefined, undefined);
        expect(result).toBe('2026-03-03T10:00:00+00:00');
    });

    it('routes windows:deleteFile to deleteFile with args', async () => {
        await extension.execute.call(driver, 'windows: deleteFile', [{ path: 'C:\\temp\\file.txt' }]);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Remove-Item')
        );
    });

    it('routes windows:invoke to patternInvoke with element', async () => {
        await extension.execute.call(driver, 'windows: invoke', [MOCK_ELEMENT]);
        // Command is base64-encoded; verify [InvokePattern] is used
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('W0ludm9rZVBhdHRlcm5d')
        );
    });

    it('throws UnknownCommandError for unknown windows command', async () => {
        await expect(
            extension.execute.call(driver, 'windows: unknownCommand', [])
        ).rejects.toThrow('Unknown command');
    });

    it('routes powerShell to executePowerShellScript', async () => {
        driver.assertFeatureEnabled = vi.fn();
        driver.caps = {};
        driver.sendPowerShellCommand.mockResolvedValue('output');
        await extension.execute.call(driver, 'powerShell', ['Get-Process']);
        expect(driver.assertFeatureEnabled).toHaveBeenCalledWith('power_shell');
        // Script is base64-encoded in pwsh wrapper; verify Get-Process is present
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('R2V0LVByb2Nlc3M')
        );
    });

    it('routes return window.name to sendPowerShellCommand', async () => {
        driver.sendPowerShellCommand.mockResolvedValue('WindowName');
        const result = await extension.execute.call(driver, 'return window.name', []);
        // Command is base64-encoded; verify it uses rootElement and fetches Name property
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('JHJvb3RFbGVtZW50')
        );
        expect(result).toBe('WindowName');
    });

    it('throws NotImplementedError for non-matching script', async () => {
        await expect(
            extension.execute.call(driver, 'unknownScript', [])
        ).rejects.toThrow('Method is not implemented');
    });
});
