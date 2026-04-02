/**
 * Unit tests for lib/powershell/common.ts (PS type wrappers)
 */
import { describe, it, expect } from 'vitest';
import { W3C_ELEMENT_KEY } from '@appium/base-driver';
import {
    PSString,
    PSBoolean,
    PSInt32,
    PSInt32Array,
    PSAutomationHeadingLevel,
    PSOrientationType,
    PSControlType,
    PSPoint,
    PSRect,
    PSAutomationElement,
    PSCultureInfo,
} from '../../lib/powershell/common';

/** Decode the outermost base64 Invoke-Expression wrapper to reveal the PS command. */
function decodeCommand(cmd: string): string {
    const match = cmd.match(/FromBase64String\('([^']+)'\)/);
    if (!match) {return cmd;}
    return Buffer.from(match[1], 'base64').toString('utf8');
}

describe('PSString', () => {
    it('wraps value in double-quotes with unicode escaping', () => {
        const ps = new PSString('hello');
        expect(ps.toString()).toMatch(/^".*"$/);
    });

    it('escapes each character as unicode codepoint', () => {
        const ps = new PSString('A');
        // 'A' is 0x0041
        expect(ps.toString()).toContain('0x0041');
    });

    it('handles empty string', () => {
        const ps = new PSString('');
        expect(ps.toString()).toBe('""');
    });

    it('handles special characters', () => {
        const ps = new PSString("it's a test");
        expect(ps.toString()).toMatch(/^".*"$/);
    });
});

describe('PSBoolean', () => {
    it('returns $true for true', () => {
        expect(new PSBoolean(true).toString()).toBe('$true');
    });

    it('returns $false for false', () => {
        expect(new PSBoolean(false).toString()).toBe('$false');
    });

    it('throws for non-boolean input', () => {
        expect(() => new PSBoolean('true' as any)).toThrow('PSBoolean accepts only boolean');
        expect(() => new PSBoolean(1 as any)).toThrow('PSBoolean accepts only boolean');
        expect(() => new PSBoolean(null as any)).toThrow('PSBoolean accepts only boolean');
    });
});

describe('PSInt32', () => {
    it('converts integer to string', () => {
        expect(new PSInt32(42).toString()).toBe('42');
        expect(new PSInt32(0).toString()).toBe('0');
        expect(new PSInt32(-1).toString()).toBe('-1');
    });

    it('throws for non-integer values', () => {
        expect(() => new PSInt32(1.5)).toThrow('PSInt32 accepts only integer values');
        expect(() => new PSInt32(NaN)).toThrow('PSInt32 accepts only integer values');
        expect(() => new PSInt32(Infinity)).toThrow('PSInt32 accepts only integer values');
    });
});

describe('PSInt32Array', () => {
    it('wraps integer array in PS syntax', () => {
        const result = new PSInt32Array([1, 2, 3]).toString();
        expect(result).toContain('1, 2, 3');
        expect(result).toContain('int32');
    });

    it('handles empty array', () => {
        const result = new PSInt32Array([]).toString();
        expect(result).toContain('int32');
    });

    it('throws for non-array input', () => {
        expect(() => new PSInt32Array('1,2,3' as any)).toThrow('PSInt32Array accepts only array of integers');
    });

    it('throws for array with non-integer elements', () => {
        expect(() => new PSInt32Array([1, 1.5, 3])).toThrow('PSInt32Array accepts only array of integers');
    });
});

describe('PSAutomationHeadingLevel', () => {
    it('wraps valid heading level', () => {
        const ps = new PSAutomationHeadingLevel('level1');
        expect(ps.toString()).toContain('level1');
        expect(ps.originalValue).toBe('level1');
    });

    it('accepts none heading level', () => {
        expect(() => new PSAutomationHeadingLevel('none')).not.toThrow();
    });

    it('throws for invalid heading level', () => {
        expect(() => new PSAutomationHeadingLevel('level10')).toThrow('PSAutomationHeadingLevel');
        expect(() => new PSAutomationHeadingLevel('invalid')).toThrow('PSAutomationHeadingLevel');
    });
});

