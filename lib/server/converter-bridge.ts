import type { ConditionDto } from './protocol';
import { Condition, PropertyCondition, AndCondition, OrCondition, NotCondition, TrueCondition, FalseCondition } from '../powershell/conditions';
import { PSObject } from '../powershell/core';
import { PSString, PSBoolean, PSInt32, PSInt32Array, PSControlType, PSOrientationType, PSAutomationHeadingLevel } from '../powershell/common';
import { ControlType, ExtraControlType, Property } from '../powershell/types';

/**
 * Converts a PSObject-based Condition (used by the `-windows uiautomation` converter)
 * into a ConditionDto (JSON object for the C# server).
 *
 * This bridge allows the existing converter.ts to work unchanged while
 * producing output compatible with the new server protocol.
 */
export function conditionToDto(condition: Condition): ConditionDto {
    // We need to examine the toString() output to determine the structure,
    // since the existing Condition classes only store their PS command strings.
    // Instead, we'll use instanceof checks and reconstruct.

    if (condition instanceof TrueCondition) {
        return { type: 'true' };
    }

    if (condition instanceof FalseCondition) {
        return { type: 'false' };
    }

    // For PropertyCondition, AndCondition, OrCondition, NotCondition
    // we need to inspect their internal PS command strings.
    // This is fragile, so let's add internal metadata to the classes instead.

    // Since we can't easily add fields to existing classes without modifying them,
    // and we want to keep the powershell module unchanged for now,
    // let's use a different approach: attach DTO metadata via a WeakMap.
    const dto = conditionDtoMap.get(condition);
    if (dto) {
        return dto;
    }

    // Fallback: if no metadata, this is a condition created without registration
    throw new Error(`Cannot convert condition to DTO: no metadata registered. Condition: ${condition.toString().substring(0, 100)}`);
}

/**
 * WeakMap to associate Condition PSObjects with their DTO representation.
 * Conditions register themselves here when created through our enhanced constructors.
 */
export const conditionDtoMap = new WeakMap<Condition, ConditionDto>();

// Patch the condition constructors to register DTO metadata.
// This is done by wrapping the constructors.

const OriginalPropertyCondition = PropertyCondition;
const OriginalAndCondition = AndCondition;
const OriginalOrCondition = OrCondition;
const OriginalNotCondition = NotCondition;
const OriginalTrueCondition = TrueCondition;
const OriginalFalseCondition = FalseCondition;

/**
 * Register a PropertyCondition's DTO metadata based on its constructor arguments.
 */
export function registerPropertyCondition(condition: Condition, property: string, value: PSObject): void {
    // Normalize property name
    let normalizedProperty = property.toLowerCase();
    if (normalizedProperty.endsWith('property')) {
        normalizedProperty = normalizedProperty.slice(0, -8);
    }

    const propertyNameMap: Record<string, string> = {
        'automationid': 'AutomationId',
        'name': 'Name',
        'classname': 'ClassName',
        'controltype': 'ControlType',
        'runtimeid': 'RuntimeId',
        'nativewindowhandle': 'NativeWindowHandle',
        'processid': 'ProcessId',
        'isenabled': 'IsEnabled',
        'isoffscreen': 'IsOffscreen',
        'iskeyboardfocusable': 'IsKeyboardFocusable',
        'haskeyboardfocus': 'HasKeyboardFocus',
        'iscontrolelement': 'IsControlElement',
        'iscontentelement': 'IsContentElement',
        'ispassword': 'IsPassword',
        'isrequiredforform': 'IsRequiredForForm',
        'itemstatus': 'ItemStatus',
        'itemtype': 'ItemType',
        'localizedcontroltype': 'LocalizedControlType',
        'acceleratorkey': 'AcceleratorKey',
        'accesskey': 'AccessKey',
        'helptext': 'HelpText',
        'frameworkid': 'FrameworkId',
        'orientation': 'Orientation',
        'headinglevel': 'HeadingLevel',
        'culture': 'Culture',
        'clickablepoint': 'ClickablePoint',
        'boundingrectangle': 'BoundingRectangle',
        'isdialog': 'IsDialog',
        'sizeofset': 'SizeOfSet',
        'positioninset': 'PositionInSet',
        'labeledby': 'LabeledBy',
    };

    const mappedProperty = propertyNameMap[normalizedProperty] ?? property;

    // Extract the actual value from PS wrapper
    let dtoValue: unknown;
    if (value instanceof PSString) {
        // PSString wraps with Unicode escape chars - extract the original
        // The toString() output is like `"$([char]0x0048)$([char]0x0065)..."` - not useful
        // We need the original value. Since PSString encodes chars, we need to decode.
        const psStr = value.toString();
        // Match all $([char]0xHHHH) patterns and decode
        const charMatches = psStr.matchAll(/\$\(\[char\]0x([0-9a-fA-F]+)\)/g);
        let decoded = '';
        for (const match of charMatches) {
            decoded += String.fromCharCode(parseInt(match[1], 16));
        }
        dtoValue = decoded || psStr.replace(/^"|"$/g, '');
    } else if (value instanceof PSBoolean) {
        dtoValue = value.toString() === '$true';
    } else if (value instanceof PSInt32) {
        dtoValue = Number(value.toString());
    } else if (value instanceof PSInt32Array) {
        // Format: [int32[]] @(1, 2, 3)
        const match = value.toString().match(/@\(([^)]+)\)/);
        if (match) {
            dtoValue = match[1].split(',').map((x) => Number(x.trim()));
        }
    } else if (value instanceof PSControlType) {
        // ControlType value - extract the name
        const match = value.toString().match(/\[ControlType\]::(\w+)/);
        if (match) {
            dtoValue = match[1];
        } else {
            // ExtraControlType (semantic zoom, app bar) - use as-is for localized control type
            dtoValue = value.toString();
        }
    } else if (value instanceof PSOrientationType) {
        const match = value.toString().match(/\[OrientationType\]::(\w+)/);
        dtoValue = match?.[1] ?? value.toString();
    } else if (value instanceof PSAutomationHeadingLevel) {
        const match = value.toString().match(/\[AutomationHeadingLevel\]::(\w+)/);
        dtoValue = match?.[1] ?? value.toString();
    } else {
        dtoValue = value.toString();
    }

    conditionDtoMap.set(condition, {
        type: 'property',
        property: mappedProperty,
        value: dtoValue,
    });
}

export function registerAndCondition(condition: Condition, ...conditions: Condition[]): void {
    conditionDtoMap.set(condition, {
        type: 'and',
        conditions: conditions.map(conditionToDto),
    });
}

export function registerOrCondition(condition: Condition, ...conditions: Condition[]): void {
    conditionDtoMap.set(condition, {
        type: 'or',
        conditions: conditions.map(conditionToDto),
    });
}

export function registerNotCondition(condition: Condition, inner: Condition): void {
    conditionDtoMap.set(condition, {
        type: 'not',
        condition: conditionToDto(inner),
    });
}

export function registerTrueCondition(condition: Condition): void {
    conditionDtoMap.set(condition, { type: 'true' });
}

export function registerFalseCondition(condition: Condition): void {
    conditionDtoMap.set(condition, { type: 'false' });
}
