import { normalize } from 'node:path';
import { Element, Rect } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import {
    AutomationElement,
    FoundAutomationElement,
    PSInt32,
    PSString,
    Property,
    PropertyCondition,
    TreeScope,
    TrueCondition,
    pwsh$,
    pwsh,
} from '../powershell';
import { sleep } from '../util';
import { errors, W3C_ELEMENT_KEY } from '@appium/base-driver';
import {
    getWindowAllHandlesForProcessIds,
    keyDown,
    keyUp,
    trySetForegroundWindow,
} from '../winapi/user32';
import { Key } from '../enums';

const GET_PAGE_SOURCE_COMMAND = pwsh$ /* ps1 */ `
    $el = ${0}

    if ($el -eq $null) {
        $dummy = [xml]'<DummyRoot></DummyRoot>'
        return $dummy.OuterXml
    }

    Get-PageSource $el |
    ForEach-Object { $_.OuterXml }
`;

const GET_SCREENSHOT_COMMAND = pwsh /* ps1 */ `
    if ($rootElement -eq $null) {
        $bitmap = New-Object Drawing.Bitmap 1,1
        $stream = New-Object IO.MemoryStream
        $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        return [Convert]::ToBase64String($stream.ToArray())
    }

    $rect = $rootElement.Current.BoundingRectangle
    $bitmap = New-Object Drawing.Bitmap([int32]$rect.Width, [int32]$rect.Height)

    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen([int32]$rect.Left, [int32]$rect.Top, 0, 0, $bitmap.Size)
    $graphics.Dispose()

    $stream = New-Object IO.MemoryStream
    $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()

    [Convert]::ToBase64String($stream.ToArray())
`;

const SLEEP_INTERVAL_MS = 500;

export async function getPageSource(this: NovaWindowsDriver): Promise<string> {
    return await this.sendPowerShellCommand(GET_PAGE_SOURCE_COMMAND.format(AutomationElement.automationRoot));
}

export async function getScreenshot(this: NovaWindowsDriver): Promise<string> {
    const automationRootId = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand());

    if (this.caps.app && this.caps.app.toLowerCase() !== 'root') {
        try {
            await this.focusElement({
                [W3C_ELEMENT_KEY]: automationRootId.trim(),
            } satisfies Element);
        } catch {
            // noop
        }
    }

    return await this.sendPowerShellCommand(GET_SCREENSHOT_COMMAND);
}

export async function getWindowRect(this: NovaWindowsDriver): Promise<Rect> {
    const result = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetElementRectCommand());
    return JSON.parse(result.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString()));
}

export async function getWindowHandle(this: NovaWindowsDriver): Promise<string> {
    const nativeWindowHandle = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetPropertyCommand(Property.NATIVE_WINDOW_HANDLE));
    return `0x${Number(nativeWindowHandle).toString(16).padStart(8, '0')}`;
}

export async function getWindowHandles(this: NovaWindowsDriver): Promise<string[]> {
    if (this.appProcessIds.length > 0 && !this.caps.returnAllWindowHandles) {
        const handles = getWindowAllHandlesForProcessIds(this.appProcessIds);
        return handles.map((h) => `0x${h.toString(16).padStart(8, '0')}`);
    }

    const result = await this.sendPowerShellCommand(AutomationElement.rootElement.findAll(TreeScope.CHILDREN, new TrueCondition()).buildCommand());
    const elIds = result.split('\n').map((x) => x.trim()).filter(Boolean);
    const nativeWindowHandles: string[] = [];

    for (const elId of elIds) {
        const nativeWindowHandle = await this.sendPowerShellCommand(new FoundAutomationElement(elId).buildGetPropertyCommand(Property.NATIVE_WINDOW_HANDLE));
        nativeWindowHandles.push(`0x${Number(nativeWindowHandle).toString(16).padStart(8, '0')}`);
    }

    return nativeWindowHandles;
}

