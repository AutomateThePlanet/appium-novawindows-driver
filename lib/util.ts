import { errors } from '@appium/base-driver';

const SupportedEasingFunctions = Object.freeze([
    'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
]);

export function assertSupportedEasingFunction(value: string) {
    const cubicBezierRegex = /^cubic-bezier\(\s*(0|1|0?\.\d+|\d+(\.\d+)?)\s*,\s*(-?0|-?1|-?0?\.\d+|-?\d+(\.\d+)?)\s*,\s*(0|1|0?\.\d+|\d+(\.\d+)?)\s*,\s*(-?0|-?1|-?0?\.\d+|-?\d+(\.\d+)?)\s*\)$/;
    if (!SupportedEasingFunctions.includes(value) && !cubicBezierRegex.test(value)) {
        throw new errors.InvalidArgumentError(`Unsupported or invalid easing function '${value}' in appium:smoothPointerMove capability.`
            + `Supported functions are [${SupportedEasingFunctions.join[', ']}, cubic-bezier(x1,y1,x2,y2)].`);
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

export function $(literals: TemplateStringsArray, ...substitutions: number[]) {
    substitutions.forEach((index) => {
        if (!Number.isInteger(index) && index < 0) {
            throw new errors.InvalidArgumentError(`Indices must be positive integers starting from 0. Received: ${index}`);
        }
    });

    return new DeferredStringTemplate(literals, substitutions);
}

export class DeferredStringTemplate {
    private literals: TemplateStringsArray;
    private substitutions: number[];

    constructor(literals: TemplateStringsArray, substitutions: number[]) {
        this.literals = literals;
        this.substitutions = substitutions;

        substitutions.forEach((index) => {
            if (!Number.isInteger(index) || index < 0) {
                throw new errors.InvalidArgumentError(`Indices must be positive integers starting from 0. Received: ${index}`);
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format(...args: any[]): string {
        const out: string[] = [];
        for (let i = 0, k = 0; i < this.literals.length; i++, k++) {
            out[k] = this.literals[i];
            out[++k] = args[this.substitutions[i]]?.toString();
        }
        return out.join('');
    }
}