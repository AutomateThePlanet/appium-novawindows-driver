/**
 * Unit tests for lib/commands/element.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getProperty,
    getAttribute,
    active,
    getName,
    getText,
    clear,
    getElementRect,
    elementDisplayed,
    elementSelected,
    elementEnabled,
    getElementScreenshot,
} from '../../lib/commands/element';
import { createMockDriver } from '../fixtures/driver';
import { W3C_ELEMENT_KEY } from '@appium/base-driver';

vi.mock('../../lib/winapi/user32', () => ({
    mouseDown: vi.fn(),
    mouseUp: vi.fn(),
    mouseMoveAbsolute: vi.fn().mockResolvedValue(undefined),
}));

const ELEMENT_ID = '1.2.3.4.5';

describe('getProperty', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends getProperty command and returns result', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('Calculator');
        const result = await getProperty.call(driver, 'name', ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getProperty', { elementId: ELEMENT_ID, property: 'name' });
        expect(result).toBe('Calculator');
    });

    it('returns the value from sendCommand for runtimeid property', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('1.2.3.4.5');
        const result = await getProperty.call(driver, 'runtimeid', ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getProperty', { elementId: ELEMENT_ID, property: 'runtimeid' });
        expect(result).toBe('1.2.3.4.5');
    });
});

describe('getAttribute', () => {
    beforeEach(() => vi.clearAllMocks());

    it('delegates to getProperty and returns result', async () => {
        const driver = createMockDriver() as any;
        driver.getProperty = vi.fn().mockResolvedValue('SomeValue');
        driver.log.warn = vi.fn();
        const result = await getAttribute.call(driver, 'name', ELEMENT_ID);
        expect(driver.getProperty).toHaveBeenCalledWith('name', ELEMENT_ID);
        expect(result).toBe('SomeValue');
    });
});

describe('active', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the focused element wrapped in W3C element key', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('9.8.7.6.5');
        const result = await active.call(driver);
        expect(driver.sendCommand).toHaveBeenCalledWith('findElementFocused', {});
        expect(result[W3C_ELEMENT_KEY]).toBe('9.8.7.6.5');
    });
});

describe('getName', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the tag name from the command', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('Button');
        const result = await getName.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getTagName', { elementId: ELEMENT_ID });
        expect(result).toBe('Button');
    });
});

describe('getText', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the text content from the command', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('Hello World');
        const result = await getText.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getText', { elementId: ELEMENT_ID });
        expect(result).toBe('Hello World');
    });
});

describe('clear', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends setElementValue command with empty string', async () => {
        const driver = createMockDriver() as any;
        await clear.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendCommand).toHaveBeenCalledWith('setElementValue', { elementId: ELEMENT_ID, value: '' });
    });
});

describe('getElementRect', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns rect adjusted relative to root rect', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce({ x: 110, y: 220, width: 50, height: 30 })
            .mockResolvedValueOnce({ x: 100, y: 200, width: 800, height: 600 });

        const result = await getElementRect.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'getRect', { elementId: ELEMENT_ID });
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'getRootRect', {});
        expect(result.x).toBe(10); // 110 - 100
        expect(result.y).toBe(20); // 220 - 200
        expect(result.width).toBe(50);
        expect(result.height).toBe(30);
    });

    it('handles Infinity values by replacing with max int32', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce({ x: Infinity, y: 0, width: 50, height: 30 })
            .mockResolvedValueOnce({ x: 0, y: 0, width: 800, height: 600 });

        const result = await getElementRect.call(driver, ELEMENT_ID);
        expect(result.x).toBe(0x7FFFFFFF);
    });

    it('clamps adjusted x and y to max int32', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce({ x: 0x7FFFFFFF, y: 0, width: 10, height: 10 })
            .mockResolvedValueOnce({ x: 0, y: 0, width: 800, height: 600 });

        const result = await getElementRect.call(driver, ELEMENT_ID);
        expect(result.x).toBe(0x7FFFFFFF);
    });
});

describe('elementDisplayed', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns true when IS_OFFSCREEN is false', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('False');
        const result = await elementDisplayed.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getProperty', { elementId: ELEMENT_ID, property: 'IsOffscreen' });
        expect(result).toBe(true);
    });

    it('returns false when IS_OFFSCREEN is true', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('True');
        const result = await elementDisplayed.call(driver, ELEMENT_ID);
        expect(result).toBe(false);
    });
});

describe('elementSelected', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns true when isElementSelected returns true', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('True');
        const result = await elementSelected.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('isElementSelected', { elementId: ELEMENT_ID });
        expect(result).toBe(true);
    });

    it('returns false when isElementSelected returns false', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('False');
        const result = await elementSelected.call(driver, ELEMENT_ID);
        expect(result).toBe(false);
    });

    it('falls back to ToggleState when isElementSelected throws', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockRejectedValueOnce(new Error('No SelectionItemPattern'))
            .mockResolvedValueOnce('On');
        const result = await elementSelected.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'isElementSelected', { elementId: ELEMENT_ID });
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'getToggleState', { elementId: ELEMENT_ID });
        expect(result).toBe(true);
    });

    it('returns false from ToggleState when toggle is Off', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockRejectedValueOnce(new Error('No SelectionItemPattern'))
            .mockResolvedValueOnce('Off');
        const result = await elementSelected.call(driver, ELEMENT_ID);
        expect(result).toBe(false);
    });
});

describe('elementEnabled', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns true when IS_ENABLED is true', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('true');
        const result = await elementEnabled.call(driver, ELEMENT_ID);
        expect(driver.sendCommand).toHaveBeenCalledWith('getProperty', { elementId: ELEMENT_ID, property: 'IsEnabled' });
        expect(result).toBe(true);
    });

    it('returns false when IS_ENABLED is false', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('false');
        const result = await elementEnabled.call(driver, ELEMENT_ID);
        expect(result).toBe(false);
    });
});

describe('getElementScreenshot', () => {
    beforeEach(() => vi.clearAllMocks());

    const ROOT_ID = '0.1.2.3';
    const FAKE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('returns base64 PNG from the screenshot command', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce(ROOT_ID) // saveRootElementToTable
            .mockResolvedValueOnce(FAKE_BASE64); // getElementScreenshot

        const result = await getElementScreenshot.call(driver, ELEMENT_ID);

        expect(result).toBe(FAKE_BASE64);
        expect(driver.sendCommand).toHaveBeenCalledTimes(2);
    });

    it('throws NoSuchWindowError when no active window', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('');

        await expect(getElementScreenshot.call(driver, ELEMENT_ID)).rejects.toThrow('No active window found');
    });

    it('sends getElementScreenshot command with elementId', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand
            .mockResolvedValueOnce(ROOT_ID)
            .mockResolvedValueOnce(FAKE_BASE64);

        await getElementScreenshot.call(driver, ELEMENT_ID);

        expect(driver.sendCommand).toHaveBeenNthCalledWith(1, 'saveRootElementToTable', {});
        expect(driver.sendCommand).toHaveBeenNthCalledWith(2, 'getElementScreenshot', { elementId: ELEMENT_ID });
    });
});
