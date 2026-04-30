/**
 * Unit tests for pattern extension commands (invoke, expand, collapse, close, etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    patternInvoke,
    patternExpand,
    patternCollapse,
    patternScrollIntoView,
    patternClose,
    patternMaximize,
    patternMinimize,
    patternRestore,
    patternIsMultiple,
    patternGetSelectedItem,
    patternGetAllSelectedItems,
    patternAddToSelection,
    patternRemoveFromSelection,
    patternSelect,
    patternToggle,
    patternSetValue,
    patternGetValue,
    focusElement,
} from '../../../lib/commands/extension';
import { W3C_ELEMENT_KEY } from '@appium/base-driver';
import { createMockDriver, MOCK_ELEMENT } from '../../fixtures/driver';

const ELEMENT_ID = MOCK_ELEMENT[W3C_ELEMENT_KEY];

const PATTERN_COMMANDS = [
    { name: 'patternInvoke', fn: patternInvoke, method: 'invokeElement' },
    { name: 'patternExpand', fn: patternExpand, method: 'expandElement' },
    { name: 'patternCollapse', fn: patternCollapse, method: 'collapseElement' },
    { name: 'patternScrollIntoView', fn: patternScrollIntoView, method: 'scrollElementIntoView' },
    { name: 'patternClose', fn: patternClose, method: 'closeWindow' },
    { name: 'patternMaximize', fn: patternMaximize, method: 'maximizeWindow' },
    { name: 'patternMinimize', fn: patternMinimize, method: 'minimizeWindow' },
    { name: 'patternRestore', fn: patternRestore, method: 'restoreWindow' },
    { name: 'patternAddToSelection', fn: patternAddToSelection, method: 'addToSelection' },
    { name: 'patternRemoveFromSelection', fn: patternRemoveFromSelection, method: 'removeFromSelection' },
    { name: 'patternSelect', fn: patternSelect, method: 'selectElement' },
    { name: 'patternToggle', fn: patternToggle, method: 'toggleElement' },
] as const;

describe('pattern commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(PATTERN_COMMANDS)('$name sends sendCommand with correct method and element id', async ({ fn, method }) => {
        const driver = createMockDriver() as any;
        await fn.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendCommand).toHaveBeenCalledWith(method, { elementId: ELEMENT_ID });
    });

    it('patternIsMultiple returns true when result is true', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('true');
        const result = await patternIsMultiple.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledWith('isMultipleSelect', { elementId: ELEMENT_ID });
        expect(result).toBe(true);
    });

    it('patternIsMultiple returns false when result is false', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('false');
        const result = await patternIsMultiple.call(driver, MOCK_ELEMENT);
        expect(result).toBe(false);
    });

    it('patternGetSelectedItem returns element when selection exists', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(['2.3.4.5.6']);
        const result = await patternGetSelectedItem.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledWith('getSelectedElements', { elementId: ELEMENT_ID });
        expect(result).toEqual({ [W3C_ELEMENT_KEY]: '2.3.4.5.6' });
    });

    it('patternGetSelectedItem throws when no selection', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue([]);
        await expect(patternGetSelectedItem.call(driver, MOCK_ELEMENT)).rejects.toThrow();
    });

    it('patternGetAllSelectedItems returns array of elements', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue(['2.3.4.5.6', '3.4.5.6.7']);
        const result = await patternGetAllSelectedItems.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledWith('getSelectedElements', { elementId: ELEMENT_ID });
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ [W3C_ELEMENT_KEY]: '2.3.4.5.6' });
    });

    it('patternSetValue sends setElementValue command', async () => {
        const driver = createMockDriver() as any;
        await patternSetValue.call(driver, MOCK_ELEMENT, 'test value');
        expect(driver.sendCommand).toHaveBeenCalledWith('setElementValue', { elementId: ELEMENT_ID, value: 'test value' });
    });

    it('patternGetValue sends getElementValue command', async () => {
        const driver = createMockDriver() as any;
        await patternGetValue.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendCommand).toHaveBeenCalledWith('getElementValue', { elementId: ELEMENT_ID });
    });

    it('focusElement sends setFocus command', async () => {
        const driver = createMockDriver() as any;
        await focusElement.call(driver, MOCK_ELEMENT);
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendCommand).toHaveBeenCalledWith('setFocus', { elementId: ELEMENT_ID });
    });
});
