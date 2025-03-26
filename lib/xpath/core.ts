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
    PSControlType,
    Condition,
    FalseCondition,
    PropertyCondition,
    TrueCondition,
    AutomationElement,
    FoundAutomationElement,
    AutomationElementGroup,
    TreeScope,
    AndCondition,
    OrCondition,
    Int32Property,
    PSInt32,
    PSString,
    StringProperty,
    BooleanProperty,
    PSBoolean,
    PSInt32Array,
    PSOrientationType
} from '../powershell';

import { handleFunctionCall } from './functions';

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

export async function xpathToElIdOrIds(selector: string, mult: boolean, context: string | undefined, sendPowerShellCommand: (command: string) => Promise<string>): Promise<Element | Element[]> {
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

    const foundElements = await processExprNode<FoundAutomationElement>(parsedXPath, context ? new FoundAutomationElement(context) : AutomationElement.automationRoot, sendPowerShellCommand);
    const els = foundElements.filter((el) => el instanceof FoundAutomationElement).map((el) => ({ [W3C_ELEMENT_KEY]: el.runtimeId }));

    if (mult) {
        return els;
    }

    if (els.length === 0) {
        throw new errors.NoSuchElementError();
    }

    return els[0];
}

export async function processExprNode<T>(exprNode: ExprNode, context: AutomationElement, sendPowerShellCommand: (command: string) => Promise<string>): Promise<T[]> {
    switch (exprNode.type) {
        case NUMBER:
            return [exprNode.number as T];
        case LITERAL:
            return [exprNode.string as T];
        case UNION:
            return [...await processExprNode<T>(exprNode.lhs, context, sendPowerShellCommand), ...await processExprNode<T>(exprNode.rhs, context, sendPowerShellCommand)];
        case FUNCTION_CALL:
            return await handleFunctionCall(exprNode.name, context, sendPowerShellCommand, ...exprNode.args);
        case ABSOLUTE_LOCATION_PATH:
        case RELATIVE_LOCATION_PATH: {
            const result: T[][] = [];
            for (const element of convertToElementArray(context)) {
                result.push(await handleLocationNode(exprNode, element, sendPowerShellCommand) as T[]);
            }

            return result.flat();
        }
        case PATH: {
            const filterResult = await processExprNode<T>(exprNode.filter, context, sendPowerShellCommand);
            const result: T[][] = [];
            for (const item of filterResult) {
                if (item instanceof AutomationElement) {
                    const itemAfterSteps = await handleLocationNode({
                        type: RELATIVE_LOCATION_PATH,
                        steps: exprNode.steps,
                    }, item, sendPowerShellCommand);
                    result.push(itemAfterSteps as T[]);
                }
            }

            return result.flat();
        }
        case FILTER: {
            const result: T[] = [];
            const exprResult = await processExprNode<T>(exprNode.primary, context, sendPowerShellCommand);
            for (const item of exprResult) {
                if (item instanceof AutomationElement) {
                    const filteredItem = await executeStep({
                        axis: SELF,
                        test: {
                            type: NODE_TYPE_TEST,
                            name: NODE,
                        },
                        predicates: exprNode.predicates,
                    }, item, sendPowerShellCommand) as T;
                    result.push(filteredItem);
                }
            }

            return result;
        }
        case OR:
            case AND: {
            const [lhs] = await handleFunctionCall<T>(BOOLEAN, context, sendPowerShellCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<T>(BOOLEAN, context, sendPowerShellCommand, exprNode.rhs);

            if (exprNode.type === AND) {
                return [lhs && rhs];
            } else {
                return [lhs || rhs];
            }
        }
        case NEGATION:
            return [-await handleFunctionCall<T>(NUMBER, context, sendPowerShellCommand, exprNode.lhs) as T];
        case EQUALITY:
        case INEQUALITY: {
            const [lhs] = await handleFunctionCall<string>(STRING, context, sendPowerShellCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<string>(STRING, context, sendPowerShellCommand, exprNode.rhs);
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
        case SUBTRACTIVE:
        {
            const [lhs] = await handleFunctionCall<number>(NUMBER, context, sendPowerShellCommand, exprNode.lhs);
            const [rhs] = await handleFunctionCall<number>(NUMBER, context, sendPowerShellCommand, exprNode.rhs);

            switch (exprNode.type) {
                case ADDITIVE:
                    return [(lhs + rhs) as T];
                case DIVISIONAL:
                    return [(lhs / rhs) as T];
                case GREATER_THAN:
                    return [(lhs > rhs) as T];
                case GREATER_THAN_OR_EQUAL:
                    return [(lhs >= rhs) as T];
                case LESS_THAN:
                    return [(lhs < rhs) as T];
                case LESS_THAN_OR_EQUAL:
                    return [(lhs <= rhs) as T];
                case MODULUS:
                    return [(lhs % rhs) as T];
                case MULTIPLICATIVE:
                    return [(lhs * rhs) as T];
                case SUBTRACTIVE:
                    return [(lhs - rhs) as T];
            }
        }
    }
}

async function handleLocationNode(location: LocationNode, context: AutomationElement, sendPowerShellCommand: (command: string) => Promise<string>): Promise<AutomationElement[] | string[]> {
    if (location.steps.some((step) => step.test.name === null)) {
        throw new errors.InvalidSelectorError('Expected path step expression.');
    }

    if (location.type === ABSOLUTE_LOCATION_PATH) {
        context = AutomationElement.automationRoot;
    }

    if (context instanceof AutomationElementGroup && context.groups.length > 1) {
        throw new errors.InvalidArgumentError(`handleLocationNode expects single context, but received ${context.groups.length} contexts.`);
    }

    optimizeDoubleSlash(location.steps);

    for (const [index, step] of location.steps.entries()) {
        if (step.axis === ATTRIBUTE) {
            if (index === location.steps.length - 1) {
                return await convertAttributeNodeTestToStringArray(step.test, context, sendPowerShellCommand);
            } else {
                return [];
            }
        }

        if (context instanceof AutomationElementGroup) {
            const results: AutomationElementGroup[] = [];
            for (const el of context.groups) {
                results.push(await executeStep(step, el, sendPowerShellCommand));
            }
            context = new AutomationElementGroup(...flattenElementGroupsAndRemoveDuplicates(results));
        } else {
            context = await executeStep(step, context, sendPowerShellCommand);
        }
    }

    return convertToElementArray(context);
}

export async function processExprNodeAsPredicate(exprNode: ExprNode, context: AutomationElement, positions: Set<number>, sendPowerShellCommand: (command: string) => Promise<string>, relativeExprNodes?: ExprNode[]): Promise<[Condition, ExprNode[]?]> {
    relativeExprNodes ??= [];
    switch (exprNode.type) {
        case NUMBER:
            return await processExprNodeAsPredicate({
                type: EQUALITY,
                lhs: {
                    type: FUNCTION_CALL,
                    name: POSITION,
                    args: [],
                },
                rhs: {
                    type: NUMBER,
                    number: exprNode.number,
                }
            }, context, positions, sendPowerShellCommand, relativeExprNodes);
        case OR:
            return [new OrCondition(
                    (await processExprNodeAsPredicate(exprNode.lhs, context, positions, sendPowerShellCommand, relativeExprNodes))[0],
                    (await processExprNodeAsPredicate(exprNode.rhs, context, positions, sendPowerShellCommand, relativeExprNodes))[0]
            ), relativeExprNodes];
        case AND:
            return [new AndCondition(
                    (await processExprNodeAsPredicate(exprNode.lhs, context, positions, sendPowerShellCommand, relativeExprNodes))[0],
                    (await processExprNodeAsPredicate(exprNode.rhs, context, positions, sendPowerShellCommand, relativeExprNodes))[0]
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
                    const [value] = await processExprNode(exprNode.rhs, context, sendPowerShellCommand);
                    if (propertyName === Property.RUNTIME_ID) {
                        return [new PropertyCondition(propertyName, new PSInt32Array(String(value).split('.').map(Number))), relativeExprNodes];
                    }

                    if (propertyName === Property.ORIENTATION) {
                        return [new PropertyCondition(propertyName, new PSOrientationType(String(value))), relativeExprNodes];
                    }

                    if (Object.values(Int32Property).includes(propertyName as Int32Property)) {
                        return [new PropertyCondition(propertyName, new PSInt32(Number(value))), relativeExprNodes];
                    }

                    if (Object.values(StringProperty).includes(propertyName as StringProperty)) {
                        return [new PropertyCondition(propertyName, new PSString(String(value))), relativeExprNodes];
                    }

                    if (Object.values(BooleanProperty).includes(propertyName as BooleanProperty)) {
                        return [new PropertyCondition(propertyName, new PSBoolean(Boolean(value))), relativeExprNodes];
                    }
                }

                if (exprNode.rhs.type === RELATIVE_LOCATION_PATH
                    && exprNode.rhs.steps[0].axis === ATTRIBUTE
                    && exprNode.rhs.steps[0].test.type === NODE_NAME_TEST
                    && XPathAllowedProperties.includes(exprNode.rhs.steps[0].test.name?.toLowerCase() as XPathAllowedProperties)
                ) {
                    const propertyName = exprNode.rhs.steps[0].test.name?.toLowerCase() as Property;
                    const [value] = await processExprNode(exprNode.lhs, context, sendPowerShellCommand);
                    if (propertyName === Property.RUNTIME_ID) {
                        return [new PropertyCondition(propertyName, new PSInt32Array(String(value).split('.').map(Number))), relativeExprNodes];
                    }

                    if (propertyName === Property.ORIENTATION) {
                        return [new PropertyCondition(propertyName, new PSOrientationType(String(value))), relativeExprNodes];
                    }

                    if (Object.values(Int32Property).includes(propertyName as Int32Property)) {
                        return [new PropertyCondition(propertyName, new PSInt32(Number(value))), relativeExprNodes];
                    }

                    if (Object.values(StringProperty).includes(propertyName as StringProperty)) {
                        return [new PropertyCondition(propertyName, new PSString(String(value))), relativeExprNodes];
                    }

                    if (Object.values(BooleanProperty).includes(propertyName as BooleanProperty)) {
                        return [new PropertyCondition(propertyName, new PSBoolean(Boolean(value))), relativeExprNodes];
                    }
                }
            } else if ((exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === POSITION) !== (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === POSITION)) {
                if (exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === POSITION) {
                    if (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === LAST) {
                        positions.add(0x7FFFFFFF);
                    } else {
                        const [value] = await processExprNode<number>(exprNode.rhs, context, sendPowerShellCommand);

                        if (typeof value !== 'number') {
                            return [new FalseCondition()];
                        }

                        positions.add(value);
                    }

                    return [new TrueCondition];
                }

                if (exprNode.rhs.type === FUNCTION_CALL && exprNode.rhs.name === POSITION) {
                    if (exprNode.lhs.type === FUNCTION_CALL && exprNode.lhs.name === LAST) {
                        positions.add(0x7FFFFFFF);
                    } else {
                        const [value] = await processExprNode<number>(exprNode.lhs, context, sendPowerShellCommand);

                        if (typeof value !== 'number') {
                            return [new FalseCondition()];
                        }

                        positions.add(value);
                    }

                    return [new TrueCondition];
                }
            }
        }
        // eslint-disable-next-line no-fallthrough
        default: {
            const result = await processExprNode(exprNode, context, sendPowerShellCommand);

            if (result.length === 1 && typeof result[0] === 'number' && !isNaN(result[0])) {
                return await processExprNodeAsPredicate({
                    type: EQUALITY,
                    lhs: {
                        type: FUNCTION_CALL,
                        name: POSITION,
                        args: [],
                    },
                    rhs: {
                        type: NUMBER,
                        number: result[0],
                    }
                }, context, positions, sendPowerShellCommand, relativeExprNodes);
            }

            relativeExprNodes.push(exprNode);
            return [new TrueCondition(), relativeExprNodes];
        }
    }
}

async function executeStep(step: StepNode, context: AutomationElement, sendPowerShellCommand: (command: string) => Promise<string>): Promise<AutomationElementGroup> {
    const predicateConditions: Condition[] = [];
    const relativeExprNodes: ExprNode[] = [];
    const positions: Set<number> = new Set();
    for (const predicate of step.predicates) {
        const [condition, exprNodes] = await processExprNodeAsPredicate(predicate, context, positions, sendPowerShellCommand);
        predicateConditions.push(condition);
        if (exprNodes) {
            relativeExprNodes.push(...exprNodes);
        }
    }

    const condition = predicateConditions.length > 0 ? new AndCondition(convertNodeTestToCondition(step.test), ...predicateConditions) : convertNodeTestToCondition(step.test);

    let find: AutomationElement;
    switch (step.axis) {
        case ANCESTOR:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.ANCESTORS, condition) : context.findAll(TreeScope.ANCESTORS, condition);
            break;
        case ANCESTOR_OR_SELF:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.ANCESTORS_OR_SELF, condition) : context.findAll(TreeScope.ANCESTORS_OR_SELF, condition);
            break;
        case CHILD:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.CHILDREN, condition) : context.findAll(TreeScope.CHILDREN, condition);
            break;
        case DESCENDANT:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.DESCENDANTS, condition) : context.findAll(TreeScope.DESCENDANTS, condition);
            break;
        case DESCENDANT_OR_SELF:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.SUBTREE, condition) : context.findAll(TreeScope.SUBTREE, condition);
            break;
        case FOLLOWING:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.FOLLOWING, condition) : context.findAll(TreeScope.FOLLOWING, condition);
            break;
        case FOLLOWING_SIBLING:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.FOLLOWING_SIBLING, condition) : context.findAll(TreeScope.FOLLOWING_SIBLING, condition);
            break;
        case NAMESPACE:
            return new AutomationElementGroup(/* empty */);
        case PARENT:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.PARENT, condition) : context.findAll(TreeScope.PARENT, condition);
            break;
        case PRECEDING:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.PRECEDING, condition) : context.findAll(TreeScope.PRECEDING, condition);
            break;
        case PRECEDING_SIBLING:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.PRECEDING_SIBLING, condition) : context.findAll(TreeScope.PRECEDING_SIBLING, condition);
            break;
        case SELF:
            find = step[OptimizeLastStep] ? context.findFirst(TreeScope.ELEMENT, condition) : context.findAll(TreeScope.ELEMENT, condition);
            break;
        default:
            throw new errors.InvalidArgumentError(); // should not be reached, attribute is handled before that
    }

    const result = await sendPowerShellCommand(find.buildCommand());
    const els = result.split('\n').map((id) => id.trim()).filter(Boolean).map((id) => new FoundAutomationElement(id));
    const validEls: FoundAutomationElement[] = [];

    for (const el of els) {
        let isValid = true;
        for (const exprNode of relativeExprNodes) {
            const [isTrue] = await handleFunctionCall(BOOLEAN, el, sendPowerShellCommand, exprNode);
            if (!isTrue) {
                isValid = false;
                break;
            }
        }

        if (isValid) {
            validEls.push(el);
        }
    }

    const positionsArray = Array.from(positions);

    if (positionsArray.length === 0) {
        return new AutomationElementGroup(...validEls);
    } else {
        return new AutomationElementGroup(...positionsArray.map((index) => index === 0x7FFFFFFF ? validEls[validEls.length - 1] : validEls[index - 1]).filter(Boolean));
    }
}

