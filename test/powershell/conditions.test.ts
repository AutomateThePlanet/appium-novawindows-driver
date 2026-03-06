/**
 * Unit tests for lib/powershell/conditions.ts
 */
import { describe, it, expect } from 'vitest';
import {
    PropertyCondition,
    AndCondition,
    OrCondition,
    NotCondition,
    TrueCondition,
    FalseCondition,
} from '../../lib/powershell/conditions';
import { Property } from '../../lib/powershell/types';
import {
    PSBoolean,
    PSString,
    PSInt32,
    PSInt32Array,
    PSControlType,
} from '../../lib/powershell/common';

describe('TrueCondition', () => {
    it('returns TrueCondition PS expression', () => {
        const c = new TrueCondition();
        expect(c.toString()).toContain('TrueCondition');
    });
});

describe('FalseCondition', () => {
    it('returns FalseCondition PS expression', () => {
        const c = new FalseCondition();
        expect(c.toString()).toContain('FalseCondition');
    });
});

describe('PropertyCondition', () => {
    it('creates condition for a boolean property', () => {
        const c = new PropertyCondition(Property.IS_ENABLED, new PSBoolean(true));
        expect(c.toString()).toContain('isenabled');
        expect(c.toString()).toContain('$true');
    });

    it('creates condition for a string property', () => {
        const c = new PropertyCondition(Property.NAME, new PSString('Calculator'));
        expect(c.toString()).toContain('name');
    });

    it('creates condition for an int32 property', () => {
        const c = new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(12345));
        expect(c.toString()).toContain('nativewindowhandle');
        expect(c.toString()).toContain('12345');
    });

    it('creates condition for a control type property', () => {
        const c = new PropertyCondition(Property.CONTROL_TYPE, new PSControlType('button'));
        expect(c.toString()).toContain('controltype');
    });

    it('strips trailing "property" suffix from property name', () => {
        // Should still work when passing 'isenabledproperty'
        const c = new PropertyCondition('isenabledproperty' as Property, new PSBoolean(false));
        expect(c.toString()).toContain('isenabled');
    });

    it('throws when boolean property receives non-PSBoolean value', () => {
        expect(() => new PropertyCondition(Property.IS_ENABLED, new PSString('true'))).toThrow();
    });

    it('throws when string property receives non-PSString value', () => {
        expect(() => new PropertyCondition(Property.NAME, new PSInt32(42))).toThrow();
    });

    it('throws when int32 property receives non-PSInt32 value', () => {
        expect(() => new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSBoolean(true))).toThrow();
    });

    it('creates condition for int32 array property (RUNTIME_ID)', () => {
        const c = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array([1, 2, 3]));
        expect(c.toString()).toContain('runtimeid');
    });
});

describe('AndCondition', () => {
    it('creates AND condition from two conditions', () => {
        const c1 = new PropertyCondition(Property.IS_ENABLED, new PSBoolean(true));
        const c2 = new PropertyCondition(Property.NAME, new PSString('Calc'));
        const and = new AndCondition(c1, c2);
        expect(and.toString()).toContain('AndCondition');
    });

    it('creates AND condition from three conditions', () => {
        const c1 = new TrueCondition();
        const c2 = new TrueCondition();
        const c3 = new FalseCondition();
        const and = new AndCondition(c1, c2, c3);
        expect(and.toString()).toContain('AndCondition');
    });

    it('throws when fewer than 2 conditions provided', () => {
        const c1 = new TrueCondition();
        expect(() => new AndCondition(c1)).toThrow('at least 2 conditions');
        expect(() => new AndCondition()).toThrow('at least 2 conditions');
    });

    it('throws when non-Condition argument is passed', () => {
        const c1 = new TrueCondition();
        expect(() => new AndCondition(c1, 'not-a-condition' as any)).toThrow();
    });
});

describe('OrCondition', () => {
    it('creates OR condition from two conditions', () => {
        const c1 = new TrueCondition();
        const c2 = new FalseCondition();
        const or = new OrCondition(c1, c2);
        expect(or.toString()).toContain('OrCondition');
    });

    it('throws when fewer than 2 conditions provided', () => {
        const c1 = new TrueCondition();
        expect(() => new OrCondition(c1)).toThrow('at least 2 conditions');
    });

    it('throws when non-Condition argument is passed', () => {
        const c1 = new TrueCondition();
        expect(() => new OrCondition(c1, {} as any)).toThrow();
    });
});

describe('NotCondition', () => {
    it('creates NOT condition from a condition', () => {
        const c = new TrueCondition();
        const not = new NotCondition(c);
        expect(not.toString()).toContain('NotCondition');
    });

    it('throws when non-Condition argument is passed', () => {
        expect(() => new NotCondition('not-a-condition' as any)).toThrow();
    });
});