describe('PSOrientationType', () => {
    it('wraps valid orientation type', () => {
        const ps = new PSOrientationType('horizontal');
        expect(ps.toString()).toContain('horizontal');
        expect(ps.originalValue).toBe('horizontal');
    });

    it('accepts none orientation type', () => {
        expect(() => new PSOrientationType('none')).not.toThrow();
    });

    it('throws for invalid orientation type', () => {
        expect(() => new PSOrientationType('diagonal')).toThrow('PSOrientationType');
    });
});

describe('PSControlType', () => {
    it('wraps standard control types', () => {
        const ps = new PSControlType('button');
        expect(ps.toString()).toContain('button');
    });

    it('handles SemanticZoom as "semantic zoom"', () => {
        const ps = new PSControlType('semanticzoom');
        expect(ps.toString()).toBe('semantic zoom');
    });

    it('handles AppBar as "app bar"', () => {
        const ps = new PSControlType('appbar');
        expect(ps.toString()).toBe('app bar');
    });

    it('throws for invalid control type', () => {
        expect(() => new PSControlType('unknowntype')).toThrow('PSControlType');
    });

    it('accepts all standard ControlType values', () => {
        const types = ['window', 'edit', 'checkbox', 'combobox', 'list', 'listitem', 'menu', 'menuitem', 'pane', 'tab', 'tabitem'];
        for (const t of types) {
            expect(() => new PSControlType(t)).not.toThrow();
        }
    });
});

describe('PSPoint', () => {
    it('creates PS point representation', () => {
        const ps = new PSPoint({ x: 10, y: 20 });
        const str = ps.toString();
        expect(str).toContain('10');
        expect(str).toContain('20');
        expect(str).toContain('Point');
    });

    it('throws for missing y coordinate', () => {
        expect(() => new PSPoint({ x: 1 } as any)).toThrow('PSPoint');
    });

    it('throws for missing x coordinate', () => {
        expect(() => new PSPoint({ y: 1 } as any)).toThrow('PSPoint');
    });

    it('throws for non-number x coordinate', () => {
        expect(() => new PSPoint({ x: 'a' as any, y: 1 })).toThrow('PSPoint');
    });
});

describe('PSRect', () => {
    it('creates PS rect representation', () => {
        const ps = new PSRect({ x: 1, y: 2, width: 100, height: 50 });
        const str = ps.toString();
        expect(str).toContain('1');
        expect(str).toContain('2');
        expect(str).toContain('100');
        expect(str).toContain('50');
        expect(str).toContain('Rect');
    });

    it('throws for incomplete rect (missing height)', () => {
        expect(() => new PSRect({ x: 1, y: 2, width: 100 } as any)).toThrow('PSRect');
    });

    it('throws for non-number rect field', () => {
        expect(() => new PSRect({ x: 'a' as any, y: 2, width: 100, height: 50 })).toThrow('PSRect');
    });
});

describe('PSAutomationElement', () => {
    it('wraps a W3C element using FoundAutomationElement', () => {
        const element = { [W3C_ELEMENT_KEY]: '1.2.3.4.5' };
        const ps = new PSAutomationElement(element);
        // The inner command is base64-encoded since FoundAutomationElement uses pwsh$
        const decoded = decodeCommand(ps.toString());
        expect(decoded).toContain('1.2.3.4.5');
    });

    it('throws if W3C element key is missing', () => {
        expect(() => new PSAutomationElement({} as any)).toThrow('PSAutomationElement');
    });

    it('throws if W3C element key is empty string', () => {
        expect(() => new PSAutomationElement({ [W3C_ELEMENT_KEY]: '' } as any)).toThrow('PSAutomationElement');
    });
});

describe('PSCultureInfo', () => {
    it('creates from string name', () => {
        const ps = new PSCultureInfo('en-US');
        expect(ps.toString()).toContain('en-US');
        expect(ps.toString()).toContain('CultureInfo');
    });

    it('creates from integer culture ID', () => {
        const ps = new PSCultureInfo(1033);
        expect(ps.toString()).toContain('1033');
        expect(ps.toString()).toContain('CultureInfo');
    });

    it('throws for negative integer', () => {
        expect(() => new PSCultureInfo(-1)).toThrow('PSCultureInfo');
    });

    it('throws for non-string non-number input', () => {
        expect(() => new PSCultureInfo([] as any)).toThrow('PSCultureInfo');
        expect(() => new PSCultureInfo(null as any)).toThrow('PSCultureInfo');
    });
});