function convertNodeTestToCondition(nodeTest: NodeTestNode): Condition {
    switch (nodeTest.type) {
        case NODE_NAME_TEST:
            if (nodeTest.name === '*') {
                return new TrueCondition();
            }
            // workaround for ControlType 50039 and 50040 not supported in UIAutomationClient
            if (nodeTest.name.toLowerCase() === 'appbar' || nodeTest.name.toLowerCase() === 'semanticzoom') {
                // PSControlType already has a logic to correct the value to localized control type
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

async function convertAttributeNodeTestToStringArray(nodeTest: NodeTestNode, context: AutomationElement, sendPowerShellCommand: (command: string) => Promise<string>): Promise<string[]> {
    const result = await sendPowerShellCommand(context.buildGetPropertyCommand(Property.RUNTIME_ID));
    const els = result.split('\n').map((id) => id.trim()).filter(Boolean).map((id) => new FoundAutomationElement(id.trim()));
    const extraProperties = ['x', 'y', 'width', 'height'];
    switch (nodeTest.type) {
        case NODE_TYPE_TEST:
            if (nodeTest.name === NODE) {
                const results: string[] = [];
                for (const name of Object.values(Property)) {
                    for (const el of els) {
                        results.push(await sendPowerShellCommand(el.buildGetPropertyCommand(name)));
                    }
                }

                return results;
            }

            return [];
        case NODE_NAME_TEST:
            if (extraProperties.includes(nodeTest.name.toLowerCase())) {
                const results: string[] = [];
                for (const el of els) {
                    const rectJson = await sendPowerShellCommand(el.buildGetElementRectCommand());
                    results.push(JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString()))[nodeTest.name.toLowerCase()]);
                }

                return results;
            }

            if (Object.values(Property).includes(nodeTest.name.toLowerCase() as Property)) {
                const results: string[] = [];
                for (const el of els) {
                    results.push(await sendPowerShellCommand(el.buildGetPropertyCommand(nodeTest.name)));
                }

                return results;
            }
        // eslint-disable-next-line no-fallthrough
        case PROCESSING_INSTRUCTION_TEST:
        default:
            return [];
    }
}

function convertToElementArray(element: AutomationElement): AutomationElement[] {
    if (element instanceof AutomationElementGroup) {
        return flattenElementGroupsAndRemoveDuplicates(element.groups);
    }

    return [element];
}

function flattenElementGroupsAndRemoveDuplicates(elements: AutomationElement[]): AutomationElement[] {
    const seen = new Set<string>();
    return elements.reduce<AutomationElement[]>((acc, el) => {
        if (el instanceof AutomationElementGroup) {
            return acc.concat(flattenElementGroupsAndRemoveDuplicates(el.groups));
        } else {
            if (el instanceof FoundAutomationElement && seen.has(el.runtimeId)) {
                return acc;
            }

            if (el instanceof FoundAutomationElement) {
                seen.add(el.runtimeId);
            }

            acc.push(el);
            return acc;
        }
    }, []);
}

function optimizeDoubleSlash(steps: StepNode[]): void {
    for (let i = 0; i < steps.length - 1; i++) {
        // detect double slash: //element is the same as /descendant-or-self::node()/child::element
        if (steps[i].axis === DESCENDANT_OR_SELF && steps[i].test.type === NODE_TYPE_TEST && steps[i].predicates.length === 0 && steps[i + 1].axis === CHILD) {
            const optimizedStep: StepNode = { axis: DESCENDANT, test: steps[i + 1].test, predicates: steps[i + 1].predicates };
            if (steps[i + 1][OptimizeLastStep]) {
                optimizedStep[OptimizeLastStep] = true;
            }
            const stepsToAdd: StepNode[] = [optimizedStep];
            if (steps[i].predicates.some((predicate) => predicate.type === FUNCTION_CALL && (predicate.name === LAST || predicate.name === POSITION))) {
                stepsToAdd.push({ axis: PARENT, test: { type: NODE_TYPE_TEST, name: 'node' }, predicates: [] }, steps[i + 1]);
            }

            // mutates the original array by reference
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
        default: {
            return false;
        }
    }
}
