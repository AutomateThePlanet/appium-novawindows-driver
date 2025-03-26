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
    trySetForegroundWindow,
} from '../winapi/user32';

const GET_PAGE_SOURCE_COMMAND = pwsh$ /* ps1 */ `
    $el = ${0}

    Get-PageSource $el |
    ForEach-Object { $_.OuterXml }
`;

const GET_SCREENSHOT_COMMAND = pwsh /* ps1 */ `
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

export async function getPageSource(this: NovaWindowsDriver): Promise<string> {
    return await this.sendPowerShellCommand(GET_PAGE_SOURCE_COMMAND.format(AutomationElement.automationRoot));
}

export async function getScreenshot(this: NovaWindowsDriver): Promise<string> {
    // TODO: check if it causes problem if child window is opened
    const automationRootId = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildCommand());
    await this.focusElement({
        [W3C_ELEMENT_KEY]: automationRootId.trim(),
    } satisfies Element);

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
    for (let i = 1; i <= 20; i++) { // TODO: make a setting for the number of retries or timeout
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
            await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
            trySetForegroundWindow(handle);
            return;
        }

        this.log.info(`Failed to locate window. Sleeping for 500 milliseconds and retrying... (${i}/20)`); // TODO: make a setting for the number of retries or timeout
        await sleep(500); // TODO: make a setting for the sleep timeout
    }

    throw new errors.NoSuchWindowError(`No window was found with name or handle '${nameOrHandle}'.`);
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
            return;
        }

        throw new errors.UnknownError('Failed to locate top level window with that window handle.');
    }


    const path = pathOrNativeWindowHandle;
    if (path.includes('!') && path.includes('_') && !(path.includes('/') || path.includes('\\'))) {
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process 'explorer.exe' 'shell:AppsFolder\\${path}'`);
        await sleep(500); // TODO: make a setting for the initial wait time
        for (let i = 1; i <= 20; i++) {
            const result = await this.sendPowerShellCommand(/* ps1 */ `(Get-Process -Name 'ApplicationFrameHost').Id`);
            const processIds = result.split('\n').map((pid) => pid.trim()).filter(Boolean).map(Number);

            try {
                await this.attachToApplicationWindow(processIds);
                return;
            } catch {
                // noop
            }

            this.log.info(`Failed to locate window of the app. Sleeping for 500 milliseconds and retrying... (${i}/20)`); // TODO: make a setting for the number of retries or timeout
            await sleep(500); // TODO: make a setting for the sleep timeout
        }
    } else {
        const normalizedPath = normalize(path);
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process '${normalizedPath}'`);
        await sleep(500); // TODO: make a setting for the initial wait time
        for (let i = 1; i <= 20; i++) {
            try {
                const breadcrumbs = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
                const executable = breadcrumbs[breadcrumbs.length - 1];
                const processName = executable.endsWith('.exe') ? executable.slice(0, executable.length - 4) : executable;
                const result = await this.sendPowerShellCommand(/* ps1 */ `(Get-Process -Name '${processName}' | Sort-Object StartTime -Descending).Id`);
                const processIds = result.split('\n').map((pid) => pid.trim()).filter(Boolean).map(Number);

                await this.attachToApplicationWindow(processIds);
                return;
            } catch (err) {
                if (err instanceof Error) {
                    this.log.debug(`Received error:\n${err.message}`);
                }
            }

            this.log.info(`Failed to locate window of the app. Sleeping for 500 milliseconds and retrying... (${i}/20)`); // TODO: make a setting for the number of retries or timeout
            await sleep(500); // TODO: make a setting for the sleep timeout
        }
    }

    throw new errors.UnknownError('Failed to locate window of the app.');
}

export async function attachToApplicationWindow(this: NovaWindowsDriver, processIds: number[]): Promise<void> {
    const nativeWindowHandles = getWindowAllHandlesForProcessIds(processIds);

    if (nativeWindowHandles.length !== 0) {
        const elementId = await this.sendPowerShellCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN, new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(nativeWindowHandles[0]))).buildCommand());
        await this.sendPowerShellCommand(/* ps1 */ `$rootElement = ${new FoundAutomationElement(elementId).buildCommand()}`);
        if ((await this.sendPowerShellCommand(/* ps1 */ `$null -ne $rootElement`)).toLowerCase() === 'true') {
            const nativeWindowHandle = Number(await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetPropertyCommand(Property.NATIVE_WINDOW_HANDLE)));
            if (!trySetForegroundWindow(nativeWindowHandle)) {
                await this.focusElement({
                    [W3C_ELEMENT_KEY]: elementId,
                } satisfies Element);
            };
            return;
        }
    }
}
