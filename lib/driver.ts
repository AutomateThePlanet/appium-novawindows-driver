import { BaseDriver, W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { system } from 'appium/support';
import type { ScreenRecorder } from './commands/screen-recorder';
import commands from './commands';
import {
    NovaWindowsDriverConstraints,
    UI_AUTOMATION_DRIVER_CONSTRAINTS
} from './constraints';
import {
    Property,
    ControlType,
    ExtraControlType,
} from './powershell/types';
import {
    convertStringToCondition,
} from './powershell/converter';
import { conditionToDto } from './server/converter-bridge';
import { NovaUIAutomationClient } from './server/client';
import { propertyCondition } from './server/conditions';
import type { ConditionDto } from './server/protocol';
import {
    assertSupportedEasingFunction
} from './util';
import { setDpiAwareness } from './winapi/user32';
import { xpathToElIdOrIds } from './xpath';

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
    serverClient?: NovaUIAutomationClient;
    keyboardState: KeyboardState = {
        pressed: new Set(),
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
    };
    _screenRecorder: ScreenRecorder | null = null;

    constructor(opts: InitialOpts = {} as InitialOpts, shouldValidateCaps = true) {
        super(opts, shouldValidateCaps);

        this.locatorStrategies = [...LOCATION_STRATEGIES];
        this.desiredCapConstraints = UI_AUTOMATION_DRIVER_CONSTRAINTS;

        // Bind commands to this instance (not prototype) so each driver instance uses its own
        // server client and state when multiple sessions exist
        for (const key in commands) { // TODO: create a decorator that will do that for the class
            (this as any)[key] = commands[key].bind(this);
        }
    }

    async sendCommand(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
        if (!this.serverClient) {
            throw new errors.UnknownError('NovaUIAutomationServer is not running.');
        }
        return await this.serverClient.sendCommand(method, params);
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
        let condition: ConditionDto;
        switch (strategy) {
            case 'id':
                condition = propertyCondition('RuntimeId', selector.split('.').map(Number));
                break;
            case 'tag name':
                condition = propertyCondition('ControlType', selector);
                break;
            case 'accessibility id':
                condition = propertyCondition('AutomationId', selector);
                break;
            case 'name':
                condition = propertyCondition('Name', selector);
                break;
            case 'class name':
                condition = propertyCondition('ClassName', selector);
                break;
            case '-windows uiautomation':
                condition = conditionToDto(convertStringToCondition(selector));
                break;
            case 'xpath':
                return await xpathToElIdOrIds(selector, mult, context, this.sendCommand.bind(this));
            default:
                throw new errors.InvalidArgumentError(`Invalid find strategy ${strategy}`);
        }

        const params: Record<string, unknown> = {
            scope: 'descendants',
            condition,
            contextElementId: context ?? null,
        };

        if (mult) {
            const result = await this.sendCommand('findElements', params) as string[];
            return (result ?? []).map((elId) => ({ [W3C_ELEMENT_KEY]: elId }));
        }

        const result = await this.sendCommand('findElement', params) as string | null;

        if (!result) {
            throw new errors.NoSuchElementError();
        }

        return { [W3C_ELEMENT_KEY]: result };
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
            if (this.caps.shouldCloseApp === undefined) {
                this.caps.shouldCloseApp = true; // set default value
            }

            await this.startServerSession();

            if (this.caps.prerun) {
                this.log.info('Executing prerun PowerShell script...');
                await this.executePowerShellScript(this.caps.prerun as Exclude<Parameters<typeof commands['executePowerShellScript']>[0], string>);
            }

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
                if (this.caps['ms:forcequit'] === true) {
                    // Force quit the process
                    const isNotNull = await this.sendCommand('checkRootElementNotNull', {}) as boolean;
                    if (isNotNull) {
                        const processId = await this.sendCommand('getProperty', { elementId: await this.sendCommand('saveRootElementToTable', {}), property: 'ProcessId' }) as string;
                        await this.sendCommand('stopProcess', { pid: Number(processId), force: true });
                    }
                } else {
                    const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
                    if (rootId) {
                        await this.sendCommand('closeWindow', { elementId: rootId });
                    }
                }
            } catch {
                // noop
            }
        }
        if (this.caps.postrun) {
            this.log.info('Executing postrun PowerShell script...');
            await this.executePowerShellScript(this.caps.postrun as Exclude<Parameters<typeof commands['executePowerShellScript']>[0], string>);
        }

        await this.terminateServerSession();
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
