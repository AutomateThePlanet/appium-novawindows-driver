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
        driver.sendPowerShellCommand.mockResolvedValue(ELEMENT_ID);

        await back.call(driver);

        expect(keyDown).toHaveBeenNthCalledWith(1, Key.ALT);
        expect(keyDown).toHaveBeenNthCalledWith(2, Key.LEFT);
        expect(keyUp).toHaveBeenNthCalledWith(1, Key.LEFT);
        expect(keyUp).toHaveBeenNthCalledWith(2, Key.ALT);
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('');

        await expect(back.call(driver)).rejects.toThrow('No active window found');
    });

    it('performs exactly one PS call (window check) before sending keys', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue(ELEMENT_ID);

        await back.call(driver);

        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
    });
});

describe('forward', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends Alt+Right when a window is active', async () => {
        const { keyDown, keyUp } = await import('../../../lib/winapi/user32');
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue(ELEMENT_ID);

        await forward.call(driver);

        expect(keyDown).toHaveBeenNthCalledWith(1, Key.ALT);
        expect(keyDown).toHaveBeenNthCalledWith(2, Key.RIGHT);
        expect(keyUp).toHaveBeenNthCalledWith(1, Key.RIGHT);
        expect(keyUp).toHaveBeenNthCalledWith(2, Key.ALT);
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('');

        await expect(forward.call(driver)).rejects.toThrow('No active window found');
    });
});

describe('title (getTitle)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the window title from the Name property', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce(ELEMENT_ID)       // window check
            .mockResolvedValueOnce('Untitled - Notepad'); // Name property

        const result = await title.call(driver);

        expect(result).toBe('Untitled - Notepad');
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(2);
    });

    it('returns an empty string when the window has no title', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand
            .mockResolvedValueOnce(ELEMENT_ID)
            .mockResolvedValueOnce('');

        const result = await title.call(driver);

        expect(result).toBe('');
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('');

        await expect(title.call(driver)).rejects.toThrow('No active window found');
    });
});

describe('setWindowRect', () => {
    beforeEach(() => vi.clearAllMocks());

    const MOCK_RECT = { x: 100, y: 100, width: 800, height: 600 };

    function createDriverWithRect(windowRect = MOCK_RECT) {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue(ELEMENT_ID);
        driver.getWindowRect = vi.fn().mockResolvedValue(windowRect);
        return driver;
    }

    it('calls Move and Resize when all four values are provided', async () => {
        const driver = createDriverWithRect();

        const result = await setWindowRect.call(driver, 100, 100, 800, 600);

        // PS calls: window check + Move + Resize = 3
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(3);
        expect(driver.getWindowRect).toHaveBeenCalledTimes(1);
        expect(result).toEqual(MOCK_RECT);
    });

    it('calls only Move when width and height are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, 50, 75, null, null);

        // PS calls: window check + Move = 2
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(2);
    });

    it('calls only Resize when x and y are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, null, null, 1024, 768);

        // PS calls: window check + Resize = 2
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(2);
    });

    it('skips Move and Resize when all arguments are null', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, null, null, null, null);

        // PS calls: window check only = 1
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
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
        driver.sendPowerShellCommand.mockResolvedValue('');
        driver.getWindowRect = vi.fn();

        await expect(setWindowRect.call(driver, 0, 0, 800, 600)).rejects.toThrow('No active window found');
    });

    it('the Move PS command contains TransformPattern and Move', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, 10, 20, null, null);

        const moveCmdCall = driver.sendPowerShellCommand.mock.calls[1][0] as string;
        const decoded = moveCmdCall.replace(/FromBase64String\('([^']+)'\)/g, (_, b64) =>
            Buffer.from(b64, 'base64').toString('utf8')
        );
        expect(decoded).toContain('TransformPattern');
        expect(decoded).toContain('Move');
    });

    it('the Resize PS command contains TransformPattern and Resize', async () => {
        const driver = createDriverWithRect();

        await setWindowRect.call(driver, null, null, 800, 600);

        const resizeCmdCall = driver.sendPowerShellCommand.mock.calls[1][0] as string;
        const decoded = resizeCmdCall.replace(/FromBase64String\('([^']+)'\)/g, (_, b64) =>
            Buffer.from(b64, 'base64').toString('utf8')
        );
        expect(decoded).toContain('TransformPattern');
        expect(decoded).toContain('Resize');
    });
});
