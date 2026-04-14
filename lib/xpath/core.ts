import { Element } from '@appium/types';
import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';

import XPathAnalyzer, {
    ABSOLUTE_LOCATION_PATH,
    ADDITIVE,
    AND,
    DIVISIONAL,
    EQUALITY,
    ExprNode,
    FILTER,
    FUNCTION_CALL,
    GREATER_THAN,
    GREATER_THAN_OR_EQUAL,
    INEQUALITY,
    LAST,
    LESS_THAN,
    LESS_THAN_OR_EQUAL,
    LITERAL,
    LocationNode,
    MODULUS,
    MULTIPLICATIVE,
    NEGATION,
    NUMBER,
    OR,
    PATH,
    POSITION,
    RELATIVE_LOCATION_PATH,
    SUBTRACTIVE,
    UNION,
    StepNode,
    PROCESSING_INSTRUCTION_TEST,
    NodeTestNode,
    NODE_NAME_TEST,
    NODE_TYPE_TEST,
    NODE,
    ANCESTOR,
    ANCESTOR_OR_SELF,
    ATTRIBUTE,
    CHILD,
    DESCENDANT,
    DESCENDANT_OR_SELF,
    FOLLOWING,
    FOLLOWING_SIBLING,
    NAMESPACE,
    PARENT,
    PRECEDING,
    PRECEDING_SIBLING,
    SELF,
    BOOLEAN,
    STRING,
} from 'xpath-analyzer';

import {
    Property,
    ControlType,
    ExtraControlType,
    Int32Property,
    StringProperty,
    BooleanProperty,
} from '../powershell/types';

import { conditionToDto } from '../server/converter-bridge';
import { Condition, PropertyCondition, TrueCondition, FalseCondition, AndCondition, OrCondition } from '../powershell/conditions';
import { PSControlType, PSString, PSInt32, PSInt32Array, PSBoolean, PSOrientationType } from '../powershell/common';
import type { ConditionDto, RectResult } from '../server/protocol';
import { propertyCondition } from '../server/conditions';

import { handleFunctionCall } from './functions';

type SendCommandFn = (method: string, params: Record<string, unknown>) => Promise<unknown>;

const OptimizeLastStep = Symbol.for('LastStep');

const XPathAllowedProperties = Object.freeze([
    Property.ACCELERATOR_KEY,
    Property.ACCESS_KEY,
    Property.AUTOMATION_ID,
    Property.CLASS_NAME,
    Property.FRAMEWORK_ID,
    Property.HAS_KEYBOARD_FOCUS,
    Property.HELP_TEXT,
    Property.IS_CONTENT_ELEMENT,
    Property.IS_CONTROL_ELEMENT,
    Property.IS_ENABLED,
    Property.IS_KEYBOARD_FOCUSABLE,
    Property.IS_OFFSCREEN,
    Property.IS_PASSWORD,
    Property.IS_REQUIRED_FOR_FORM,
    Property.ITEM_STATUS,
    Property.ITEM_TYPE,
    Property.LOCALIZED_CONTROL_TYPE,
    Property.NAME,
    Property.ORIENTATION,
    Property.PROCESS_ID,
    Property.RUNTIME_ID,
] as const);

type XPathAllowedProperties = typeof XPathAllowedProperties[number];

// Element context in XPath processing
interface XPathElement {
    type: 'root' | 'found';
    elementId?: string; // undefined for root
}

function rootElement(): XPathElement {
    return { type: 'root' };
}

function foundElement(elementId: string): XPathElement {
    return { type: 'found', elementId };
}

function getContextElementId(el: XPathElement): string | null {
    return el.type === 'found' ? el.elementId! : null;
}

