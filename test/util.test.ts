/**
 * Unit tests for lib/util.ts
 */
import { describe, it, expect } from 'vitest';
import { assertSupportedEasingFunction, $ } from '../lib/util';

describe('assertSupportedEasingFunction', () => {
    it.each(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'])(
        'accepts "%s"',
        (value) => {
            expect(() => assertSupportedEasingFunction(value)).not.toThrow();
        }
    );

    it('accepts cubic-bezier with valid values', () => {
        expect(() => assertSupportedEasingFunction('cubic-bezier(0.25, 0.1, 0.25, 1)')).not.toThrow();
        expect(() => assertSupportedEasingFunction('cubic-bezier(0,0,1,1)')).not.toThrow();
        expect(() => assertSupportedEasingFunction('cubic-bezier(0.42, 0, 1, 1)')).not.toThrow();
        expect(() => assertSupportedEasingFunction('cubic-bezier(0, -0.5, 1, 1.5)')).not.toThrow();
    });

    it('throws for unsupported easing function names', () => {
        expect(() => assertSupportedEasingFunction('bounce')).toThrow('Unsupported or invalid easing function');
        expect(() => assertSupportedEasingFunction('spring')).toThrow('Unsupported or invalid easing function');
        expect(() => assertSupportedEasingFunction('')).toThrow('Unsupported or invalid easing function');
    });

    it('throws for malformed cubic-bezier', () => {
        // Too few args
        expect(() => assertSupportedEasingFunction('cubic-bezier()')).toThrow('Unsupported or invalid easing function');
        expect(() => assertSupportedEasingFunction('cubic-bezier(0.25, 0.1, 0.25)')).toThrow('Unsupported or invalid easing function');
        // Negative x1 (regex only allows non-negative for x1 and x2)
        expect(() => assertSupportedEasingFunction('cubic-bezier(-1, 0, 0, 1)')).toThrow('Unsupported or invalid easing function');
        // Non-numeric
        expect(() => assertSupportedEasingFunction('cubic-bezier(abc, 0, 0, 1)')).toThrow('Unsupported or invalid easing function');
    });
});

describe('DeferredStringTemplate / $', () => {
    it('formats a template with a single substitution', () => {
        const tpl = $`Hello ${0}!`;
        expect(tpl.format('World')).toBe('Hello World!');
    });

    it('formats a template with multiple substitutions', () => {
        const tpl = $`${0} + ${1} = ${2}`;
        expect(tpl.format('a', 'b', 'c')).toBe('a + b = c');
    });

    it('formats a template with repeated substitution index', () => {
        const tpl = $`${0} and ${0} again`;
        expect(tpl.format('foo')).toBe('foo and foo again');
    });

    it('throws in constructor for non-integer substitution index', () => {
        expect(() => $`${1.5 as any}`).toThrow('Indices must be positive integers');
    });

    it('throws in constructor for negative substitution index', () => {
        expect(() => $`${-1 as any}`).toThrow('Indices must be positive integers');
    });

    it('DeferredStringTemplate.format converts args to string via toString()', () => {
        const tpl = $`value: ${0}`;
        expect(tpl.format(42)).toBe('value: 42');
    });

    it('handles template with no substitutions', () => {
        const tpl = $`no substitutions`;
        expect(tpl.format()).toBe('no substitutions');
    });
});
