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
        driver.sendCommand.mockResolvedValue('<Root><Child /></Root>');
        const result = await getPageSource.call(driver);
        expect(result).toBe('<Root><Child /></Root>');
        expect(driver.sendCommand).toHaveBeenCalledWith('getPageSource', {});
    });
});

describe('getWindowHandle', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns hex-formatted window handle', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce('root-el-id') // saveRootElementToTable
            .mockResolvedValueOnce('12648430'); // getProperty NativeWindowHandle → 0x00C0FFEE
        const result = await getWindowHandle.call(driver);
        expect(result).toBe('0x00c0ffee');
    });

    it('pads handle to 8 hex digits', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce('root-el-id')
            .mockResolvedValueOnce('1'); // 0x00000001
        const result = await getWindowHandle.call(driver);
        expect(result).toBe('0x00000001');
    });
});

describe('getWindowHandles', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns array of hex window handles for each child window', async () => {
        const driver = createMockDriver() as any;
        // First call: findElements returns array of element IDs
        // Subsequent calls: getProperty for NativeWindowHandle on each
        driver.sendCommand
            .mockResolvedValueOnce(['1.1.1', '2.2.2']) // findElements
            .mockResolvedValueOnce('100') // handle for element 1
            .mockResolvedValueOnce('200'); // handle for element 2

        const result = await getWindowHandles.call(driver);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe('0x00000064'); // 100 = 0x64
        expect(result[1]).toBe('0x000000c8'); // 200 = 0xC8
        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'findElements', expect.objectContaining({
            scope: 'children',
            contextElementId: null,
        }));
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'getProperty', { elementId: '1.1.1', property: 'NativeWindowHandle' });
        expect(driver.sendCommand).toHaveBeenNthCalledWith(3, 'getProperty', { elementId: '2.2.2', property: 'NativeWindowHandle' });
    });

    it('returns empty array when no child windows found', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(null); // no elements
        const result = await getWindowHandles.call(driver);
        expect(result).toEqual([]);
    });
});

describe('getWindowRect', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns parsed rect object', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue({ x: 10, y: 20, width: 800, height: 600 });
        const result = await getWindowRect.call(driver);
        expect(driver.sendCommand).toHaveBeenCalledWith('getRootRect', {});
        expect(result).toEqual({ x: 10, y: 20, width: 800, height: 600 });
    });
});

describe('setWindow', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sets root element by numeric handle', async () => {
        const driver = createMockDriver() as any;
        const { trySetForegroundWindow } = await import('../../../lib/winapi/user32');

        // findElement returns a valid element ID
        driver.sendCommand
            .mockResolvedValueOnce('1.2.3') // findElement by NativeWindowHandle
            .mockResolvedValueOnce(undefined); // setRootElementFromElementId
        await setWindow.call(driver, '12345');
        expect(driver.sendCommand).toHaveBeenCalledWith('findElement', expect.objectContaining({
            scope: 'child-or-self',
            contextElementId: null,
        }));
        expect(driver.sendCommand).toHaveBeenCalledWith('setRootElementFromElementId', { elementId: '1.2.3' });
        expect(trySetForegroundWindow).toHaveBeenCalledWith(12345);
    });

    it('sets root element by window name', async () => {
        const driver = createMockDriver() as any;

        driver.sendCommand
            .mockResolvedValueOnce('') // numeric handle search returns empty (NaN path skipped, name search)
            .mockResolvedValueOnce('5.6.7') // name search succeeds
            .mockResolvedValueOnce(undefined); // setRootElementFromElementId

        await setWindow.call(driver, 'Calculator');
        expect(driver.sendCommand).toHaveBeenCalledWith('findElement', expect.objectContaining({
            scope: 'children',
            contextElementId: null,
        }));
        expect(driver.sendCommand).toHaveBeenCalledWith('setRootElementFromElementId', { elementId: '5.6.7' });
    });

    it('throws NoSuchWindowError when window is not found after retries', async () => {
        const driver = createMockDriver() as any;
        // All calls return empty (window not found)
        driver.sendCommand.mockResolvedValue('');

        await expect(setWindow.call(driver, 'NonExistentWindow')).rejects.toThrow('No window was found');
    }, 10000);
});
