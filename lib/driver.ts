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
import { attachLogFileMirror, LogFileMirror } from './log-file';
import { DRIVER_VERSION } from './version';
import {
    assertSupportedEasingFunction
} from './util';
import { setDpiAwareness } from './winapi/user32';
import { xpathToElIdOrIds } from './xpath';

import type { Chromedriver } from 'appium-chromedriver';
import type {
    DefaultCreateSessionResult,
    DriverData,
    Element,
    ExternalDriver,
    InitialOpts,
    RouteMatcher,
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

// This is a set of methods and paths that we never want to proxy to Chromedriver.
const CHROMEDRIVER_NO_PROXY: RouteMatcher[] = [
    ['GET', new RegExp('^/session/[^/]+/appium')],
    ['GET', new RegExp('^/session/[^/]+/context')],
    ['GET', new RegExp('^/session/[^/]+/element/[^/]+/rect')],
    ['GET', new RegExp('^/session/[^/]+/orientation')],
    ['POST', new RegExp('^/session/[^/]+/appium')],
    ['POST', new RegExp('^/session/[^/]+/context')],
    ['POST', new RegExp('^/session/[^/]+/orientation')],

    // this is needed to make the windows: and powerShell commands work in web context
    ['POST', new RegExp('^/session/[^/]+/execute$')],
    ['POST', new RegExp('^/session/[^/]+/execute/sync')],

    // MJSONWP commands
    ['GET', new RegExp('^/session/[^/]+/log/types$')],
    ['POST', new RegExp('^/session/[^/]+/log$')],
    // W3C commands
    // For Selenium v4 (W3C does not have this route)
    ['GET', new RegExp('^/session/[^/]+/se/log/types$')],
    // For Selenium v4 (W3C does not have this route)
    ['POST', new RegExp('^/session/[^/]+/se/log$')],
];

export class NovaWindowsDriver extends BaseDriver<NovaWindowsDriverConstraints, StringRecord> {
    serverClient?: NovaUIAutomationClient;
    keyboardState: KeyboardState = {
        pressed: new Set(),
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
    };
    chromedriver: Chromedriver | null = null;
    proxyReqRes: ((...args: any) => any) | null = null;
    proxyCommand: ExternalDriver['proxyCommand'] | null = null;
    contexts: string[] = [];
    jwpProxyActive: boolean = false;
    currentContext: string | null = null;
    _screenRecorder: ScreenRecorder | null = null;
    _logFileMirror: LogFileMirror | null = null;
    webviewDevtoolsPort: number | null = null;

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

    override canProxy(): boolean {
        return true;
    }

    override proxyActive(): boolean {
        return this.jwpProxyActive;
    }

    override getProxyAvoidList(): RouteMatcher[] {
        return this.jwpProxyActive && this.chromedriver ? CHROMEDRIVER_NO_PROXY : [];
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
                // WinAppDriver matches LocalizedControlType (lowercase, locale-dependent: "button", "edit").
                // Nova historically matches ControlType (PascalCase: "Button", "Edit").
                // Detect which style the selector uses to support both transparently.
                condition = selector === selector.toLowerCase()
                    ? propertyCondition('LocalizedControlType', selector)
                    : propertyCondition('ControlType', selector);
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

        // Warn when the same logical capability is sent under both prefixed and unprefixed keys with different values
        if (w3cCaps?.alwaysMatch) {
            const am = w3cCaps.alwaysMatch as Record<string, unknown>;
            for (const cap of ['app', 'appArguments', 'appWorkingDir', 'appTopLevelWindow']) {
                const unprefixed = am[cap];
                const prefixed = am[`appium:${cap}`];
                if (unprefixed !== undefined && prefixed !== undefined && unprefixed !== prefixed) {
                    this.log.warn(`Conflicting values for '${cap}': unprefixed='${unprefixed}', appium:${cap}='${prefixed}'. The appium:-prefixed value takes precedence.`);
                }
            }
        }

        try {
            this.log.debug('Creating NovaWindows driver session...');
            const [sessionId, caps] = await super.createSession(jwpCaps, reqCaps, w3cCaps, driverData);
            if (caps.logFile !== undefined && caps.logFile !== false) {
                try {
                    this._logFileMirror = attachLogFileMirror(this.log as unknown as Record<string, unknown>, caps.logFile);
                    this.log.info(`Driver log is being mirrored to ${this._logFileMirror.path}`);
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    this.log.warn(`Failed to attach log file mirror: ${msg}`);
                }
            }
            // Stamp the driver version in the log so we can tell which build is
            // running — useful when testing across rebuilds. The C# server
            // prints its own version banner shortly after via stderr → log.
            this.log.info(`appium-novawindows-driver v${DRIVER_VERSION} (session ${sessionId})`);
            if (caps.smoothPointerMove) {
                assertSupportedEasingFunction(caps.smoothPointerMove);
            }
            if (caps.app && caps.appTopLevelWindow) {
                throw new errors.InvalidArgumentError('Invalid capabilities. Specify either app or appTopLevelWindow.');
            }
            if (this.caps.shouldCloseApp === undefined) {
                this.caps.shouldCloseApp = true; // set default value
            }
            if (this.caps.systemPort) {
                this.log.info(`systemPort capability (${this.caps.systemPort}) is ignored. NovaWindows uses stdin/stdout IPC.`);
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

        if (this.chromedriver) {
            try {
                await this.chromedriver.stop();
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.log.warn(`Failed to stop chromedriver during session teardown: ${msg}`);
            }
            this.chromedriver = null;
            this.jwpProxyActive = false;
            this.proxyReqRes = null;
            this.proxyCommand = null;
            this.currentContext = null;
        }

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

        if (this._logFileMirror) {
            this._logFileMirror.detach();
            this._logFileMirror = null;
        }
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
