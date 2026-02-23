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

const PATTERN_COMMANDS = [
    { name: 'patternInvoke', fn: patternInvoke, expectInCommand: 'InvokePattern' },
    { name: 'patternExpand', fn: patternExpand, expectInCommand: 'ExpandCollapsePattern' },
    { name: 'patternCollapse', fn: patternCollapse, expectInCommand: 'Collapse' },
    { name: 'patternScrollIntoView', fn: patternScrollIntoView, expectInCommand: 'ScrollItemPattern' },
    { name: 'patternClose', fn: patternClose, expectInCommand: 'WindowPattern' },
    { name: 'patternMaximize', fn: patternMaximize, expectInCommand: 'Maximized' },
    { name: 'patternMinimize', fn: patternMinimize, expectInCommand: 'Minimized' },
    { name: 'patternRestore', fn: patternRestore, expectInCommand: 'Normal' },
    { name: 'patternAddToSelection', fn: patternAddToSelection, expectInCommand: 'AddToSelection' },
    { name: 'patternRemoveFromSelection', fn: patternRemoveFromSelection, expectInCommand: 'RemoveFromSelection' },
    { name: 'patternSelect', fn: patternSelect, expectInCommand: 'Select' },
    { name: 'patternToggle', fn: patternToggle, expectInCommand: 'TogglePattern' },
] as const;

describe('pattern commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(PATTERN_COMMANDS)('$name sends sendPowerShellCommand with element id and correct command', async ({ fn, expectInCommand }) => {
        const driver = createMockDriver();
        await fn.call(driver, MOCK_ELEMENT);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        const callArg = driver.sendPowerShellCommand.mock.calls[0][0];
        const base64Match = callArg.match(/FromBase64String\('([^']+)'\)/);
        const decoded = base64Match ? Buffer.from(base64Match[1], 'base64').toString() : callArg;
        expect(decoded).toContain(expectInCommand);
    });

    it('patternIsMultiple returns true when result is true', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('true');
        const result = await patternIsMultiple.call(driver, MOCK_ELEMENT);
        expect(result).toBe(true);
    });

    it('patternIsMultiple returns false when result is false', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('false');
        const result = await patternIsMultiple.call(driver, MOCK_ELEMENT);
        expect(result).toBe(false);
    });

    it('patternGetSelectedItem returns element when selection exists', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('2.3.4.5.6');
        const result = await patternGetSelectedItem.call(driver, MOCK_ELEMENT);
        expect(result).toEqual({ [W3C_ELEMENT_KEY]: '2.3.4.5.6' });
    });

    it('patternGetSelectedItem throws when no selection', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('');
        await expect(patternGetSelectedItem.call(driver, MOCK_ELEMENT)).rejects.toThrow();
    });

    it('patternGetAllSelectedItems returns array of elements', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('2.3.4.5.6\n3.4.5.6.7');
        const result = await patternGetAllSelectedItems.call(driver, MOCK_ELEMENT);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ [W3C_ELEMENT_KEY]: '2.3.4.5.6' });
    });

    it('patternSetValue sends setValue or setRangeValue command', async () => {
        const driver = createMockDriver();
        await patternSetValue.call(driver, MOCK_ELEMENT, 'test value');
        const callArg = driver.sendPowerShellCommand.mock.calls[0][0];
        const base64Match = callArg.match(/FromBase64String\('([^']+)'\)/);
        const decoded = Buffer.from(base64Match?.[1] ?? '', 'base64').toString();
        expect(decoded).toMatch(/ValuePattern|RangeValuePattern/);
        expect(decoded).toMatch(/SetValue/);
    });

    it('patternGetValue sends getValue command', async () => {
        const driver = createMockDriver();
        await patternGetValue.call(driver, MOCK_ELEMENT);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        const callArg = driver.sendPowerShellCommand.mock.calls[0][0];
        const base64Match = callArg.match(/FromBase64String\('([^']+)'\)/);
        const decoded = Buffer.from(base64Match?.[1] ?? '', 'base64').toString();
        expect(decoded).toContain('ValuePattern');
        expect(decoded).toContain('.Value');
    });

    it('focusElement sends setFocus command', async () => {
        const driver = createMockDriver();
        await focusElement.call(driver, MOCK_ELEMENT);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        const callArg = driver.sendPowerShellCommand.mock.calls[0][0];
        const base64Match = callArg.match(/FromBase64String\('([^']+)'\)/);
        const decoded = Buffer.from(base64Match?.[1] ?? '', 'base64').toString();
        expect(decoded).toContain('SetFocus');
    });
});
