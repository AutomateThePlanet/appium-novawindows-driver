import type { ConditionDto } from './protocol';

/**
 * Builder functions for creating ConditionDto objects.
 * These replace the PSObject-based condition classes when building conditions
 * directly (without going through the `-windows uiautomation` converter).
 */

export function propertyCondition(property: string, value: unknown): ConditionDto {
    // Strip trailing 'Property' suffix and normalize casing
    if (property.toLowerCase().endsWith('property')) {
        property = property.slice(0, -8);
    }

    // Normalize common property names to match C# server expectations
    const propertyMap: Record<string, string> = {
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
        'labeledby': 'LabeledBy',
        'clickablepoint': 'ClickablePoint',
        'boundingrectangle': 'BoundingRectangle',
        'culture': 'Culture',
        'isdialog': 'IsDialog',
        'sizeofset': 'SizeOfSet',
        'positioninset': 'PositionInSet',
    };

    const normalized = propertyMap[property.toLowerCase()] ?? property;

    return { type: 'property', property: normalized, value };
}

export function andCondition(...conditions: ConditionDto[]): ConditionDto {
    return { type: 'and', conditions };
}

export function orCondition(...conditions: ConditionDto[]): ConditionDto {
    return { type: 'or', conditions };
}

export function notCondition(condition: ConditionDto): ConditionDto {
    return { type: 'not', condition };
}

export function trueCondition(): ConditionDto {
    return { type: 'true' };
}

export function falseCondition(): ConditionDto {
    return { type: 'false' };
}
