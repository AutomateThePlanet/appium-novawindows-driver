import { errors } from '@appium/base-driver';

import {
    FunctionName,
    ExprNode,
    BOOLEAN,
    CONCAT,
    CONTAINS,
    COUNT,
    FALSE,
    ROUND,
    CEILING,
    FLOOR,
    ID,
    LAST,
    LOCAL_NAME,
    NAME,
    NORMALIZE_SPACE,
    NOT,
    POSITION,
    STARTS_WITH,
    STRING_LENGTH,
    NUMBER,
    STRING,
    SUBSTRING_AFTER,
    SUBSTRING_BEFORE,
    SUBSTRING,
    SUM,
    TRANSLATE,
    TRUE
} from 'xpath-analyzer';

import { $ } from '../util';
import { processExprNode } from './core';
import { propertyCondition } from '../server/conditions';

type SendCommandFn = (method: string, params: Record<string, unknown>) => Promise<unknown>;

// XPath element type matching core.ts
interface XPathElement {
    type: 'root' | 'found';
    elementId?: string;
}

function isXPathElement(value: unknown): value is XPathElement {
    return typeof value === 'object' && value !== null && 'type' in value && ((value as any).type === 'root' || (value as any).type === 'found');
}

function foundElement(elementId: string): XPathElement {
    return { type: 'found', elementId };
}

const FUNCTION_ARGUMENT_ERROR = $`Function ${0}() requires ${1}.`;

