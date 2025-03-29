import { errors } from '@appium/base-driver';
import { $ } from '../util';
import { PSObject } from './core';
import {
    Property,
    CultureInfoProperty,
    AutomationHeadingLevelProperty,
    PointProperty,
    ControlTypeProperty,
    AutomationElementProperty,
    OrientationTypeProperty,
    RectProperty,
    Int32Property,
    Int32ArrayProperty,
    StringProperty,
    BooleanProperty,
    OrientationType,
    AutomationHeadingLevel,
} from './types';
import {
    PSAutomationElement,
    PSAutomationHeadingLevel,
    PSBoolean,
    PSControlType,
    PSCultureInfo,
    PSInt32,
    PSInt32Array,
    PSOrientationType,
    PSPoint,
    PSRect,
    PSString,
} from './common';

const PROPERTY_CONDITION = $ /* ps1 */ `[PropertyCondition]::new([AutomationElement]::${0}Property, ${1})`;
const AND_CONDITION = $ /* ps1 */ `[AndCondition]::new(${0})`;
const OR_CONDITION = $ /* ps1 */ `[OrCondition]::new(${0})`;
const NOT_CONDITION = $ /* ps1 */ `[NotCondition]::new(${0})`;
const TRUE_CONDITION = /* ps1 */ `[Condition]::TrueCondition`;
const FALSE_CONDITION = /* ps1 */ `[Condition]::FalseCondition`;

export abstract class Condition extends PSObject {
    constructor(command: string) {
        super(command);
    }
}

export class PropertyCondition extends Condition {
    constructor(property: Property, value: PSObject) {
        property = property.toLowerCase().endsWith('property') ? property.slice(0, property.length - 8) as Property : property;

        if (Object.values(BooleanProperty).includes(property as BooleanProperty)) {
            assertPSObjectType(value, PSBoolean);
        }

        if (Object.values(Int32Property).includes(property as Int32Property)) {
            assertPSObjectType(value, PSInt32);
        }

        if (Object.values(StringProperty).includes(property as StringProperty)) {
            assertPSObjectType(value, PSString);
        }

        if (Object.values(Int32ArrayProperty).includes(property as Int32ArrayProperty)) {
            assertPSObjectType(value, PSInt32Array);
        }

        if (Object.values(PointProperty).includes(property as PointProperty)) {
            assertPSObjectType(value, PSPoint);
        }

        if (Object.values(RectProperty).includes(property as RectProperty)) {
            assertPSObjectType(value, PSRect);
        }

        if (Object.values(ControlTypeProperty).includes(property as ControlTypeProperty)) {
            assertPSObjectType(value, PSControlType);
        }

        if (Object.values(AutomationElementProperty).includes(property as AutomationElementProperty)) {
            assertPSObjectType(value, PSAutomationElement);
        }

        if (Object.values(OrientationTypeProperty).includes(property as OrientationTypeProperty)) {
            try {
                assertPSObjectType(value, PSOrientationType);
            } catch (e) {
                if (value instanceof PSAutomationHeadingLevel && value.originalValue.toLowerCase() === AutomationHeadingLevel.NONE) {
                    value = new PSOrientationType(OrientationType.NONE);
                } else if (!(value instanceof PSInt32) || Number(value.toString()) < 0 || Number(value.toString()) >= Object.keys(AutomationHeadingLevel).length) {
                    throw e;
                }
            }
        }

        if (Object.values(AutomationHeadingLevelProperty).includes(property as AutomationHeadingLevelProperty)) {
            try {
                assertPSObjectType(value, PSAutomationHeadingLevel);
            } catch (e) {
                if (value instanceof PSOrientationType && value.originalValue.toLowerCase() === OrientationType.NONE) {
                    value = new PSAutomationHeadingLevel(AutomationHeadingLevel.NONE);
                } else if (!(value instanceof PSInt32) || Number(value.toString()) < 0 || Number(value.toString()) >= Object.keys(OrientationType).length) {
                    throw e;
                }
            }
        }

        if (Object.values(CultureInfoProperty).includes(property as CultureInfoProperty)) {
            assertPSObjectType(value, PSCultureInfo);
        }

        super(PROPERTY_CONDITION.format(property, value));
    }
}

export class AndCondition extends Condition {
    constructor(...conditions: Condition[]) {
        if (!conditions.every((arg) => arg instanceof Condition)) {
            throw new errors.InvalidArgumentError(`AndCondition expects Conditions as args but received ${(conditions.find((x) => !(x instanceof Condition)) as unknown)?.constructor.name}.`);
        }

        if (conditions.length < 2) {
            throw new errors.InvalidArgumentError(`AndCondition must have at least 2 conditions, but received ${conditions.length}.`);
        }

        super(AND_CONDITION.format(conditions.join(', ')));
    }
}

export class OrCondition extends Condition {
    constructor(...conditions: Condition[]) {
        if (!conditions.every((arg) => arg instanceof Condition)) {
            throw new errors.InvalidArgumentError(`OrCondition expects Conditions as args but received ${(conditions.find((x) => !(x instanceof Condition)) as unknown)?.constructor.name}.`);
        }

        if (conditions.length < 2) {
            throw new errors.InvalidArgumentError(`OrCondition must have at least 2 conditions, but received ${conditions.length}.`);
        }

        super(OR_CONDITION.format(conditions.join(', ')));
    }
}

export class NotCondition extends Condition {
    constructor(condition: Condition) {
        if (!(condition instanceof Condition)) {
            throw new errors.InvalidArgumentError(`AndCondition expects Conditions as args but received ${(condition as unknown)?.constructor.name}.`);
        }

        super(NOT_CONDITION.format(condition));
    }
}

export class TrueCondition extends Condition {
    constructor() {
        super(TRUE_CONDITION);
    }
}

export class FalseCondition extends Condition {
    constructor() {
        super(FALSE_CONDITION);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertPSObjectType(obj: PSObject, type: new (...args: any[]) => PSObject) {
    if (!(obj instanceof type)) {
        throw new errors.InvalidArgumentError(`Property expected type ${type.name} but got ${(obj as object)?.constructor.name}.`);
    }
}