export async function xpathToElIdOrIds(selector: string, mult: boolean, context: string | undefined, sendCommand: SendCommandFn): Promise<Element | Element[]> {
    let parsedXPath: ExprNode;

    try {
        parsedXPath = new XPathAnalyzer(selector).parse();
    } catch (error) {
        if (error instanceof Error) {
            throw new errors.InvalidSelectorError(`Malformed XPath: ${error.message}`);
        } else {
            throw new errors.InvalidSelectorError('Malformed XPath');
        }
    }

    if (!mult) {
        if (parsedXPath.type === UNION) {
            const lhsLastStep = findLastStep(parsedXPath.lhs);
            const rhsLastStep = findLastStep(parsedXPath.rhs);
            if (lhsLastStep) {
                lhsLastStep[lhsLastStep.length - 1][OptimizeLastStep] = true;
            }
            if (rhsLastStep) {
                rhsLastStep[rhsLastStep.length - 1][OptimizeLastStep] = true;
            }
        } else {
            const lastStep = findLastStep(parsedXPath);
            if (lastStep && lastStep[lastStep.length - 1].predicates.every(predicateProcessableBeforeNode)) {
                lastStep[lastStep.length - 1][OptimizeLastStep] = true;
            }
        }
    }

    if (parsedXPath.type === 'absolute-location-path' && parsedXPath.steps[0].axis === CHILD) {
        parsedXPath.steps[0].axis = SELF;
    }

    const contextEl = context ? foundElement(context) : rootElement();
    const foundElements = await processExprNode<XPathElement>(parsedXPath, contextEl, sendCommand);
    const els = foundElements
        .filter((el): el is XPathElement => typeof el === 'object' && el !== null && 'type' in el && el.type === 'found')
        .map((el) => ({ [W3C_ELEMENT_KEY]: el.elementId! }));

    if (mult) {
        return els;
    }

    if (els.length === 0) {
        throw new errors.NoSuchElementError();
    }

    return els[0];
}

