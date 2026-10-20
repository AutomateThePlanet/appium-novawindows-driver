/**
 * Unit tests for lib/commands/actions.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errors, W3C_ELEMENT_KEY } from '@appium/base-driver';
import * as actions from '../../lib/commands/actions';
import { keyDown, keyUp, mouseDown, mouseUp, mouseMoveAbsolute, mouseScroll } from '../../lib/winapi/user32';
import { Key } from '../../lib/enums';
import { createMockDriver } from '../fixtures/driver';

const inputLog: string[] = [];

vi.mock('../../lib/winapi/user32', () => ({
    keyDown: vi.fn((key: string) => inputLog.push(`keyDown:${key}`)),
    keyUp: vi.fn((key: string) => inputLog.push(`keyUp:${key}`)),
    mouseDown: vi.fn((button: number = 0) => inputLog.push(`mouseDown:${button}`)),
    mouseUp: vi.fn((button: number = 0) => inputLog.push(`mouseUp:${button}`)),
    mouseMoveAbsolute: vi.fn(async (x: number, y: number) => { inputLog.push(`move:${x},${y}`); }),
    mouseMoveRelative: vi.fn(async (x: number, y: number) => { inputLog.push(`moveBy:${x},${y}`); }),
    mouseScroll: vi.fn((x: number, y: number) => inputLog.push(`scroll:${x},${y}`)),
}));

const ELEMENT_ID = '1.2.3.4.5';

function createActionsDriver() {
    const driver = createMockDriver() as any;
    driver.caps = {};
    driver.keyboardState = { pressed: new Set(), shift: false, ctrl: false, meta: false, alt: false };
    driver.mouseButtonsDown = new Set();
    for (const [name, fn] of Object.entries(actions)) {
        driver[name] = (fn as (...args: any[]) => any).bind(driver);
    }
    return driver;
}

describe('performActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        inputLog.length = 0;
    });

    it('interleaves key and pointer sequences by tick so modifiers are held during the click', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand.mockResolvedValue('{"x":0,"y":0,"width":800,"height":600}');

        await driver.performActions([
            { type: 'key', id: 'keyboard', actions: [
                { type: 'keyDown', value: Key.SHIFT },
                { type: 'pause' },
                { type: 'keyUp', value: Key.SHIFT },
            ] },
            { type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
                { type: 'pointerMove', x: 10, y: 20, origin: 'viewport' },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 },
            ] },
        ]);

        expect(inputLog).toEqual([
            `keyDown:${Key.SHIFT}`,
            'move:10,20',
            'mouseDown:0',
            `keyUp:${Key.SHIFT}`,
            `keyUp:${Key.R_SHIFT}`,
            'mouseUp:0',
        ]);
    });

    it('rejects unsupported pointer types before dispatching any action', async () => {
        const driver = createActionsDriver();

        await expect(driver.performActions([
            { type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: 'a' }] },
            { type: 'pointer', id: 'finger', parameters: { pointerType: 'touch' }, actions: [{ type: 'pointerDown', button: 0 }] },
        ])).rejects.toThrow(errors.NotImplementedError);
        expect(inputLog).toEqual([]);
    });

    it('treats a pointer move without origin as relative to the viewport', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand.mockResolvedValue('{"x":100,"y":200,"width":800,"height":600}');

        await driver.performActions([
            { type: 'pointer', id: 'mouse', actions: [{ type: 'pointerMove', x: 10, y: 20 }] },
        ]);

        expect(mouseMoveAbsolute).toHaveBeenCalledWith(110, 220, undefined, undefined);
    });

    it('scrolls at the target position', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand.mockResolvedValue('{"x":0,"y":0,"width":800,"height":600}');

        await driver.performActions([
            { type: 'wheel', id: 'wheel', actions: [{ type: 'scroll', x: 5, y: 6, deltaX: 0, deltaY: 120 }] },
        ]);

        expect(inputLog).toEqual(['move:5,6', 'scroll:0,120']);
        expect(mouseScroll).toHaveBeenCalledTimes(1);
    });
});

describe('handleMouseMoveAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        inputLog.length = 0;
    });

    it('applies x and y as offsets from the element center', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand.mockResolvedValue('{"x":100,"y":200,"width":50,"height":30}');

        await driver.handleMouseMoveAction({ type: 'pointerMove', x: 5, y: -5, origin: { [W3C_ELEMENT_KEY]: ELEMENT_ID } });

        expect(mouseMoveAbsolute).toHaveBeenCalledWith(130, 210, undefined, undefined);
    });

    it('re-fetches the element rect after scrolling an off-screen element into view', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand
            .mockResolvedValueOnce('{"x":Infinity,"y":Infinity,"width":0,"height":0}')
            .mockResolvedValueOnce('')
            .mockResolvedValueOnce('{"x":100,"y":200,"width":50,"height":30}');

        await driver.handleMouseMoveAction({ type: 'pointerMove', x: 0, y: 0, origin: { [W3C_ELEMENT_KEY]: ELEMENT_ID } });

        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(3);
        expect(mouseMoveAbsolute).toHaveBeenCalledWith(125, 215, undefined, undefined);
    });

    it('throws NoSuchElementError instead of a JSON parse error when the element rect is empty', async () => {
        const driver = createActionsDriver();
        driver.sendPowerShellCommand.mockResolvedValue('');

        await expect(
            driver.handleMouseMoveAction({ type: 'pointerMove', x: 0, y: 0, origin: { [W3C_ELEMENT_KEY]: ELEMENT_ID } })
        ).rejects.toThrow(errors.NoSuchElementError);
        expect(mouseMoveAbsolute).not.toHaveBeenCalled();
    });
});

describe('handleKeyAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        inputLog.length = 0;
    });

    it('null key releases every pressed key', async () => {
        const driver = createActionsDriver();
        await driver.handleKeyAction({ type: 'keyDown', value: 'a' });
        await driver.handleKeyAction({ type: 'keyDown', value: 'b' });

        await driver.handleKeyAction({ type: 'keyDown', value: Key.NULL });

        expect(keyUp).toHaveBeenCalledWith('a');
        expect(keyUp).toHaveBeenCalledWith('b');
        expect(driver.keyboardState.pressed.size).toBe(0);
    });
});

describe('releaseActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        inputLog.length = 0;
    });

    it('releases only the mouse buttons that are still held', async () => {
        const driver = createActionsDriver();
        await driver.handleMousePointerAction({ type: 'pointerDown', button: 0 });
        await driver.handleMousePointerAction({ type: 'pointerDown', button: 2 });
        await driver.handleMousePointerAction({ type: 'pointerUp', button: 0 });
        vi.mocked(mouseUp).mockClear();

        await driver.releaseActions();

        expect(mouseUp).toHaveBeenCalledTimes(1);
        expect(mouseUp).toHaveBeenCalledWith(2);
        expect(driver.mouseButtonsDown.size).toBe(0);
    });

    it('releases held keys', async () => {
        const driver = createActionsDriver();
        await driver.handleKeyAction({ type: 'keyDown', value: 'a' });

        await driver.releaseActions();

        expect(keyDown).toHaveBeenCalledWith('a');
        expect(keyUp).toHaveBeenCalledWith('a');
        expect(mouseDown).not.toHaveBeenCalled();
        expect(mouseUp).not.toHaveBeenCalled();
    });
});