export async function setWindow(this: NovaWindowsDriver, nameOrHandle: string): Promise<void> {
    const handle = Number(nameOrHandle);
    const maxRetries = this.caps['ms:windowSwitchRetries'] ?? 20;
    const sleepInterval = this.caps['ms:windowSwitchInterval'] ?? SLEEP_INTERVAL_MS;
    for (let i = 1; i <= maxRetries; i++) {
        if (!isNaN(handle)) {
            const condition = new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(handle));
            const elementId = await this.sendPowerShellCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN_OR_SELF, condition).buildCommand());

            if (elementId.trim() !== '') {
                await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
                trySetForegroundWindow(handle);
                return;
            }
        }

        const name = nameOrHandle;
        const condition = new PropertyCondition(Property.NAME, new PSString(name));
        const elementId = await this.sendPowerShellCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN, condition).buildCommand());

        if (elementId.trim() !== '') {
            this.log.info(`Found window with name '${name}'. Setting it as the root element.`);
            await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
            trySetForegroundWindow(handle);
            return;
        }

        this.log.info(`Failed to locate window with name '${name}'. Sleeping for ${sleepInterval} milliseconds and retrying... (${i}/${maxRetries})`);
        await sleep(sleepInterval);
    }

    throw new errors.NoSuchWindowError(`No window was found with name or handle '${nameOrHandle}'.`);
}

export async function closeApp(this: NovaWindowsDriver): Promise<void> {
    const result = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand());
    const elementId = result.split('\n').map((id) => id.trim()).filter(Boolean)[0];
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active app window is found for this session.');
    }
    await this.sendPowerShellCommand(new FoundAutomationElement(elementId).buildCloseCommand());
    await this.sendPowerShellCommand(/* ps1 */ `$rootElement = $null`);
}

export async function launchApp(this: NovaWindowsDriver): Promise<void> {
    if (!this.caps.app || ['root', 'none'].includes(this.caps.app.toLowerCase())) {
        throw new errors.InvalidArgumentError('No app capability is set for this session.');
    }
    await this.changeRootElement(this.caps.app);
}

export async function changeRootElement(this: NovaWindowsDriver, path: string): Promise<void>
export async function changeRootElement(this: NovaWindowsDriver, nativeWindowHandle: number): Promise<void>
export async function changeRootElement(this: NovaWindowsDriver, pathOrNativeWindowHandle: string | number): Promise<void> {
    if (typeof pathOrNativeWindowHandle === 'number') {
        const nativeWindowHandle = pathOrNativeWindowHandle;
        const condition = new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(nativeWindowHandle));
        const elementId = await this.sendPowerShellCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN_OR_SELF, condition).buildCommand());

        if (elementId.trim() !== '') {
            await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
            trySetForegroundWindow(nativeWindowHandle);
            const pidResult = await this.sendPowerShellCommand(`$rootElement.Current.ProcessId`);
            const pid = Number(pidResult.trim());
            if (!isNaN(pid) && pid > 0) {
                this.appProcessIds = [pid];
            }
            return;
        }

        throw new errors.UnknownError('Failed to locate top level window with that window handle.');
    }


    const path = pathOrNativeWindowHandle;
    if (path.includes('!') && path.includes('_') && !(path.includes('/') || path.includes('\\'))) {
        this.log.debug('Detected app path to be in the UWP format.');
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process 'explorer.exe' 'shell:AppsFolder\\${path}'${this.caps.appArguments ? ` -ArgumentList '${this.caps.appArguments}'` : ''}`);
        const result = await this.sendPowerShellCommand(/* ps1 */ `(Get-Process -Name 'ApplicationFrameHost').Id`);
        const processIds = result.split('\n').map((pid) => pid.trim()).filter(Boolean).map(Number);
        this.log.debug(`Process IDs of ApplicationFrameHost processes (${processIds.length}): ` + processIds.join(', '));
        this.appProcessIds = processIds;
        await this.attachToApplicationWindow(processIds);
        const attachedPid = Number((await this.sendPowerShellCommand(`$rootElement.Current.ProcessId`)).trim());
        if (!isNaN(attachedPid) && attachedPid > 0) {
            this.appProcessIds = [attachedPid];
        }
    } else {
        this.log.debug('Detected app path to be in the classic format.');
        const normalizedPath = normalize(path);
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process '${normalizedPath}'${this.caps.appArguments ? ` -ArgumentList '${this.caps.appArguments}'` : ''}`);
        const breadcrumbs = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
        const executable = breadcrumbs[breadcrumbs.length - 1];
        const processName = executable.endsWith('.exe') ? executable.slice(0, executable.length - 4) : executable;
        const result = await this.sendPowerShellCommand(/* ps1 */ `(Get-Process -Name '${processName}' | Sort-Object StartTime -Descending).Id`);
        const processIds = result.split('\n').map((pid) => pid.trim()).filter(Boolean).map(Number);
        this.log.debug(`Process IDs of '${processName}' processes: ` + processIds.join(', '));
        this.appProcessIds = processIds;
        await this.attachToApplicationWindow(processIds);
        const attachedPid = Number((await this.sendPowerShellCommand(`$rootElement.Current.ProcessId`)).trim());
        if (!isNaN(attachedPid) && attachedPid > 0) {
            this.appProcessIds = [attachedPid];
        }
    }
}

