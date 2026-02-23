/**
 * Unit tests for executeClickAndDrag extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeClickAndDrag } from '../../../lib/commands/extension';
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

describe('executeClickAndDrag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when only startX is provided without startY', async () => {
        const driver = createMockDriver();
        (driver as any).caps = {};
        await expect(
            executeClickAndDrag.call(driver, { startX: 100, endX: 200, endY: 200 })
        ).rejects.toThrow('Both startX and startY must be provided');
    });

    it('throws when only endX is provided without endY', async () => {
        const driver = createMockDriver();
        (driver as any).caps = {};
        await expect(
            executeClickAndDrag.call(driver, { startX: 0, startY: 0, endX: 100 })
        ).rejects.toThrow('Both endX and endY must be provided');
    });

    it('throws when neither start coords nor startElementId provided', async () => {
        const driver = createMockDriver();
        (driver as any).caps = {};
        await expect(
            executeClickAndDrag.call(driver, { endX: 100, endY: 100 })
        ).rejects.toThrow('Either startElementId or startX and startY must be provided');
    });

    it('drags from start to end coordinates with mouseDown/mouseUp', async () => {
        const driver = createMockDriver();
        (driver as any).caps = {};
        const { mouseMoveAbsolute, mouseDown, mouseUp } = await import('../../../lib/winapi/user32');

        await executeClickAndDrag.call(driver, {
            startX: 0, startY: 0,
            endX: 100, endY: 100,
        });

        expect(mouseMoveAbsolute).toHaveBeenCalledTimes(2);
        expect(mouseMoveAbsolute).toHaveBeenNthCalledWith(1, 0, 0, 0);
        expect(mouseMoveAbsolute).toHaveBeenNthCalledWith(2, 100, 100, 500, undefined);
        expect(mouseDown).toHaveBeenCalledWith(0);
        expect(mouseUp).toHaveBeenCalledWith(0);
    });

    it('drags with elementId when element exists', async () => {
        const driver = createMockDriver();
        (driver as any).caps = {};
        const rectJson = '{"x":10,"y":20,"width":100,"height":50}';
        const returnValues = ['True', '1.2.3.4.5', rectJson, 'True', '1.2.3.4.5', rectJson];
        let callIndex = 0;
        driver.sendPowerShellCommand.mockImplementation(() =>
            Promise.resolve(returnValues[callIndex++] ?? rectJson)
        );
        const { mouseMoveAbsolute } = await import('../../../lib/winapi/user32');

        await executeClickAndDrag.call(driver, {
            startElementId: '1.2.3.4.5',
            endElementId: '1.2.3.4.5',
        });

        expect(mouseMoveAbsolute).toHaveBeenCalledTimes(2);
        expect(mouseMoveAbsolute).toHaveBeenNthCalledWith(1, 60, 45, 0);
        expect(mouseMoveAbsolute).toHaveBeenNthCalledWith(2, 60, 45, 500, undefined);
    });
});
