/**
 * Unit tests for lib/commands/device.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getDeviceTime,
    pushFile,
    pullFile,
    pullFolder,
    hideKeyboard,
    isKeyboardShown,
    activateApp,
    terminateApp,
    isAppInstalled,
} from '../../lib/commands/device';
import { createMockDriver } from '../fixtures/driver';

/** Decode base64 Invoke-Expression wrappers to reveal the underlying PS command. */
function decodeCommand(cmd: string): string {
    const match = cmd.match(/FromBase64String\('([^']+)'\)/);
    if (!match) {return cmd;}
    return decodeCommand(Buffer.from(match[1], 'base64').toString('utf8'));
}

describe('getDeviceTime', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns formatted date string from PS command', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        const result = await getDeviceTime.call(driver);
        expect(result).toBe('2026-02-25T10:30:00+00:00');
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
    });

    it('uses ISO 8061 format by default when no format provided', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        await getDeviceTime.call(driver);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-Date');
        expect(cmd).toContain('yyyy-MM-ddTHH:mm:sszzz');
    });

    it('uses custom format when provided as second argument', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('25/02/2026');
        const result = await getDeviceTime.call(driver, undefined, 'dd/MM/yyyy');
        expect(result).toBe('25/02/2026');
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-Date');
        expect(cmd).toContain('ToString');
    });
});

describe('pushFile', () => {
    beforeEach(() => vi.clearAllMocks());

    it('asserts MODIFY_FS_FEATURE and calls PS with path and data', async () => {
        const driver = createMockDriver() as any;
        await pushFile.call(driver, 'C:\\temp\\test.txt', 'aGVsbG8=');
        expect(driver.assertFeatureEnabled).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('WriteAllBytes');
        expect(cmd).toContain('FromBase64String');
        expect(cmd).toContain('CreateDirectory');
    });

    it('throws InvalidArgumentError when path is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(pushFile.call(driver, '', 'aGVsbG8=')).rejects.toThrow("'path' must be provided.");
    });

    it('throws InvalidArgumentError when data is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(pushFile.call(driver, 'C:\\temp\\test.txt', '')).rejects.toThrow("'data' must be provided.");
    });
});

describe('pullFile', () => {
    beforeEach(() => vi.clearAllMocks());

    it('asserts MODIFY_FS_FEATURE and returns base64 string', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('aGVsbG8=');
        const result = await pullFile.call(driver, 'C:\\temp\\test.txt');
        expect(driver.assertFeatureEnabled).toHaveBeenCalledTimes(1);
        expect(result).toBe('aGVsbG8=');
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('ReadAllBytes');
        expect(cmd).toContain('ToBase64String');
    });

    it('throws InvalidArgumentError when path is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(pullFile.call(driver, '')).rejects.toThrow("'path' must be provided.");
    });
});

describe('pullFolder', () => {
    beforeEach(() => vi.clearAllMocks());

    it('asserts MODIFY_FS_FEATURE and returns base64 zip', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('UEsDBA==');
        const result = await pullFolder.call(driver, 'C:\\temp\\mydir');
        expect(driver.assertFeatureEnabled).toHaveBeenCalledTimes(1);
        expect(result).toBe('UEsDBA==');
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Compress-Archive');
        expect(cmd).toContain('-LiteralPath');
        expect(cmd).toContain('ToBase64String');
        expect(cmd).toContain('Remove-Item');
    });

    it('throws InvalidArgumentError when path is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(pullFolder.call(driver, '')).rejects.toThrow("'path' must be provided.");
    });
});

describe('hideKeyboard', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends PS command without throwing', async () => {
        const driver = createMockDriver() as any;
        await hideKeyboard.call(driver);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('TabTip');
        expect(cmd).toContain('TextInputHost');
    });

    it('accepts optional strategy/key/keyCode/keyName without error', async () => {
        const driver = createMockDriver() as any;
        await expect(hideKeyboard.call(driver, 'pressKey', 'Done', undefined, undefined)).resolves.not.toThrow();
    });
});

describe('isKeyboardShown', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns true when PS outputs "true"', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('true\n');
        const result = await isKeyboardShown.call(driver);
        expect(result).toBe(true);
    });

    it('returns false when PS outputs "false"', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('false\n');
        const result = await isKeyboardShown.call(driver);
        expect(result).toBe(false);
    });

    it('sends a command that checks TabTip and TextInputHost', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('false');
        await isKeyboardShown.call(driver);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('TabTip');
        expect(cmd).toContain('IsOffscreenProperty');
    });
});

