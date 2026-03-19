/**
 * Unit tests for additional lib/commands/app.ts functions
 * (getPageSource, getWindowHandle, getWindowHandles, getWindowRect, setWindow)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getPageSource,
    getWindowHandle,
    getWindowHandles,
    getWindowRect,
    setWindow,
} from '../../../lib/commands/app';
import { createMockDriver } from '../../fixtures/driver';

vi.mock('../../../lib/winapi/user32', () => ({
    getWindowAllHandlesForProcessIds: vi.fn().mockReturnValue([]),
    trySetForegroundWindow: vi.fn().mockReturnValue(true),
}));

describe('getPageSource', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns XML page source string', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('<Root><Child /></Root>');
        const result = await getPageSource.call(driver);
        expect(result).toBe('<Root><Child /></Root>');
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
    });
});

describe('getWindowHandle', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns hex-formatted window handle', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('12648430'); // 0x00C0FFEE
        const result = await getWindowHandle.call(driver);
        expect(result).toBe('0x00c0ffee');
    });

    it('pads handle to 8 hex digits', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('1'); // 0x00000001
        const result = await getWindowHandle.call(driver);
        expect(result).toBe('0x00000001');
    });
});

describe('getWindowHandles', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns array of hex window handles for each child window', async () => {
        const driver = createMockDriver() as any;
        // First call: findAll children of rootElement → two element IDs
        // Subsequent calls: getNativeWindowHandle for each child
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('1.1.1\n2.2.2') // findAll
            .mockResolvedValueOnce('100') // handle for element 1
            .mockResolvedValueOnce('200'); // handle for element 2

        const result = await getWindowHandles.call(driver);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe('0x00000064'); // 100 = 0x64
        expect(result[1]).toBe('0x000000c8'); // 200 = 0xC8
    });

    it('returns empty array when no child windows found', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue(''); // no elements
        const result = await getWindowHandles.call(driver);
        expect(result).toEqual([]);
    });
});

describe('getWindowRect', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns parsed rect object', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('{"x":10,"y":20,"width":800,"height":600}');
        const result = await getWindowRect.call(driver);
        expect(result).toEqual({ x: 10, y: 20, width: 800, height: 600 });
    });

    it('replaces Infinity with max int32', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('{"x":Infinity,"y":0,"width":Infinity,"height":0}');
        const result = await getWindowRect.call(driver);
        expect(result.x).toBe(0x7FFFFFFF);
        expect(result.width).toBe(0x7FFFFFFF);
    });
});

describe('setWindow', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sets root element by numeric handle', async () => {
        const driver = createMockDriver() as any;
        const { trySetForegroundWindow } = await import('../../../lib/winapi/user32');

        // findFirst returns a valid element ID
        driver.sendPowerShellCommand.mockResolvedValue('1.2.3');
        await setWindow.call(driver, '12345');
        expect(driver.sendPowerShellCommand).toHaveBeenCalled();
        // The last PS command should set $rootElement
        const calls = driver.sendPowerShellCommand.mock.calls;
        const setRootCall = calls.find((c: any[]) => c[0].includes('$rootElement ='));
        expect(setRootCall).toBeDefined();
        expect(trySetForegroundWindow).toHaveBeenCalledWith(12345);
    });

    it('sets root element by window name', async () => {
        const driver = createMockDriver() as any;

        driver.sendPowerShellCommand
            .mockResolvedValueOnce('') // numeric handle search fails (NaN)
            .mockResolvedValueOnce('5.6.7'); // name search succeeds

        await setWindow.call(driver, 'Calculator');
        const calls = driver.sendPowerShellCommand.mock.calls;
        const setRootCall = calls.find((c: any[]) => c[0].includes('$rootElement ='));
        expect(setRootCall).toBeDefined();
    });

    it('throws NoSuchWindowError when window is not found after retries', async () => {
        const driver = createMockDriver() as any;
        driver.caps['ms:windowSwitchRetries'] = 1;
        driver.caps['ms:windowSwitchInterval'] = 0;
        // All calls return empty (window not found)
        driver.sendPowerShellCommand.mockResolvedValue('');

        await expect(setWindow.call(driver, 'NonExistentWindow')).rejects.toThrow('No window was found');
    });

    it('respects ms:windowSwitchRetries cap', async () => {
        const driver2 = createMockDriver() as any;
        driver2.caps['ms:windowSwitchRetries'] = 2;
        driver2.caps['ms:windowSwitchInterval'] = 0;
        driver2.sendPowerShellCommand.mockResolvedValue('');

        // Use a numeric handle string so both the handle search and name search run per iteration (2 PS calls each)
        await expect(setWindow.call(driver2, '99999')).rejects.toThrow('No window was found');
        // 2 retries × 2 PS commands (handle search + name search) = 4 calls
        expect(driver2.sendPowerShellCommand.mock.calls.length).toBe(4);
    });
});