export async function handleFunctionCall<T>(name: FunctionName, context: XPathElement, sendCommand: SendCommandFn, ...args: ExprNode[]): Promise<T[]> {
    const processArgs = async <T>(...args: ExprNode[]): Promise<T[][]> => {
        const results: T[][] = [];
        for (const arg of args) {
            results.push(await processExprNode(arg, context, sendCommand));
        }
        return results;
    };

    switch (name) {
        case NOT:
        case BOOLEAN: {
            if (args.length !== 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 1 argument'));
            }
            const [resultArray] = await processArgs(args[0]);
            const result = Boolean(resultArray[0]);
            return [name === NOT ? !result as T : result as T];
        }
        case CONCAT: {
            if (args.length < 2) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'at least 2 arguments'));
            }
            const resultArrays = await processArgs(...args);
            if (resultArrays.some((resultArray) => resultArray.length > 1)) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            const stringArray = convertProcessedExprNodesToStrings(...resultArrays.map((resultArray) => resultArray[0]));
            return [String.prototype.concat(...stringArray) as T];
        }
        case STARTS_WITH:
        case CONTAINS: {
            if (args.length !== 2) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 2 arguments'));
            }
            const [firstArgResult, secondArgResult] = await processArgs<string | boolean | XPathElement>(args[0], args[1]);
            if (firstArgResult.length > 1 || secondArgResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            const [lhs] = firstArgResult;
            const [rhs] = secondArgResult;
            if (typeof lhs === 'boolean') {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be string, number or element'));
            }
            if (typeof rhs === 'boolean') {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the second argument to be string, number or element'));
            }
            const stringMethodMap = {
                [STARTS_WITH]: 'startsWith',
                [CONTAINS]: 'includes',
            } as const satisfies Record<typeof name, keyof string>;
            const [lhsString, rhsString] = convertProcessedExprNodesToStrings(firstArgResult, secondArgResult);
            return [lhsString[stringMethodMap[name]](rhsString) as T];
        }
        case COUNT: {
            if (args.length !== 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 1 argument'));
            }
            const resultArray = await processArgs(args[0]);
            return [resultArray.length as T];
        }
        case TRUE:
        case FALSE:
            if (args.length > 0) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'to have 0 arguments'));
            }
            return [name === TRUE ? true as T : false as T];
        case ROUND:
        case CEILING:
        case FLOOR: {
            if (args.length !== 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 1 argument'));
            }
            const resultArray = await processArgs(args[0]);
            const [num] = resultArray[0];
            if (typeof num !== 'number') {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be a number'));
            }
            const mathMethodMap = {
                [ROUND]: 'round',
                [FLOOR]: 'floor',
                [CEILING]: 'ceil',
            } as const satisfies Record<typeof name, keyof Math>;
            return [Math[mathMethodMap[name]](num) as T];
        }
        case ID: {
            if (args.length !== 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 1 argument'));
            }
            const resultArray = await processArgs(args[0]);
            const stringArray = convertProcessedExprNodesToStrings(...resultArray);
            const ids = Array.from(new Set(stringArray.flatMap((string) => string.split(/\s+/))));
            const results: XPathElement[] = [];
            for (const id of ids) {
                const elId = await sendCommand('findElement', {
                    scope: 'subtree',
                    condition: propertyCondition('RuntimeId', id.split('.').map(Number)),
                    contextElementId: null,
                }) as string | null;
                if (elId) {
                    results.push(foundElement(elId));
                }
            }
            return results as T[];
        }
        case POSITION:
        case LAST: {
            if (args.length > 0) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'to have 0 arguments'));
            }
            // Get element count for the context
            const contextId = context.type === 'found' ? context.elementId : null;
            const rootId = contextId ?? await sendCommand('saveRootElementToTable', {}) as string;
            // For LAST/POSITION, we need the number of sibling elements
            // This returns the count based on the context
            const elIds = await sendCommand('findElements', {
                scope: 'children',
                condition: { type: 'true' },
                contextElementId: contextId,
            }) as string[];
            const lastElementIndex = (elIds ?? []).length;
            return name === LAST ? [lastElementIndex as T] : Array.from({ length: lastElementIndex }, () => 0 as T);
        }
        case LOCAL_NAME:
        case NAME: {
            if (args.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'no more than 1 argument'));
            }
            const [argResult] = await processArgs<XPathElement>(args[0]);
            if (argResult && argResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            const [element] = argResult ?? [context];
            if (!isXPathElement(element)) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be element'));
            }
            const elId = element.type === 'found' ? element.elementId! : await sendCommand('saveRootElementToTable', {}) as string;
            const result = await sendCommand('getTagName', { elementId: elId }) as string;
            return [result as T];
        }
        case NORMALIZE_SPACE: {
            if (args.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'no more than 1 argument'));
            }
            const [argResult] = await processArgs<XPathElement | string>(args[0]);
            if (argResult && argResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            if (!argResult[0] || isXPathElement(argResult[0])) {
                return ['' as T];
            }
            if (typeof argResult[0] === 'string') {
                return [argResult[0].trim().replace(/\s+/g, ' ') as T];
            }
            throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be string or element'));
        }
        case STRING_LENGTH: {
            if (args.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'no more than 1 argument'));
            }
            const [argResult] = await processArgs<XPathElement | string>(args[0]);
            if (argResult && argResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to have either one or zero elements'));
            }
            if (!argResult[0] || isXPathElement(argResult[0])) {
                return [0 as T];
            }
            if (typeof argResult[0] === 'string') {
                return [argResult[0].length as T];
            }
            throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be string or element'));
        }
        case TRANSLATE: {
            if (args.length !== 3) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 3 arguments'));
            }
            const [firstArgResult, secondArgResult, thirdArgResult] = await processArgs<string | XPathElement>(args[0], args[1], args[2]);
            if (firstArgResult.length > 1 || secondArgResult.length > 1 || thirdArgResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            const [[str], [from], [to]] = [firstArgResult, secondArgResult, thirdArgResult];
            if (![str, from, to].every((x) => typeof x === 'string' || isXPathElement(x))) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to be string or element'));
            }
            if (isXPathElement(str)) {return ['' as T];}
            if (isXPathElement(from)) {return [str as T];}
            const result = (str as string).split('').map((char) => {
                const index = (from as string).indexOf(char);
                return index !== -1 ? (isXPathElement(to) ? '' : (to as string))[index] ?? '' : char;
            }).join('');
            return [result as T];
        }
        case NUMBER:
        case STRING: {
            if (args.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'no more than 1 argument'));
            }
            const [firstArg] = await processArgs(args[0]);
            if (firstArg && firstArg.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to have either one or zero elements'));
            }
            return name === STRING ? [...convertProcessedExprNodesToStrings(firstArg ?? [context]) as T[]] : [...convertProcessedExprNodesToNumbers(firstArg ?? [context]) as T[]];
        }
        case SUBSTRING_AFTER:
        case SUBSTRING_BEFORE: {
            if (args.length !== 2) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 2 arguments'));
            }
            const [firstArgResult, secondArgResult] = await processArgs<string | boolean | XPathElement>(args[0], args[1]);
            if (firstArgResult.length > 1 || secondArgResult.length > 1) {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'each argument to have either one or zero elements'));
            }
            const [lhs] = firstArgResult;
            const [rhs] = secondArgResult;
            if (typeof lhs === 'boolean') {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be string, number or element'));}
            if (typeof rhs === 'boolean') {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the second argument to be string, number or element'));}
            const [firstString] = convertProcessedExprNodesToStrings(firstArgResult);
            const [secondString] = convertProcessedExprNodesToStrings(secondArgResult);
            const index = firstString.indexOf(secondString);
            if (index === -1) {return ['' as T];}
            return name === SUBSTRING_BEFORE ? [firstString.slice(0, index) as T] : [firstString.slice(index + 1) as T];
        }
        case SUBSTRING: {
            if (args.length < 2) {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'at least 2 arguments'));}
            if (args.length > 3) {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'no more than 3 arguments'));}
            const [stringArg, fromArg, countArg] = await processArgs(...args);
            if (typeof stringArg[0] === 'boolean' || typeof stringArg[0] === 'number') {
                throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the first argument to be string or element'));
            }
            const [string] = convertProcessedExprNodesToStrings(stringArg);
            const [indexVal] = fromArg;
            const [count] = countArg;
            if (typeof indexVal !== 'number') {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the second argument to be number'));}
            if (typeof count !== 'number' && typeof count !== 'undefined') {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'the second argument to be number'));}
            if (count && count < 0) {return ['' as T];}
            return [string.slice(indexVal + 1, count ? indexVal + count : string.length) as T];
        }
        case SUM: {
            if (args.length !== 1) {throw new errors.InvalidArgumentError(FUNCTION_ARGUMENT_ERROR.format(name, 'exactly 1 argument'));}
            const [arg] = await processArgs(args[0]);
            const argAsNumbers = convertProcessedExprNodesToNumbers(arg);
            return [argAsNumbers.reduce((a, b) => a + b) as T];
        }
        default:
            throw new errors.InvalidSelectorError(`XPath function ${name}() not found.`);
    }
}

function convertProcessedExprNodesToStrings<T>(...arrayOfProcessedExprNodes: T[]): string[] {
    return arrayOfProcessedExprNodes
        .map((item) => isXPathElement(item) ? '' : item)
        .map((item) => item === undefined || item === null ? '' : String(item));
}

function convertProcessedExprNodesToNumbers<T>(...arrayOfProcessedExprNodes: T[]): number[] {
    const arrayOfStrings = convertProcessedExprNodesToStrings(...arrayOfProcessedExprNodes);
    return arrayOfStrings.map((str) => /^\s*(?<![\d.+-])[+-]?(?:\d*[.])?\d+(?![\d.])\s*$/.test(str) ? Number(str) : NaN);
}