export async function back(this: NovaWindowsDriver): Promise<void> {
    const elementId = (await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand())).trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    keyDown(Key.ALT);
    keyDown(Key.LEFT);
    keyUp(Key.LEFT);
    keyUp(Key.ALT);
}

export async function forward(this: NovaWindowsDriver): Promise<void> {
    const elementId = (await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand())).trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    keyDown(Key.ALT);
    keyDown(Key.RIGHT);
    keyUp(Key.RIGHT);
    keyUp(Key.ALT);
}

export async function title(this: NovaWindowsDriver): Promise<string> {
    const elementId = (await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand())).trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    return await this.sendPowerShellCommand(
        AutomationElement.automationRoot.buildGetPropertyCommand(Property.NAME)
    );
}

export async function setWindowRect(
    this: NovaWindowsDriver,
    x: number | null,
    y: number | null,
    width: number | null,
    height: number | null
): Promise<Rect> {
    if (width !== null && width < 0) {
        throw new errors.InvalidArgumentError('width must be a non-negative integer.');
    }
    if (height !== null && height < 0) {
        throw new errors.InvalidArgumentError('height must be a non-negative integer.');
    }

    const elementId = (await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand())).trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }

    const el = new FoundAutomationElement(elementId);
    if (x !== null && y !== null) {
        await this.sendPowerShellCommand(el.buildMoveCommand(x, y));
    }
    if (width !== null && height !== null) {
        await this.sendPowerShellCommand(el.buildResizeCommand(width, height));
    }

    return await this.getWindowRect();
}


export async function attachToApplicationWindow(this: NovaWindowsDriver, processIds: number[]): Promise<void> {
    this.log.debug(`Attaching to application window. Process IDs: [${processIds.join(', ')}]`);
    const timeout = (this.caps['ms:waitForAppLaunch'] ?? 0) * 1000 || SLEEP_INTERVAL_MS * 20;
    const start = Date.now();
    let attempts = 0;

    while (Date.now() - start < timeout) {
        const handles = getWindowAllHandlesForProcessIds(processIds);

        if (handles.length > 0) {
            this.log.debug(`Found ${handles.length} window handle(s) for PIDs [${processIds.join(', ')}]: ${handles.map((h) => `0x${h.toString(16).padStart(8, '0')}`).join(', ')}`);

            for (const handle of handles) {
                const elementId = await this.sendPowerShellCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN, new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(handle))).buildCommand());

                if (elementId.trim()) {
                    await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
                    if ((await this.sendPowerShellCommand(/* ps1 */ `$null -ne $rootElement`)).toLowerCase() === 'true') {
                        const confirmedHandle = Number(await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetPropertyCommand(Property.NATIVE_WINDOW_HANDLE)));
                        this.log.info(`Successfully attached to window. Native window handle: 0x${confirmedHandle.toString(16).padStart(8, '0')}`);
                        if (!trySetForegroundWindow(confirmedHandle)) {
                            await this.focusElement({
                                [W3C_ELEMENT_KEY]: elementId,
                            } satisfies Element);
                        }
                        return;
                    }
                }
            }
        }

        this.log.debug(`No attachable window found yet. Sleeping for ${SLEEP_INTERVAL_MS} milliseconds and retrying... (${++attempts}/${Math.floor(timeout / SLEEP_INTERVAL_MS)})`);
        await sleep(SLEEP_INTERVAL_MS);
    }

    throw new Error('Timed out waiting to attach to application window.');
}
