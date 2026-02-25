/**
 * Unit tests for executeKeys, executeClick, executeHover, executeScroll extension commands.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeKeys, executeClick, executeHover, executeScroll } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

vi.mock('../../../lib/winapi/user32', () => ({
    keyDown: vi.fn(),
    keyUp: vi.fn(),
    mouseDown: vi.fn(),
    mouseUp: vi.fn(),
    mouseMoveAbsolute: vi.fn().mockResolvedValue(undefined),
    mouseScroll: vi.fn(),
    sendKeyboardEvents: vi.fn(),
}));

describe('executeKeys', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when neither pause, text nor virtualKeyCode is set', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeKeys.call(driver, { actions: {}, forceUnicode: false })
        ).rejects.toThrow('Either pause, text or virtualKeyCode should be set.');
    });

    it('throws when multiple of pause, text, virtualKeyCode are set', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeKeys.call(driver, { actions: { pause: 100, text: 'a' }, forceUnicode: false })
        ).rejects.toThrow('Either pause, text or virtualKeyCode should be set.');
    });

    it('handles pause action', async () => {
        const driver = createMockDriver() as any;
        await executeKeys.call(driver, { actions: { pause: 50 }, forceUnicode: false });
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('handles text action', async () => {
        const driver = createMockDriver() as any;
        const { keyDown, keyUp } = await import('../../../lib/winapi/user32');
        await executeKeys.call(driver, { actions: { text: 'a' }, forceUnicode: false });
        expect(keyDown).toHaveBeenCalled();
        expect(keyUp).toHaveBeenCalled();
    });

    it('handles virtualKeyCode action', async () => {
        const driver = createMockDriver() as any;
        const { sendKeyboardEvents } = await import('../../../lib/winapi/user32');
        await executeKeys.call(driver, { actions: { virtualKeyCode: 0x41, down: true }, forceUnicode: false });
        expect(sendKeyboardEvents).toHaveBeenCalled();
    });
});

describe('executeClick', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when only x is provided without y', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeClick.call(driver, { x: 100 })
        ).rejects.toThrow('Both x and y must be provided');
    });

    it('clicks at coordinates when x and y provided', async () => {
        const driver = createMockDriver() as any;
        (driver as any).caps = {};
        const { mouseMoveAbsolute, mouseDown, mouseUp } = await import('../../../lib/winapi/user32');
        await executeClick.call(driver, { x: 100, y: 200 });
        expect(mouseMoveAbsolute).toHaveBeenCalledWith(100, 200, 0);
        expect(mouseDown).toHaveBeenCalled();
        expect(mouseUp).toHaveBeenCalled();
    });

    it('clicks with elementId when element exists', async () => {
        const driver = createMockDriver() as any;
        (driver as any).caps = {};
        const rectJson = '{"x":10,"y":20,"width":100,"height":50}';
        let callCount = 0;
        driver.sendPowerShellCommand.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve('True');
            }
            if (callCount === 2) {
                return Promise.resolve('1.2.3.4.5');
            }
            return Promise.resolve(rectJson);
        });
        const { mouseMoveAbsolute } = await import('../../../lib/winapi/user32');
        await executeClick.call(driver, { elementId: '1.2.3.4.5' });
        expect(mouseMoveAbsolute).toHaveBeenCalledWith(60, 45, 0); // center of rect
    });
});

describe('executeHover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when only startX is provided without startY', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeHover.call(driver, { startX: 100 })
        ).rejects.toThrow('Both startX and startY must be provided');
    });

    it('throws when only endX is provided without endY', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeHover.call(driver, { startX: 0, startY: 0, endX: 100 })
        ).rejects.toThrow('Both endX and endY must be provided');
    });

    it('moves from start to end coordinates', async () => {
        const driver = createMockDriver() as any;
        (driver as any).caps = {};
        const { mouseMoveAbsolute } = await import('../../../lib/winapi/user32');
        await executeHover.call(driver, { startX: 0, startY: 0, endX: 100, endY: 100 });
        expect(mouseMoveAbsolute).toHaveBeenCalledTimes(2);
    });
});

describe('executeScroll', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when elementId and x/y are both provided', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeScroll.call(driver, { elementId: '1.2.3.4.5', x: 100, y: 100 })
        ).rejects.toThrow('Either elementId or x and y must be provided');
    });

    it('throws when only x is provided without y', async () => {
        const driver = createMockDriver() as any;
        await expect(
            executeScroll.call(driver, { x: 100 })
        ).rejects.toThrow('Both x and y must be provided');
    });

    it('scrolls at coordinates when x, y, deltaX, deltaY provided', async () => {
        const driver = createMockDriver() as any;
        const { mouseMoveAbsolute, mouseScroll } = await import('../../../lib/winapi/user32');
        await executeScroll.call(driver, { x: 100, y: 200, deltaX: 0, deltaY: 50 });
        expect(mouseMoveAbsolute).toHaveBeenCalledWith(100, 200, 0);
        expect(mouseScroll).toHaveBeenCalledWith(0, 50);
    });
});