export async function processExprNode<T>(exprNode: ExprNode, context: XPathElement, sendCommand: SendCommandFn): Promise<T[]> {
    switch (exprNode.type) {
        case NUMBER:
            return [exprNode.number as T];
        case LITERAL:
            return [exprNode.string as T];
        case UNION:
            return [...await processExprNode<T>(exprNode.lhs, context, sendCommand), ...await processExprNode<T>(exprNode.rhs, context, sendCommand)];
        case FUNCTION_CALL:
            return await handleFunctionCall(exprNode.name, context, sendCommand, ...exprNode.args);
        case ABSOLUTE_LOCATION_PATH:
        case RELATIVE_LOCATION_PATH: {
            const result: T[][] = [];
            for (const element of convertToElementArray(context)) {
                result.push(await handleLocationNode(exprNode, element, sendCommand) as T[]);
            }
            return result.flat();
        }
        case PATH: {
            const filterResult = await processExprNode<T>(exprNode.filter, context, sendCommand);
            const result: T[][] = [];
            for (const item of filterResult) {
                if (isXPathElement(item)) {
                    const itemAfterSteps = await handleLocationNode({
                        type: RELATIVE_LOCATION_PATH,
                        steps: exprNode.steps,
                    }, item as XPathElement, sendCommand);
                    result.push(itemAfterSteps as T[]);
                }
            }
            return result.flat();
        }
        case FILTER: {
            const result: T[] = [];
            const exprResult = await processExprNode<T>(exprNode.primary, context, sendCommand);
            for (const item of exprResult) {
                if (isXPathElement(item)) {
                    const filteredItem = await executeStep({
                        axis: SELF,
                        test: { type: NODE_TYPE_TEST, name: NODE },
                        predicates: exprNode.predicates,
                    }, item as XPathElement, sendCommand) as T;
                    result.push(filteredItem);
                }
            }
            return result;
        }
        case OR:
        case AND: {
            const [lhs] = await handleFunctionCall<T>(BOOLEAN, context, sendCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<T>(BOOLEAN, context, sendCommand, exprNode.rhs);
            if (exprNode.type === AND) {
                return [lhs && rhs];
            } else {
                return [lhs || rhs];
            }
        }
        case NEGATION:
            return [-await handleFunctionCall<T>(NUMBER, context, sendCommand, exprNode.lhs) as T];
        case EQUALITY:
        case INEQUALITY: {
            const [lhs] = await handleFunctionCall<string>(STRING, context, sendCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<string>(STRING, context, sendCommand, exprNode.rhs);
            if (isNaN(Number(lhs)) || isNaN(Number(rhs))) {
                return [exprNode.type === EQUALITY ? (lhs === rhs) as T : (lhs !== rhs) as T];
            }
            return [exprNode.type === EQUALITY ? (Number(lhs) === Number(rhs)) as T : (Number(lhs) !== Number(rhs)) as T];
        }
        case ADDITIVE:
        case DIVISIONAL:
        case GREATER_THAN:
        case GREATER_THAN_OR_EQUAL:
        case LESS_THAN:
        case LESS_THAN_OR_EQUAL:
        case MODULUS:
        case MULTIPLICATIVE:
        case SUBTRACTIVE: {
            const [lhs] = await handleFunctionCall<number>(NUMBER, context, sendCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<number>(NUMBER, context, sendCommand, exprNode.rhs);
            switch (exprNode.type) {
                case ADDITIVE: return [(lhs + rhs) as T];
                case DIVISIONAL: return [(lhs / rhs) as T];
                case GREATER_THAN: return [(lhs > rhs) as T];
                case GREATER_THAN_OR_EQUAL: return [(lhs >= rhs) as T];
                case LESS_THAN: return [(lhs < rhs) as T];
                case LESS_THAN_OR_EQUAL: return [(lhs <= rhs) as T];
                case MODULUS: return [(lhs % rhs) as T];
                case MULTIPLICATIVE: return [(lhs * rhs) as T];
                case SUBTRACTIVE: return [(lhs - rhs) as T];
            }
        }
    }
}

async function handleLocationNode(location: LocationNode, context: XPathElement, sendCommand: SendCommandFn): Promise<XPathElement[] | string[]> {
    if (location.steps.some((step) => step.test.name === null)) {
        throw new errors.InvalidSelectorError('Expected path step expression.');
    }

    if (location.type === ABSOLUTE_LOCATION_PATH) {
        context = rootElement();
    }

    optimizeDoubleSlash(location.steps);

    for (const [index, step] of location.steps.entries()) {
        if (step.axis === ATTRIBUTE) {
            if (index === location.steps.length - 1) {
                return await convertAttributeNodeTestToStringArray(step.test, context, sendCommand);
            } else {
                return [];
            }
        }

        const result = await executeStep(step, context, sendCommand);
        if (Array.isArray(result)) {
            // Multi-element result - process remaining steps for each element
            if (index < location.steps.length - 1) {
                const combinedResults: XPathElement[] = [];
                for (const el of result) {
                    const subResults = await handleLocationNode({
                        type: RELATIVE_LOCATION_PATH,
                        steps: location.steps.slice(index + 1),
                    }, el, sendCommand);
                    combinedResults.push(...subResults as XPathElement[]);
                }
                return removeDuplicateElements(combinedResults);
            }
            context = result[0] ?? rootElement();
            return removeDuplicateElements(result);
        }
        context = result;
    }

    return convertToElementArray(context);
}

export async function processExprNodeAsPredicate(exprNode: ExprNode, context: XPathElement, positions: Set<number>, sendCommand: SendCommandFn, relativeExprNodes?: ExprNode[]): Promise<[Condition, ExprNode[]?]> {
    relativeExprNodes ??= [];
    switch (exprNode.type) {
        case NUMBER:
            return await processExprNodeAsPredicate({
                type: EQUALITY,
                lhs: { type: FUNCTION_CALL, name: POSITION, args: [] },
                rhs: { type: NUMBER, number: exprNode.number }
            }, context, positions, sendCommand, relativeExprNodes);
        case OR:
            return [new OrCondition(
                (await processExprNodeAsPredicate(exprNode.lhs, context, positions, sendCommand, relativeExprNodes))[0],
                (await processExprNodeAsPredicate(exprNode.rhs, context, positions, sendCommand, relativeExprNodes))[0]
            ), relativeExprNodes];
        case AND:
            return [new AndCondition(
                (await processExprNodeAsPredicate(exprNode.lhs, context, positions, sendCommand, relativeExprNodes))[0],
                (await processExprNodeAsPredicate(exprNode.rhs, context, positions, sendCommand, relativeExprNodes))[0]
            ), relativeExprNodes];
        case EQUALITY:
        case INEQUALITY: {
            if ((exprNode.lhs.type === RELATIVE_LOCATION_PATH) !== (exprNode.rhs.type === RELATIVE_LOCATION_PATH)) {
                if (exprNode.lhs.type === RELATIVE_LOCATION_PATH
                    && exprNode.lhs.steps[0].axis === ATTRIBUTE
                    && exprNode.lhs.steps[0].test.type === NODE_NAME_TEST
                    && XPathAllowedProperties.includes(exprNode.lhs.steps[0].test.name?.toLowerCase() as XPathAllowedProperties)
                ) {
                    const propertyName = exprNode.lhs.steps[0].test.name?.toLowerCase() as Property;
                    const [value] = await processExprNode(exprNode.rhs, context, sendCommand);
                    if (propertyName === Property.RUNTIME_ID) {
                        return [new PropertyCondition(propertyName, new PSInt32Array(String(value).split('.').map(Number))), relativeExprNodes];
                    }
                    if (propertyName === Property.ORIENTATION) {
                        return [new PropertyCondition(propertyName, new PSOrientationType(String(value))), relativeExprNodes];
                    }
                    if (Object.values(Int32Property).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSInt32(Number(value))), relativeExprNodes];
                    }
                    if (Object.values(StringProperty).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSString(String(value))), relativeExprNodes];
                    }
                    if (Object.values(BooleanProperty).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSBoolean(Boolean(value))), relativeExprNodes];
                    }
                }

                if (exprNode.rhs.type === RELATIVE_LOCATION_PATH
                    && exprNode.rhs.steps[0].axis === ATTRIBUTE
                    && exprNode.rhs.steps[0].test.type === NODE_NAME_TEST
                    && XPathAllowedProperties.includes(exprNode.rhs.steps[0].test.name?.toLowerCase() as XPathAllowedProperties)
                ) {
                    const propertyName = exprNode.rhs.steps[0].test.name?.toLowerCase() as Property;
                    const [value] = await processExprNode(exprNode.lhs, context, sendCommand);
                    if (propertyName === Property.RUNTIME_ID) {
                        return [new PropertyCondition(propertyName, new PSInt32Array(String(value).split('.').map(Number))), relativeExprNodes];
                    }
                    if (propertyName === Property.ORIENTATION) {
                        return [new PropertyCondition(propertyName, new PSOrientationType(String(value))), relativeExprNodes];
                    }
                    if (Object.values(Int32Property).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSInt32(Number(value))), relativeExprNodes];
                    }
                    if (Object.values(StringProperty).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSString(String(value))), relativeExprNodes];
                    }
                    if (Object.values(BooleanProperty).includes(propertyName as any)) {
                        return [new PropertyCondition(propertyName, new PSBoolean(Boolean(value))), relativeExprNodes];
                    }
                }
            } else if ((exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === POSITION) !== (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === POSITION)) {
                if (exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === POSITION) {
                    if (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === LAST) {
                        positions.add(0x7FFFFFFF);
                    } else {
                        const [value] = await processExprNode<number>(exprNode.rhs, context, sendCommand);
                        if (typeof value !== 'number') return [new FalseCondition()];
                        positions.add(value);
                    }
                    return [new TrueCondition()];
                }
                if (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === POSITION) {
                    if (exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === LAST) {
                        positions.add(0x7FFFFFFF);
                    } else {
                        const [value] = await processExprNode<number>(exprNode.lhs, context, sendCommand);
                        if (typeof value !== 'number') return [new FalseCondition()];
                        positions.add(value);
                    }
                    return [new TrueCondition()];
                }
            }
        }
        // eslint-disable-next-line no-fallthrough
        default: {
            const result = await processExprNode(exprNode, context, sendCommand);
            if (result.length === 1 && typeof result[0] === 'number' && !isNaN(result[0])) {
                return await processExprNodeAsPredicate({
                    type: EQUALITY,
                    lhs: { type: FUNCTION_CALL, name: POSITION, args: [] },
                    rhs: { type: NUMBER, number: result[0] }
                }, context, positions, sendCommand, relativeExprNodes);
            }
            relativeExprNodes.push(exprNode);
            return [new TrueCondition(), relativeExprNodes];
        }
    }
}

