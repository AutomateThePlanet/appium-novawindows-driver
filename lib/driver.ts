import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { BaseDriver, W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { system } from 'appium/support';
import commands from './commands';
import {
    UI_AUTOMATION_DRIVER_CONSTRAINTS,
    NovaWindowsDriverConstraints
} from './constraints';
import {
    assertSupportedEasingFunction
} from './util';
import {
    Condition,
    PropertyCondition,
    AutomationElement,
    FoundAutomationElement,
    TreeScope,
    Property,
    convertStringToCondition,
    PSString,
    PSControlType,
    PSInt32Array,
} from './powershell';
import { xpathToElIdOrIds } from './xpath';
import { setDpiAwareness } from './winapi/user32';

import type {
    DefaultCreateSessionResult,
    DriverData,
    Element,
    InitialOpts,
    StringRecord,
    W3CDriverCaps
} from '@appium/types';

type W3CNovaWindowsDriverCaps = W3CDriverCaps<NovaWindowsDriverConstraints>;
type DefaultWindowsCreateSessionResult = DefaultCreateSessionResult<NovaWindowsDriverConstraints>;

type KeyboardState = {
    pressed: Set<string>,
    shift: boolean,
    ctrl: boolean,
    meta: boolean,
    alt: boolean,
}

const LOCATION_STRATEGIES = Object.freeze([
    'id',
    'name',
    'xpath',
    'tag name',
    'class name',
    'accessibility id',
    '-windows uiautomation',
] as const);

export class NovaWindowsDriver extends BaseDriver<NovaWindowsDriverConstraints, StringRecord> {
    isPowerShellSessionStarted: boolean = false;
    powerShell?: ChildProcessWithoutNullStreams;
    powerShellStdOut: string = '';
    powerShellStdErr: string = '';
    keyboardState: KeyboardState = {
        pressed: new Set(),
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
    };

    constructor(opts: InitialOpts = {} as InitialOpts, shouldValidateCaps = true) {
        super(opts, shouldValidateCaps);

        this.locatorStrategies = [...LOCATION_STRATEGIES];
        this.desiredCapConstraints = UI_AUTOMATION_DRIVER_CONSTRAINTS;

        for (const key in commands) { // TODO: create a decorator that will do that for the class
            NovaWindowsDriver.prototype[key] = commands[key].bind(this);
        }
    }

    override async findElement(strategy: string, selector: string): Promise<Element> {
        [strategy, selector] = this.processSelector(strategy, selector);
        return super.findElement(strategy, selector);
    }

    override async findElements(strategy: string, selector: string): Promise<Element[]> {
        [strategy, selector] = this.processSelector(strategy, selector);
        return super.findElements(strategy, selector);
    }

    override async findElementFromElement(strategy: string, selector: string, elementId: string): Promise<Element> {
        [strategy, selector] = this.processSelector(strategy, selector);
        return super.findElementFromElement(strategy, selector, elementId);
    }

    override async findElementsFromElement(strategy: string, selector: string, elementId: string): Promise<Element[]> {
        [strategy, selector] = this.processSelector(strategy, selector);
        return super.findElementsFromElement(strategy, selector, elementId);
    }

    override async findElOrEls(strategy: typeof LOCATION_STRATEGIES[number], selector: string, mult: true, context?: string): Promise<Element[]>;
    override async findElOrEls(strategy: typeof LOCATION_STRATEGIES[number], selector: string, mult: false, context?: string): Promise<Element>;
    override async findElOrEls(strategy: typeof LOCATION_STRATEGIES[number], selector: string, mult: boolean, context?: string): Promise<Element | Element[]> {
        let condition: Condition;
        switch (strategy) {
            case 'id':
                condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(selector.split('.').map(Number)));
                break;
            case 'tag name':
                condition = new PropertyCondition(Property.CONTROL_TYPE, new PSControlType(selector));
                break;
            case 'accessibility id':
                condition = new PropertyCondition(Property.AUTOMATION_ID, new PSString(selector));
                break;
            case 'name':
                condition = new PropertyCondition(Property.NAME, new PSString(selector));
                this.log.debug(condition);
                break;
            case 'class name':
                condition = new PropertyCondition(Property.CLASS_NAME, new PSString(selector));
                break;
            case '-windows uiautomation':
                condition = convertStringToCondition(selector);
                break;
            case 'xpath':
                return await xpathToElIdOrIds(selector, mult, context, this.sendPowerShellCommand.bind(this));
            default:
                throw new errors.InvalidArgumentError(`Invalid find strategy ${strategy}`);
        }

        const searchContext = context ? new FoundAutomationElement(context) : AutomationElement.automationRoot;

        if (mult) {
            const result = await this.sendPowerShellCommand(searchContext.findAll(TreeScope.DESCENDANTS, condition).buildCommand());
            const elIds = result.split('\n').map((elId) => elId.trim()).filter(Boolean);
            return elIds.filter(Boolean).map((elId) => ({ [W3C_ELEMENT_KEY]: elId }));
        }

        const result = await this.sendPowerShellCommand(searchContext.findFirst(TreeScope.DESCENDANTS, condition).buildCommand());
        const elId = result.trim();

        if (!elId) {
            throw new errors.NoSuchElementError();
        }

        return { [W3C_ELEMENT_KEY]: elId };
    }

    override async createSession(
        jwpCaps: W3CNovaWindowsDriverCaps,
        reqCaps?: W3CNovaWindowsDriverCaps,
        w3cCaps?: W3CNovaWindowsDriverCaps,
        driverData?: DriverData[]
    ): Promise<DefaultWindowsCreateSessionResult> {
        if (!system.isWindows()) {
            this.log.errorWithException('Windows UI Automation tests only run on Windows.');
        }

        if (typeof w3cCaps?.alwaysMatch?.['appium:appTopLevelWindow'] === 'number') {
            w3cCaps.alwaysMatch['appium:appTopLevelWindow'] = String(w3cCaps.alwaysMatch['appium:appTopLevelWindow']);
        }

        if (typeof w3cCaps?.firstMatch?.some['appium:appTopLevelWindow'] === 'number') {
            w3cCaps.firstMatch['appium:appTopLevelWindow'] = w3cCaps.firstMatch['appium:appTopLevelWindow'].map(String);
        }

        try {
            this.log.debug('Creating NovaWindows driver session...');
            const [sessionId, caps] = await super.createSession(jwpCaps, reqCaps, w3cCaps, driverData);
            if (caps.smoothPointerMove) {
                assertSupportedEasingFunction(caps.smoothPointerMove);
            }
            if (caps.app && caps.appTopLevelWindow) {
                throw new errors.InvalidArgumentError('Invalid capabilities. Specify either app or appTopLevelWindow.');
            }

            await this.startPowerShellSession();

            setDpiAwareness();
            this.log.debug(`Started session ${sessionId}.`);
            return [sessionId, caps];
        } catch (e) {
            await this.deleteSession();
            throw e;
        }
    }

    override async deleteSession(sessionId?: string | null | undefined): Promise<void> {
        this.log.debug('Deleting NovaWindows driver session...');

        if (this.caps.shouldCloseApp && this.caps.app && this.caps.app.toLowerCase() !== 'root') {
            try {
                const result = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand());
                const elementId = result.split('\n').map((id) => id.trim()).filter(Boolean)[0];
                if (elementId) {
                    await this.sendPowerShellCommand(new FoundAutomationElement(elementId).buildCloseCommand());
                }
            } catch {
                // noop
            }
        } // change to close the whole process, not only the window
        await this.terminatePowerShellSession();
        await super.deleteSession(sessionId);
    }

    private processSelector(strategy: string, selector: string): [string, string] {
        if (strategy !== 'css selector') {
            return [strategy, selector];
        }

        this.log.warn('Warning: Use Appium mobile selectors instead of Selenium By, since most of them are based on CSS.');
        const digitRegex = /\\3(\d) /;

        if (selector.startsWith('.')) {
            selector = selector.substring(1).replace(digitRegex, '$1');
            strategy = 'class name';
            return [strategy, selector];
        }

        if (selector.startsWith('#')) {
            selector = selector.substring(1).replace(digitRegex, '$1');
            strategy = 'id';
            return [strategy, selector];
        }

        if (selector.startsWith('*[name')) {
            selector = selector.substring(selector.indexOf('"') + 1, selector.lastIndexOf('"')).replace(digitRegex, '$1');
            strategy = 'name';
            return [strategy, selector];
        }

        return [strategy, selector];
    }
}
