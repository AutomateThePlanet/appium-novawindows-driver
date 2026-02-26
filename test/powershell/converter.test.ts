/**
 * Unit tests for lib/powershell/converter.ts (convertStringToCondition)
 */
import { describe, it, expect } from 'vitest';
import { convertStringToCondition } from '../../lib/powershell/converter';
import {
    PropertyCondition,
    AndCondition,
    OrCondition,
    NotCondition,
    TrueCondition,
    FalseCondition,
} from '../../lib/powershell/conditions';

describe('convertStringToCondition', () => {
    describe('TrueCondition / FalseCondition', () => {
        it('parses PropertyCondition TrueCondition', () => {
            // The TRUE_CONDITION_REGEX matches [PropertyCondition]::TrueCondition
            const condition = convertStringToCondition('[PropertyCondition]::TrueCondition');
            expect(condition).toBeInstanceOf(TrueCondition);
        });

        it('parses PropertyCondition FalseCondition', () => {
            const condition = convertStringToCondition('[PropertyCondition]::FalseCondition');
            expect(condition).toBeInstanceOf(FalseCondition);
        });

        it('parses Automation.RawViewCondition as TrueCondition', () => {
            const condition = convertStringToCondition('[Automation]::RawViewCondition');
            expect(condition).toBeInstanceOf(TrueCondition);
        });
    });

    describe('PropertyCondition', () => {
        it('parses name property condition with string value', () => {
            const condition = convertStringToCondition(
                "[PropertyCondition]::new([AutomationElement]::NameProperty, 'Calculator')"
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });

        it('parses integer property condition (native window handle)', () => {
            const condition = convertStringToCondition(
                '[PropertyCondition]::new([AutomationElement]::NativeWindowHandleProperty, 12345)'
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });

        it('parses control type property condition', () => {
            const condition = convertStringToCondition(
                '[PropertyCondition]::new([AutomationElement]::ControlTypeProperty, [ControlType]::Button)'
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });

        it('parses automation id property condition', () => {
            const condition = convertStringToCondition(
                "[PropertyCondition]::new([AutomationElement]::AutomationIdProperty, 'btn_ok')"
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });

        it('throws for unknown property name', () => {
            expect(() =>
                convertStringToCondition(
                    "[PropertyCondition]::new([AutomationElement]::UnknownProp, 'value')"
                )
            ).toThrow();
        });
    });

    describe('AndCondition', () => {
        it('parses AND condition with two property conditions', () => {
            const condition = convertStringToCondition(
                "[AndCondition]::new([PropertyCondition]::new([AutomationElement]::NameProperty, 'Calc'), [PropertyCondition]::new([AutomationElement]::NameProperty, 'Test'))"
            );
            expect(condition).toBeInstanceOf(AndCondition);
        });

        it('parses AND condition with three conditions', () => {
            const condition = convertStringToCondition(
                "[AndCondition]::new([PropertyCondition]::new([AutomationElement]::NameProperty, 'A'), [PropertyCondition]::new([AutomationElement]::NameProperty, 'B'), [PropertyCondition]::new([AutomationElement]::NameProperty, 'C'))"
            );
            expect(condition).toBeInstanceOf(AndCondition);
        });
    });

    describe('OrCondition', () => {
        it('parses OR condition', () => {
            const condition = convertStringToCondition(
                "[OrCondition]::new([PropertyCondition]::new([AutomationElement]::NameProperty, 'A'), [PropertyCondition]::new([AutomationElement]::NameProperty, 'B'))"
            );
            expect(condition).toBeInstanceOf(OrCondition);
        });
    });

    describe('NotCondition', () => {
        it('parses NOT condition', () => {
            const condition = convertStringToCondition(
                "[NotCondition]::new([PropertyCondition]::new([AutomationElement]::NameProperty, 'test'))"
            );
            expect(condition).toBeInstanceOf(NotCondition);
        });
    });

    describe('ControlView / ContentView conditions', () => {
        it('parses ControlViewCondition as NotCondition', () => {
            const condition = convertStringToCondition('[Automation]::ControlViewCondition');
            expect(condition).toBeInstanceOf(NotCondition);
        });

        it('parses ContentViewCondition as NotCondition', () => {
            const condition = convertStringToCondition('[Automation]::ContentViewCondition');
            expect(condition).toBeInstanceOf(NotCondition);
        });
    });

    describe('integer array property condition', () => {
        it('parses runtime id condition with integer array', () => {
            const condition = convertStringToCondition(
                '[PropertyCondition]::new([AutomationElement]::RuntimeIdProperty, [int32[]] @(1, 2, 3))'
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });
    });

    describe('error handling', () => {
        it('throws for an unrecognized selector', () => {
            expect(() => convertStringToCondition('not a valid selector')).toThrow();
        });

        it('throws for empty string', () => {
            expect(() => convertStringToCondition('')).toThrow();
        });

        it('throws when result is not a Condition', () => {
            // A plain integer is not a Condition
            expect(() => convertStringToCondition('42')).toThrow();
        });
    });

    describe('string value handling', () => {
        it('handles escaped single quotes in string values', () => {
            const condition = convertStringToCondition(
                "[PropertyCondition]::new([AutomationElement]::NameProperty, 'it''s')"
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });

        it('handles string with special characters', () => {
            const condition = convertStringToCondition(
                "[PropertyCondition]::new([AutomationElement]::NameProperty, 'hello world')"
            );
            expect(condition).toBeInstanceOf(PropertyCondition);
        });
    });
});