const SCOPE_MAP = new Map<unknown, string>([
    [ANCESTOR, 'ancestors'],
    [ANCESTOR_OR_SELF, 'ancestors-or-self'],
    [CHILD, 'children'],
    [DESCENDANT, 'descendants'],
    [DESCENDANT_OR_SELF, 'subtree'],
    [FOLLOWING, 'following'],
    [FOLLOWING_SIBLING, 'following-sibling'],
    [PARENT, 'parent'],
    [PRECEDING, 'preceding'],
    [PRECEDING_SIBLING, 'preceding-sibling'],
    [SELF, 'element'],
]);

async function executeStep(step: StepNode, context: XPathElement, sendCommand: SendCommandFn): Promise<XPathElement[]> {
    const predicateConditions: Condition[] = [];
    const relativeExprNodes: ExprNode[] = [];
    const positions: Set<number> = new Set();

    for (const predicate of step.predicates) {
        const [condition, exprNodes] = await processExprNodeAsPredicate(predicate, context, positions, sendCommand);
        predicateConditions.push(condition);
        if (exprNodes) {
            relativeExprNodes.push(...exprNodes);
        }
    }

    const nodeTestCondition = convertNodeTestToCondition(step.test);
    const condition = predicateConditions.length > 0
        ? new AndCondition(nodeTestCondition, ...predicateConditions)
        : nodeTestCondition;

    if (step.axis === NAMESPACE) {
        return [];
    }

    const scope = SCOPE_MAP.get(step.axis);
    if (!scope) {
        throw new errors.InvalidArgumentError(`Unsupported axis: ${step.axis}`);
    }

    const conditionDto = conditionToDto(condition);
    const contextElementId = getContextElementId(context);

    let elIds: string[];
    if (step[OptimizeLastStep]) {
        const result = await sendCommand('findElement', { scope, condition: conditionDto, contextElementId }) as string | null;
        elIds = result ? [result] : [];
    } else {
        elIds = (await sendCommand('findElements', { scope, condition: conditionDto, contextElementId }) as string[]) ?? [];
    }

    const validEls: XPathElement[] = [];
    for (const elId of elIds) {
        let isValid = true;
        for (const exprNode of relativeExprNodes) {
            const el = foundElement(elId);
            const [isTrue] = await handleFunctionCall(BOOLEAN, el, sendCommand, exprNode);
            if (!isTrue) {
                isValid = false;
                break;
            }
        }
        if (isValid) {
            validEls.push(foundElement(elId));
        }
    }

    const positionsArray = Array.from(positions);
    if (positionsArray.length === 0) {
        return validEls;
    } else {
        return positionsArray
            .map((index) => index === 0x7FFFFFFF ? validEls[validEls.length - 1] : validEls[index - 1])
            .filter(Boolean);
    }
}