describe('activateApp', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws InvalidArgumentError when appId is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(activateApp.call(driver, '')).rejects.toThrow("'appId' or 'bundleId' must be provided.");
    });

    it('calls changeRootElement directly for UWP app IDs', async () => {
        const driver = createMockDriver() as any;
        driver.changeRootElement = vi.fn().mockResolvedValue(undefined);
        await activateApp.call(driver, 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App');
        expect(driver.changeRootElement).toHaveBeenCalledWith('Microsoft.WindowsCalculator_8wekyb3d8bbwe!App');
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('attaches to existing classic process window when already running', async () => {
        const driver = createMockDriver() as any;
        driver.changeRootElement = vi.fn().mockResolvedValue(undefined);
        driver.attachToApplicationWindow = vi.fn().mockResolvedValue(undefined);
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('1234') // Get-Process PID
            .mockResolvedValueOnce('5678'); // MainWindowHandle
        await activateApp.call(driver, 'C:\\Windows\\System32\\notepad.exe');
        expect(driver.changeRootElement).toHaveBeenCalledWith(5678);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(2);
    });

    it('launches via changeRootElement when process is not running', async () => {
        const driver = createMockDriver() as any;
        driver.changeRootElement = vi.fn().mockResolvedValue(undefined);
        driver.sendPowerShellCommand.mockResolvedValue(''); // no existing PID
        await activateApp.call(driver, 'C:\\Windows\\System32\\notepad.exe');
        expect(driver.changeRootElement).toHaveBeenCalledWith('C:\\Windows\\System32\\notepad.exe');
    });
});

describe('terminateApp', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws InvalidArgumentError when appId is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(terminateApp.call(driver, '')).rejects.toThrow("'appId' or 'bundleId' must be provided.");
    });

    it('returns false when classic process is not running', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('none') // check query — not running
            .mockResolvedValueOnce(''); // $rootElement = $null
        const result = await terminateApp.call(driver, 'C:\\Windows\\System32\\notepad.exe');
        expect(result).toBe(false);
    });

    it('returns true when classic process was terminated', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('1234') // check query — PID list
            .mockResolvedValueOnce('') // Stop-Process (void)
            .mockResolvedValueOnce('false') // poll — process is gone
            .mockResolvedValueOnce(''); // $rootElement = $null
        const result = await terminateApp.call(driver, 'C:\\Windows\\System32\\notepad.exe');
        expect(result).toBe(true);
    });

    it('uses UWP path and searches by PackageFamilyName for UWP apps', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('1234') // check query — PID list
            .mockResolvedValueOnce('') // Stop-Process (void)
            .mockResolvedValueOnce('false') // poll — process is gone
            .mockResolvedValueOnce(''); // $rootElement = $null
        const result = await terminateApp.call(driver, 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App');
        expect(result).toBe(true);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-AppxPackage');
        expect(cmd).toContain('PackageFamilyName');
    });

    it('resets rootElement regardless of result', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('none') // check query — not running
            .mockResolvedValueOnce(''); // $rootElement = $null
        await terminateApp.call(driver, 'notepad.exe');
        const lastCall = driver.sendPowerShellCommand.mock.calls[driver.sendPowerShellCommand.mock.calls.length - 1][0];
        expect(lastCall).toContain('$rootElement = $null');
    });
});

describe('isAppInstalled', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws InvalidArgumentError when appId is empty', async () => {
        const driver = createMockDriver() as any;
        await expect(isAppInstalled.call(driver, '')).rejects.toThrow("'appId' or 'bundleId' must be provided.");
    });

    it('returns true for UWP app when package is found', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('true\n');
        const result = await isAppInstalled.call(driver, 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App');
        expect(result).toBe(true);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-AppxPackage');
    });

    it('returns false for UWP app when package is not found', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('false\n');
        const result = await isAppInstalled.call(driver, 'NonExistent_app!App');
        expect(result).toBe(false);
    });

    it('uses Test-Path for full file paths', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('true\n');
        const result = await isAppInstalled.call(driver, 'C:\\Windows\\System32\\notepad.exe');
        expect(result).toBe(true);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Test-Path');
        expect(cmd).toContain('-LiteralPath');
    });

    it('uses Get-Command for bare process names', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('true\n');
        const result = await isAppInstalled.call(driver, 'calc.exe');
        expect(result).toBe(true);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-Command');
    });
});
