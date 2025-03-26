import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { Element, Position, Rect } from '@appium/types';
import {
    AutomationHeadingLevel,
    ControlType,
    ExtraControlType,
    OrientationType,
} from './types';
import { FoundAutomationElement } from './elements';
import { PSObject } from './core';

export class PSString extends PSObject {
    constructor(value: string) {
        const escapedUnicodeString = value.split('')
            .map((c) => /* ps1 */ `$([char]0x${c.charCodeAt(0).toString(16).padStart(4, '0')})`)
            .join('');
        super(`"${escapedUnicodeString}"`);
    }
}

export class PSBoolean extends PSObject {
    constructor(value: boolean) {
        if (typeof value !== 'boolean') {
            throw new errors.InvalidArgumentError(`PSBoolean accepts only boolean in the constructor, but got '${value}'.`);
        }
        super(value ? /* ps1 */ `$true` : /* ps1 */ `$false`);
    }
}

export class PSInt32 extends PSObject {
    constructor(value: number) {
        if (!Number.isInteger(value)) {
            throw new errors.InvalidArgumentError(`PSInt32 accepts only integer values in the constructor, but got '${value}'.`);
        }
        super(value.toString());
    }
}

export class PSInt32Array extends PSObject {
    constructor(value: number[]) {
        if (!(Array.isArray(value) && value.every(Number.isInteger))) {
            throw new errors.InvalidArgumentError(`PSInt32Array accepts only array of integers in the constructor, but got ${Array.isArray(value) ? `[${value}]` : `'${value}'`}.`);
        }

        super(/* ps1 */ `[int32[]] @(${value.join(', ')})`);
    }
}

export class PSAutomationHeadingLevel extends PSObject {
    readonly originalValue: string;

    constructor(value: string) {
        if (!Object.values(AutomationHeadingLevel).includes(value.toLowerCase() as AutomationHeadingLevel)) {
            throw new errors.InvalidArgumentError(`PSAutomationHeadingLevel accepts valid AutomationHeadingLevel enum value in the constructor, but got '${value}'.`);
        }

        super(/* ps1 */ `[AutomationHeadingLevel]::${value}`);
        this.originalValue = value;
    }
}

export class PSOrientationType extends PSObject {
    readonly originalValue: string;

    constructor(value: string) {
        if (!Object.values(OrientationType).includes(value.toLowerCase() as OrientationType)) {
            throw new errors.InvalidArgumentError(`PSOrientationType accepts valid OrientationType enum value in the constructor, but got '${value}'.`);
        }

        super(/* ps1 */ `[OrientationType]::${value}`);
        this.originalValue = value;
    }
}

export class PSControlType extends PSObject {
    constructor(value: string) {
        if (![...Object.values(ControlType), ...Object.values(ExtraControlType)].includes(value.toLowerCase() as ControlType)) {
            throw new errors.InvalidArgumentError(`PSControlType accepts a valid ControlType in the constructor, but got '${value}'.`);
        }

        if (ExtraControlType.SEMANTIC_ZOOM === value.toLowerCase()) {
            super('semantic zoom');
            return;
        }

        if (ExtraControlType.APP_BAR === value.toLowerCase()) {
            super('app bar');
            return;
        }

        super(/* ps1 */ `[ControlType]::${value}`);
    }
}

export class PSPoint extends PSObject {
    constructor(value: Position) {
        const requiredFields = ['x', 'y'];
        if (!(Object.keys(value).every(requiredFields.includes) && typeof value.x === 'number' && typeof value.y === 'number')) {
            throw new errors.InvalidArgumentError('PSPoint accepts a Position object { x: number, y: number } in the constructor.');
        }

        super(/* ps1 */ `[System.Windows.Point]::new(${value.x}, ${value.y})`);
    }
}

export class PSRect extends PSObject {
    constructor(value: Rect) {
        const requiredFields = ['x', 'y', 'width', 'height'];
        if (!(Object.keys(value).every(requiredFields.includes) && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.width === 'number' && typeof value.height === 'number')) {
            throw new errors.InvalidArgumentError('PSRect accepts a Rect object { x: number, y: number, width: number, height: number } in the constructor.');
        }

        super(/* ps1 */ `[System.Windows.Rect]::new(${value.x}, ${value.y}, ${value.width}, ${value.height})`);
    }
}

export class PSAutomationElement extends PSObject {
    constructor(value: Element) {
        if (!value[W3C_ELEMENT_KEY]) {
            throw new errors.InvalidArgumentError('PSAutomationElement accepts a valid Appium Element in the constructor.');
        }

        super(new FoundAutomationElement(value[W3C_ELEMENT_KEY]).toString());
    }
}

export class PSCultureInfo extends PSObject {
    constructor(name: string, useUserOverride?: boolean)
    constructor(culture: number, useUserOverride?: boolean)
    constructor(nameOrCulture: string | number, useUserOverride?: boolean) {
        if (typeof nameOrCulture !== 'string' || (typeof nameOrCulture === 'number' && nameOrCulture < 0)) {
            throw new errors.InvalidArgumentError('PSCultureInfo accepts a string or positive integer value in the constructor.');
        }

        super(/* ps1 */ `[System.Globalization.CultureInfo]::new(${typeof nameOrCulture === 'string' ? `'${nameOrCulture}'` : nameOrCulture}${useUserOverride !== undefined ? `$${useUserOverride}` : ''})`);
    }
}