function convertNodeTestToCondition(nodeTest: NodeTestNode): Condition {
    switch (nodeTest.type) {
        case NODE_NAME_TEST:
            if (nodeTest.name === '*') {
                return new TrueCondition();
            }
            if (nodeTest.name.toLowerCase() === 'appbar' || nodeTest.name.toLowerCase() === 'semanticzoom') {
                return new PropertyCondition(Property.LOCALIZED_CONTROL_TYPE, new PSString(new PSControlType(nodeTest.name).toString()));
            }
            return new PropertyCondition(Property.CONTROL_TYPE, new PSControlType(nodeTest.name));
        case NODE_TYPE_TEST:
            if (nodeTest.name === NODE) {
                return new TrueCondition();
            }
        // eslint-disable-next-line no-fallthrough
        case PROCESSING_INSTRUCTION_TEST:
            return new FalseCondition();
    }
}

async function convertAttributeNodeTestToStringArray(nodeTest: NodeTestNode, context: XPathElement, sendCommand: SendCommandFn): Promise<string[]> {
    const contextId = getContextElementId(context);
    // Get the runtime IDs for the context element(s)
    const runtimeId = await sendCommand('getProperty', {
        elementId: contextId ?? await sendCommand('saveRootElementToTable', {}),
        property: 'RuntimeId',
    }) as string;

    const elIds = runtimeId.split('\n').map((id) => id.trim()).filter(Boolean);
    const extraProperties = ['x', 'y', 'width', 'height'];

    switch (nodeTest.type) {
        case NODE_TYPE_TEST:
            if (nodeTest.name === NODE) {
                const results: string[] = [];
                for (const name of Object.values(Property)) {
                    for (const elId of elIds) {
                        results.push(await sendCommand('getProperty', { elementId: elId, property: name }) as string);
                    }
                }
                return results;
            }
            return [];
        case NODE_NAME_TEST:
            if (extraProperties.includes(nodeTest.name.toLowerCase())) {
                const results: string[] = [];
                for (const elId of elIds) {
                    const rect = await sendCommand('getRect', { elementId: elId }) as RectResult;
                    results.push(String(rect[nodeTest.name.toLowerCase() as keyof RectResult]));
                }
                return results;
            }

            if (Object.values(Property).includes(nodeTest.name.toLowerCase() as Property)) {
                const results: string[] = [];
                for (const elId of elIds) {
                    results.push(await sendCommand('getProperty', { elementId: elId, property: nodeTest.name }) as string);
                }
                return results;
            }
        // eslint-disable-next-line no-fallthrough
        case PROCESSING_INSTRUCTION_TEST:
        default:
            return [];
    }
}

