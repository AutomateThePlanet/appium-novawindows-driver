/**
 * Unit tests for lib/commands/app.ts: back, forward, getTitle, setWindowRect
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { back, forward, title, setWindowRect } from '../../../lib/commands/app';
import { createMockDriver } from '../../fixtures/driver';
import { Key } from '../../../lib/enums';

vi.mock('../../../lib/winapi/user32', () => ({
    getWindowAllHandlesForProcessIds: vi.fn().mockReturnValue([]),
    trySetForegroundWindow: vi.fn().mockReturnValue(true),
    keyDown: vi.fn(),
    keyUp: vi.fn(),
}));

const ELEMENT_ID = '1.2.3.4.5';

describe('back', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends Alt+Left when a window is active', async () => {
        const { keyDown, keyUp } = await import('../../../lib/winapi/user32');
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(ELEMENT_ID);

        await back.call(driver);

        expect(keyDown).toHaveBeenNthCalledWith(1, Key.ALT);
        expect(keyDown).toHaveBeenNthCalledWith(2, Key.LEFT);
        expect(keyUp).toHaveBeenNthCalledWith(1, Key.LEFT);
        expect(keyUp).toHaveBeenNthCalledWith(2, Key.ALT);
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('');

        await expect(back.call(driver)).rejects.toThrow('No active window found');
    });

    it('performs exactly one sendCommand call (window check) before sending keys', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(ELEMENT_ID);

        await back.call(driver);

        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendCommand).toHaveBeenCalledWith('saveRootElementToTable', {});
    });
});

describe('forward', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends Alt+Right when a window is active', async () => {
        const { keyDown, keyUp } = await import('../../../lib/winapi/user32');
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(ELEMENT_ID);

        await forward.call(driver);

        expect(keyDown).toHaveBeenNthCalledWith(1, Key.ALT);
        expect(keyDown).toHaveBeenNthCalledWith(2, Key.RIGHT);
        expect(keyUp).toHaveBeenNthCalledWith(1, Key.RIGHT);
        expect(keyUp).toHaveBeenNthCalledWith(2, Key.ALT);
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('');

        await expect(forward.call(driver)).rejects.toThrow('No active window found');
    });
});

describe('title (getTitle)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the window title from the Name property', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce(ELEMENT_ID) // saveRootElementToTable
            .mockResolvedValueOnce('Untitled - Notepad'); // getProperty Name

        const result = await title.call(driver);

        expect(result).toBe('Untitled - Notepad');
        expect(driver.sendCommand).toHaveBeenCalledTimes(2);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'saveRootElementToTable', {});
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'getProperty', { elementId: ELEMENT_ID, property: 'Name' });
    });

    it('returns an empty string when the window has no title', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce(ELEMENT_ID)
            .mockResolvedValueOnce('');

        const result = await title.call(driver);

        expect(result).toBe('');
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('');

        await expect(title.call(driver)).rejects.toThrow('No active window found');
    });
});

describe('setWindowRect', () => {
    beforeEach(() => vi.clearAllMocks());

    const MOCK_RECT = { x: 100, y: 100, width: 800, height: 600 };

    function createDriverWithRect(windowRect = MOCK_RECT) {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(ELEMENT_ID);
        driver.getWindowRect = vi.fn().mockResolvedValue(windowRect);
        return driver;
    }

    it('calls moveWindow and resizeWindow when all four values are provided', async () => {
        const driver = createDriverWithRect();

        const result = await setWindowRect.call(driver, 100, 100, 800, 600);

        // sendCommand calls: saveRootElementToTable + moveWindow + resizeWindow = 3
        expect(driver.sendCommand).toHaveBeenCalledTimes(3);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'saveRootElementToTable', {});
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'moveWindow', { elementId: ELEMENT_ID, x: 100, y: 100 });
        expect(driver.sendCommand).toHaveBeenNthCalledWith(3, 'resizeWindow', { elementId: ELEMENT_ID, width: 800, height: 600 });
        expect(driver.getWindowRect).toHaveBeenCalledTimes(1);
        expect(result).toEqual(MOCK_RECT);
    });

    it('calls only moveWindow when width and height are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, 50, 75, null, null);

        // sendCommand calls: saveRootElementToTable + moveWindow = 2
        expect(driver.sendCommand).toHaveBeenCalledTimes(2);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'moveWindow', { elementId: ELEMENT_ID, x: 50, y: 75 });
    });

    it('calls only resizeWindow when x and y are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, null, null, 1024, 768);

        // sendCommand calls: saveRootElementToTable + resizeWindow = 2
        expect(driver.sendCommand).toHaveBeenCalledTimes(2);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'resizeWindow', { elementId: ELEMENT_ID, width: 1024, height: 768 });
    });

    it('skips moveWindow and resizeWindow when all arguments are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, null, null, null, null);

        // sendCommand calls: saveRootElementToTable only = 1
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
    });

    it('returns the new window rect from getWindowRect', async () => {
        const expectedRect = { x: 200, y: 300, width: 1024, height: 768 };
        const driver = createDriverWithRect(expectedRect);

        const result = await setWindowRect.call(driver, 200, 300, 1024, 768);

        expect(result).toEqual(expectedRect);
    });

    it('throws InvalidArgumentError for negative width', async () => {
        const driver = createDriverWithRect();

        await expect(setWindowRect.call(driver, 0, 0, -1, 600)).rejects.toThrow('width must be a non-negative integer');
    });

    it('throws InvalidArgumentError for negative height', async () => {
        const driver = createDriverWithRect();

        await expect(setWindowRect.call(driver, 0, 0, 800, -1)).rejects.toThrow('height must be a non-negative integer');
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('');
        driver.getWindowRect = vi.fn();

        await expect(setWindowRect.call(driver, 0, 0, 800, 600)).rejects.toThrow('No active window found');
    });
});