function isXPathElement(value: unknown): value is XPathElement {
    return typeof value === 'object' && value !== null && 'type' in value && ((value as any).type === 'root' || (value as any).type === 'found');
}

function convertToElementArray(element: XPathElement): XPathElement[] {
    return [element];
}

function removeDuplicateElements(elements: XPathElement[]): XPathElement[] {
    const seen = new Set<string>();
    return elements.filter((el) => {
        if (el.type === 'found' && el.elementId) {
            if (seen.has(el.elementId)) return false;
            seen.add(el.elementId);
        }
        return true;
    });
}

function optimizeDoubleSlash(steps: StepNode[]): void {
    for (let i = 0; i < steps.length - 1; i++) {
        if (steps[i].axis === DESCENDANT_OR_SELF && steps[i].test.type === NODE_TYPE_TEST && steps[i].predicates.length === 0 && steps[i + 1].axis === CHILD) {
            const optimizedStep: StepNode = { axis: DESCENDANT, test: steps[i + 1].test, predicates: steps[i + 1].predicates };
            if (steps[i + 1][OptimizeLastStep]) {
                optimizedStep[OptimizeLastStep] = true;
            }
            const stepsToAdd: StepNode[] = [optimizedStep];
            if (steps[i].predicates.some((predicate) => predicate.type === FUNCTION_CALL && (predicate.name === LAST || predicate.name === POSITION))) {
                stepsToAdd.push({ axis: PARENT, test: { type: NODE_TYPE_TEST, name: 'node' }, predicates: [] }, steps[i + 1]);
            }
            steps.splice(i, 2, ...stepsToAdd);
        }
    }
}

function findLastStep(obj: object): StepNode[] | undefined {
    if (Array.isArray(obj)) {
        return findLastStep(obj[obj.length - 1]);
    }

    let lastStepArray: StepNode[] | undefined;
    for (const key in obj) {
        if (key === 'steps' && Array.isArray(obj[key])) {
            lastStepArray = obj[key];
        }
        if (typeof obj[key] === 'object') {
            const result = findLastStep(obj[key]);
            if (result !== undefined) {
                lastStepArray = result;
            }
        }
    }

    return lastStepArray;
}

export function predicateProcessableBeforeNode(exprNode: ExprNode): boolean {
    switch (exprNode.type) {
        case OR:
        case AND:
            return predicateProcessableBeforeNode(exprNode.lhs) && predicateProcessableBeforeNode(exprNode.rhs);
        case EQUALITY:
        case INEQUALITY: {
            if ((exprNode.lhs.type === RELATIVE_LOCATION_PATH) !== (exprNode.rhs.type === RELATIVE_LOCATION_PATH)) {
                if (exprNode.lhs.type === RELATIVE_LOCATION_PATH
                    && exprNode.lhs.steps[0].axis === ATTRIBUTE
                    && exprNode.lhs.steps[0].test.type === NODE_NAME_TEST
                    && XPathAllowedProperties.includes(exprNode.lhs.steps[0].test.name?.toLowerCase() as XPathAllowedProperties)
                ) {
                    return true;
                }
                if (exprNode.rhs.type === RELATIVE_LOCATION_PATH
                    && exprNode.rhs.steps[0].axis === ATTRIBUTE
                    && exprNode.rhs.steps[0].test.type === NODE_NAME_TEST
                    && XPathAllowedProperties.includes(exprNode.rhs.steps[0].test.name?.toLowerCase() as XPathAllowedProperties)
                ) {
                    return true;
                }
            }
        }
        // eslint-disable-next-line no-fallthrough
        default:
            return false;
    }
}
