import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { Element, Rect } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import { $, sleep } from '../util';
import { POWER_SHELL_FEATURE } from '../constants';
import { keyDown,
    keyUp,
    mouseDown,
    mouseMoveAbsolute,
    mouseScroll,
    mouseUp,
    sendKeyboardEvents
} from '../winapi/user32';
import { KeyEventFlags, VirtualKey } from '../winapi/types';
import {
    AutomationElement,
    AutomationElementMode,
    FoundAutomationElement,
    PSInt32,
    PSInt32Array,
    Property,
    PropertyCondition,
    PropertyRegexMatcher,
    TreeScope,
    convertStringToCondition,
    pwsh
} from '../powershell';
import { ClickType, Enum, Key } from '../enums';
import { getBundledFfmpegPath } from '../util';

const PLATFORM_COMMAND_PREFIX = 'windows:';

const EXTENSION_COMMANDS = Object.freeze({
    cacheRequest: 'pushCacheRequest',
    invoke: 'patternInvoke',
    expand: 'patternExpand',
    collapse: 'patternCollapse',
    isMultiple: 'patternIsMultiple',
    scrollIntoView: 'patternScrollIntoView',
    selectedItem: 'patternGetSelectedItem',
    allSelectedItems: 'patternGetAllSelectedItems',
    addToSelection: 'patternAddToSelection',
    removeFromSelection: 'patternRemoveFromSelection',
    select: 'patternSelect',
    toggle: 'patternToggle',
    setValue: 'patternSetValue',
    getValue: 'patternGetValue',
    maximize: 'patternMaximize',
    minimize: 'patternMinimize',
    restore: 'patternRestore',
    close: 'patternClose',
    closeApp: 'closeApp',
    launchApp: 'launchApp',
    keys: 'executeKeys',
    click: 'executeClick',
    hover: 'executeHover',
    scroll: 'executeScroll',
    setFocus: 'focusElement',
    getClipboard: 'getClipboardBase64',
    setClipboard: 'setClipboardFromBase64',
    startRecordingScreen: 'startRecordingScreen',
    stopRecordingScreen: 'stopRecordingScreen',
    deleteFile: 'deleteFile',
    deleteFolder: 'deleteFolder',
    clickAndDrag: 'executeClickAndDrag',
} as const);

const ContentType = Object.freeze({
    PLAINTEXT: 'plaintext',
    IMAGE: 'image',
} as const);

type ContentType = Enum<typeof ContentType>;

const TREE_FILTER_COMMAND = $ /* ps1 */ `$cacheRequest.Pop(); $cacheRequest.TreeFilter = ${0}; $cacheRequest.Push()`;
const TREE_SCOPE_COMMAND = $ /* ps1 */ `$cacheRequest.Pop(); $cacheRequest.TreeScope = ${0}; $cacheRequest.Push()`;
const AUTOMATION_ELEMENT_MODE = $ /* ps1 */ `$cacheRequest.Pop(); $cacheRequest.AutomationElementMode = ${0}; $cacheRequest.Push()`;

const SET_PLAINTEXT_CLIPBOARD_FROM_BASE64 = $ /* ps1 */ `Set-Clipboard -Value [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${0}))`;
const GET_PLAINTEXT_CLIPBOARD_BASE64 = /* ps1 */ `[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Clipboard)))`;

const SET_IMAGE_CLIPBOARD_FROM_BASE64 = $ /* ps1 */ `$b = [Convert]::FromBase64String(${0}); $s = New-Object IO.MemoryStream; $s.Write($b, 0, $b.Length); $s.Position = 0; $i = [System.Windows.Media.Imaging.BitmapFrame]::Create($s); [Windows.Clipboard]::SetImage($i); $s.Close()`;
const GET_IMAGE_CLIPBOARD_BASE64 = pwsh /* ps1 */ `
    [Windows.Clipboard]::GetImage() | ForEach-Object {
            if ($_ -ne $null) {
                $stream = New-Object IO.MemoryStream
            $encoder = New-Object Windows.Media.Imaging.PngBitmapEncoder
            $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($_))
            $encoder.Save($stream)
            $stream.Position = 0
            $bytes = $stream.ToArray()
            $base64String = [Convert]::ToBase64String($bytes)
            $stream.Close()
            Write-Output $base64String
        }
    }
`;

type KeyAction = {
    pause?: number,
    text?: string,
    virtualKeyCode?: number,
    down?: boolean,
}

export async function execute(this: NovaWindowsDriver, script: string, args: any[]) {
    if (script.startsWith(PLATFORM_COMMAND_PREFIX)) {
        script = script.replace(PLATFORM_COMMAND_PREFIX, '').trim();
        this.log.info(`Executing command '${PLATFORM_COMMAND_PREFIX} ${script}'...`);

        if (!Object.hasOwn(EXTENSION_COMMANDS, script)) {
            throw new errors.UnknownCommandError(`Unknown command '${PLATFORM_COMMAND_PREFIX} ${script}'.`);
        }

        return await this[EXTENSION_COMMANDS[script]](...args);
    }

    if (script === 'powerShell') {
        this.assertFeatureEnabled(POWER_SHELL_FEATURE);
        return await this.executePowerShellScript(args[0]);
    }

    if (script === 'return window.name') {
        return await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetPropertyCommand(Property.NAME));
    }

    throw new errors.NotImplementedError();
};

type CacheRequest = {
    treeScope?: string,
    treeFilter?: string,
    automationElementMode?: string,
}

const TREE_SCOPE_REGEX = new PropertyRegexMatcher('System.Windows.Automation.TreeScope', ...Object.values(TreeScope)).toRegex('i');
const AUTOMATION_ELEMENT_MODE_REGEX = new PropertyRegexMatcher('System.Windows.Automation.AutomationElementMode', ...Object.values(AutomationElementMode)).toRegex('i');

export async function pushCacheRequest(this: NovaWindowsDriver, cacheRequest: CacheRequest): Promise<void> {
    if (Object.keys(cacheRequest).every((key) => cacheRequest[key] === undefined)) {
        throw new errors.InvalidArgumentError('At least one property of the cache request must be set.');
    }

    if (cacheRequest.treeFilter) {
        await this.sendPowerShellCommand(TREE_FILTER_COMMAND.format(convertStringToCondition(cacheRequest.treeFilter)));
    }

    if (cacheRequest.treeScope) {
        const treeScope = TREE_SCOPE_REGEX.exec(cacheRequest.treeScope)?.groups?.[0];
        if (!treeScope || (Number(cacheRequest.treeScope) < 1 && Number(cacheRequest.treeScope) > 16)) {
            throw new errors.InvalidArgumentError(`Invalid value '${cacheRequest.treeScope}' passed to TreeScope for cache request.`);
        }

        await this.sendPowerShellCommand(TREE_SCOPE_COMMAND.format(isNaN(Number(cacheRequest.treeScope)) ? /* ps1 */ `[TreeScope]::${cacheRequest.treeScope}` : cacheRequest.treeScope));
    }

    if (cacheRequest.automationElementMode) {
        const treeScope = AUTOMATION_ELEMENT_MODE_REGEX.exec(cacheRequest.automationElementMode)?.groups?.[0];

        if (!treeScope || (Number(cacheRequest.automationElementMode) < 0 && Number(cacheRequest.automationElementMode) > 1)) {
            throw new errors.InvalidArgumentError(`Invalid value '${cacheRequest.automationElementMode}' passed to AutomationElementMode for cache request.`);
        }

        let automationElementMode: string;
        if (isNaN(Number(cacheRequest.automationElementMode))) {
            automationElementMode = /* ps1 */ `[AutomationElementMode]::${cacheRequest.automationElementMode}`;
        } else {
            automationElementMode = cacheRequest.automationElementMode;
        }

        await this.sendPowerShellCommand(AUTOMATION_ELEMENT_MODE.format(automationElementMode));
    }
}

export async function patternInvoke(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildInvokeCommand());
}

export async function patternExpand(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildExpandCommand());
}

export async function patternCollapse(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildCollapseCommand());
}

export async function patternScrollIntoView(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildScrollIntoViewCommand());
}

export async function patternIsMultiple(this: NovaWindowsDriver, element: Element): Promise<boolean> {
    const result = await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildIsMultipleSelectCommand());
    return result.toLowerCase() === 'true' ? true : false;
}

export async function patternGetSelectedItem(this: NovaWindowsDriver, element: Element): Promise<Element> {
    const result = await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildGetSelectionCommand());
    const elId = result.split('\n').filter(Boolean)[0];

    if (!elId) {
        throw new errors.NoSuchElementError();
    }

    return { [W3C_ELEMENT_KEY]: elId };
}

export async function patternGetAllSelectedItems(this: NovaWindowsDriver, element: Element): Promise<Element[]> {
    const result = await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildGetSelectionCommand());
    return result.split('\n').filter(Boolean).map((elId) => ({ [W3C_ELEMENT_KEY]: elId }));
}

export async function patternAddToSelection(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildAddToSelectionCommand());
}

export async function patternRemoveFromSelection(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildRemoveFromSelectionCommand());
}

export async function patternSelect(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildSelectCommand());
}

export async function patternToggle(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildToggleCommand());
}

export async function patternSetValue(this: NovaWindowsDriver, element: Element, value: string): Promise<void> {
    try {
        await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildSetValueCommand(value));
    } catch {
        await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildSetRangeValueCommand(value));
    }
}

export async function patternGetValue(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildGetValueCommand());
}

export async function patternMaximize(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildMaximizeCommand());
}

export async function patternMinimize(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildMinimizeCommand());
}

export async function patternRestore(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildRestoreCommand());
}

export async function patternClose(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildCloseCommand());
}

export async function closeApp(this: NovaWindowsDriver, args: {
    processId?: number,
    processName?: string,
    windowHandle?: string | number,
}): Promise<void> {
    const { processId, processName, windowHandle } = args ?? {};
    const provided = [processId, processName, windowHandle].filter((v) => v != null).length;

    if (provided !== 1) {
        throw new errors.InvalidArgumentError(
            'Exactly one of processId, processName, or windowHandle must be provided.'
        );
    }

    if (processId != null) {
        await this.sendPowerShellCommand(`Stop-Process -Id ${processId}`);
        return;
    }

    if (processName != null) {
        await this.sendPowerShellCommand(`Stop-Process -Name '${processName}'`);
        return;
    }

    if (windowHandle != null) {
        const handle = typeof windowHandle === 'string' ? parseInt(windowHandle, 16) : windowHandle;
        const condition = new PropertyCondition(Property.NATIVE_WINDOW_HANDLE, new PSInt32(handle));
        const elementId = await this.sendPowerShellCommand(
            AutomationElement.rootElement
                .findFirst(TreeScope.CHILDREN_OR_SELF, condition)
                .buildCommand()
        );
        if (!elementId?.trim()) {
            throw new errors.NoSuchWindowError(`No window found with handle ${windowHandle}`);
        }
        const processId = await this.sendPowerShellCommand(
            new FoundAutomationElement(elementId.trim()).buildGetPropertyCommand(Property.PROCESS_ID)
        );
        if (!processId?.trim()) {
            throw new errors.UnknownError(`Could not get process ID for window handle ${windowHandle}`);
        }
        await this.sendPowerShellCommand(`Stop-Process -Id ${processId.trim()}`);
    }
}

export async function launchApp(this: NovaWindowsDriver, args: {
    app: string,
    appArguments?: string,
}): Promise<void> {
    if (!args || typeof args !== 'object' || !args.app) {
        throw new errors.InvalidArgumentError("'app' must be provided.");
    }

    const { app, appArguments } = args;
    if (app.includes('!') && app.includes('_') && !(app.includes('/') || app.includes('\\'))) {
        this.log.debug('Detected app path to be in the UWP format.');
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process 'explorer.exe' 'shell:AppsFolder\\${app}'${appArguments ? ` -ArgumentList '${appArguments}'` : ''}`);
    } else {
        this.log.debug('Detected app path to be in the classic format.');
        const normalizedPath = normalize(app);
        await this.sendPowerShellCommand(/* ps1 */ `Start-Process '${normalizedPath}'${appArguments ? ` -ArgumentList '${appArguments}'` : ''}`);
    }
    await sleep(1500); // Wait for the app to start
}

export async function focusElement(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendPowerShellCommand(new FoundAutomationElement(element[W3C_ELEMENT_KEY]).buildSetFocusCommand());
}

export async function getClipboardBase64(this: NovaWindowsDriver, contentType?: ContentType | { contentType?: ContentType }): Promise<string> {
    if (!contentType || (contentType && typeof contentType === 'object')) {
        contentType = contentType?.contentType ?? ContentType.PLAINTEXT;
    }

    switch (contentType.toLowerCase()) {
        case ContentType.PLAINTEXT:
            return await this.sendPowerShellCommand(GET_PLAINTEXT_CLIPBOARD_BASE64);
        case ContentType.IMAGE:
            return await this.sendPowerShellCommand(GET_IMAGE_CLIPBOARD_BASE64);
        default:
            throw new errors.InvalidArgumentError(`Unsupported content type '${contentType}'.`);
    }
}

export async function setClipboardFromBase64(this: NovaWindowsDriver, args: { contentType?: ContentType, b64Content: string }): Promise<string> {
    if (!args || typeof args !== 'object' || !args.b64Content) {
        throw new errors.InvalidArgumentError(`'b64Content' must be provided.`);
    }

    const contentType = args.contentType ?? ContentType.PLAINTEXT;

    switch (contentType.toLowerCase()) {
        case ContentType.PLAINTEXT:
            return await this.sendPowerShellCommand(SET_PLAINTEXT_CLIPBOARD_FROM_BASE64.format(args.b64Content));
        case ContentType.IMAGE:
            return await this.sendPowerShellCommand(SET_IMAGE_CLIPBOARD_FROM_BASE64.format(args.b64Content));
        default:
            throw new errors.InvalidArgumentError(`Unsupported content type '${contentType}'.`);
    }
}

export async function executePowerShellScript(this: NovaWindowsDriver, script: string | { script: string, command: undefined } | { script: undefined, command: string }): Promise<string> {
    if (script && typeof script === 'object') {
        if (script.script) {
            script = script.script;
        } else if (script.command) {
            script = script.command;
        } else {
            throw new errors.InvalidArgumentError('Either script or command must be provided.');
        }
    }

    const scriptToExecute = pwsh`${script}`;
    if (this.caps.isolatedScriptExecution) {
        return await this.sendIsolatedPowerShellCommand(scriptToExecute);
    } else {
        return await this.sendPowerShellCommand(scriptToExecute);
    }
}

export async function executeKeys(this: NovaWindowsDriver, keyActions: { actions: KeyAction | KeyAction[], forceUnicode: boolean }) {
    if (!Array.isArray(keyActions.actions)) {
        keyActions.actions = [keyActions.actions];
    }

    keyActions.forceUnicode ??= false;

    for (const action of keyActions.actions) {
        if (Number(!!action.pause) + Number(!!action.text) + Number(!!action.virtualKeyCode) !== 1) {
            throw new errors.InvalidArgumentError('Either pause, text or virtualKeyCode should be set.');
        }

        if (action.pause) {
            await sleep(action.pause);
            continue;
        }

        if (action.virtualKeyCode) {
            if (action.down === undefined) {
                sendKeyboardEvents([{
                    wVk: action.virtualKeyCode as VirtualKey,
                    wScan: 0,
                    dwFlags: 0,
                    time: 0,
                    dwExtraInfo: 0,
                }, {
                    wVk: action.virtualKeyCode as VirtualKey,
                    wScan: 0,
                    dwFlags: KeyEventFlags.KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                }]);
            } else {
                sendKeyboardEvents([{
                    wVk: action.virtualKeyCode as VirtualKey,
                    wScan: 0,
                    dwFlags: action.down ? 0 : KeyEventFlags.KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                }]);
            }
            continue;
        }

        for (const key of action.text ?? []) {
            if (action.down !== undefined) {
                if (action.down) {
                    keyDown(key, keyActions.forceUnicode);
                } else {
                    keyUp(key, keyActions.forceUnicode);
                }
            } else {
                keyDown(key, keyActions.forceUnicode);
                keyUp(key, keyActions.forceUnicode);
            }
        }
    }
}

export async function executeClick(this: NovaWindowsDriver, clickArgs: {
    elementId?: string,
    x?: number,
    y?: number,
    button?: ClickType,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[], // TODO: add types
    durationMs?: number,
    times?: number,
    interClickDelayMs?: number
}) {
    const {
        elementId,
        x, y,
        button = ClickType.LEFT,
        modifierKeys = [],
        durationMs = 0,
        times = 1,
        interClickDelayMs = 100,
    } = clickArgs;

    if ((x != null) !== (y != null)) {
        throw new errors.InvalidArgumentError('Both x and y must be provided if either is set.');
    }

    let pos: [number, number];
    if (elementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(elementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(elementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(elementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        pos = [
            rect.x + (x ?? Math.trunc(rect.width / 2)),
            rect.y + (y ?? Math.trunc(rect.height / 2)),
        ];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pos = [x!, y!];
    }

    const clickTypeToButtonMapping: { [key in ClickType]: number} = {
        [ClickType.LEFT]: 0,
        [ClickType.MIDDLE]: 1,
        [ClickType.RIGHT]: 2,
        [ClickType.BACK]: 3,
        [ClickType.FORWARD]: 4
    };
    const mouseButton: number = clickTypeToButtonMapping[button];

    const processesModifierKeys = Array.isArray(modifierKeys) ? modifierKeys : [modifierKeys];
    await mouseMoveAbsolute(pos[0], pos[1], 0);
    for (let i = 0; i < times; i++) {
        if (i !== 0) {
            await sleep(interClickDelayMs);
        }

        if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
            keyDown(Key.CONTROL);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
            keyDown(Key.ALT);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
            keyDown(Key.SHIFT);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
            keyDown(Key.META);
        }

        mouseDown(mouseButton);
        if (durationMs > 0) {
            await sleep(durationMs);
        }
        mouseUp(mouseButton);

        if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
            keyUp(Key.CONTROL);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
            keyUp(Key.ALT);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
            keyUp(Key.SHIFT);
        }
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
            keyUp(Key.META);
        }
    }

    if (this.caps.delayAfterClick) {
        await sleep(this.caps.delayAfterClick ?? 0);
    }
}

export async function executeHover(this: NovaWindowsDriver, hoverArgs: {
    startElementId?: string,
    startX?: number,
    startY?: number,
    endElementId?: string,
    endX?: number,
    endY?: number,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[],
    durationMs?: number,
}) {
    const {
        startElementId,
        startX, startY,
        endElementId,
        endX, endY,
        modifierKeys = [],
        durationMs = 500,
    } = hoverArgs;

    if ((startX != null) !== (startY != null)) {
        throw new errors.InvalidArgumentError('Both startX and startY must be provided if either is set.');
    }

    if ((endX != null) !== (endY != null)) {
        throw new errors.InvalidArgumentError('Both endX and endY must be provided if either is set.');
    }

    const processesModifierKeys = Array.isArray(modifierKeys) ? modifierKeys : [modifierKeys];
    let startPos: [number, number];
    if (startElementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(startElementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(startElementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(startElementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        startPos = [
            rect.x + (startX ?? rect.width / 2),
            rect.y + (startY ?? rect.height / 2)
        ];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        startPos = [startX!, startY!];
    }

    let endPos: [number, number];
    if (endElementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(endElementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(endElementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(endElementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        endPos = [
            rect.x + (endX ?? rect.width / 2),
            rect.y + (endY ?? rect.height / 2)
        ];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        endPos = [endX!, endY!];
    }

    await mouseMoveAbsolute(startPos[0], startPos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyDown(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyDown(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyDown(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyDown(Key.META);
    }

    await mouseMoveAbsolute(endPos[0], endPos[1], durationMs, this.caps.smoothPointerMove);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyUp(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyUp(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyUp(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyUp(Key.META);
    }
}

export async function executeScroll(this: NovaWindowsDriver, scrollArgs: {
    elementId?: string,
    x?: number,
    y?: number,
    deltaX?: number,
    deltaY?: number,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[], // TODO: add types
}) {
    const {
        elementId,
        x, y,
        deltaX, deltaY,
        modifierKeys = [],
    } = scrollArgs;

    if (!!elementId && ((x !== null && x !== undefined) || (y !== null && y !== undefined))) {
        throw new errors.InvalidArgumentError('Either elementId or x and y must be provided.');
    }

    if ((x !== null && x !== undefined) !== (y !== null && y !== undefined)) {
        throw new errors.InvalidArgumentError('Both x and y must be provided.');
    }

    const processesModifierKeys = Array.isArray(modifierKeys) ? modifierKeys : [modifierKeys];
    let pos: [number, number];
    if (elementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(elementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(elementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(elementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        pos = [rect.x + (rect.width / 2), rect.y + (rect.height / 2)];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pos = [x!, y!];
    }

    await mouseMoveAbsolute(pos[0], pos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyDown(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyDown(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyDown(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyDown(Key.META);
    }

    mouseScroll(deltaX ?? 0, deltaY ?? 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyUp(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyUp(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyUp(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyUp(Key.META);
    }
}

export async function startRecordingScreen(this: NovaWindowsDriver, args?: {
    outputPath?: string,
    timeLimit?: number,
    videoSize?: string,
    videoFps?: number,
    forceRestart?: boolean,
}): Promise<void> {
    const {
        outputPath = join(tmpdir(), `novawindows-recording-${Date.now()}.mp4`),
        timeLimit = 180,
        videoSize,
        videoFps = 15,
        forceRestart = false,
    } = args ?? {};

    if (this.recordingProcess && !forceRestart) {
        throw new errors.InvalidArgumentError('Screen recording is already in progress. Use forceRestart to start a new recording.');
    }

    if (this.recordingProcess && forceRestart) {
        const oldProc = this.recordingProcess;
        this.recordingProcess = undefined;
        this.recordingOutputPath = undefined;
        oldProc.stdin?.write('q');
        try {
            await new Promise<void>((resolve) => {
                oldProc.on('exit', () => resolve());
                setTimeout(() => {
                    oldProc.kill('SIGKILL');
                    resolve();
                }, 3000);
            });
        } catch {
            oldProc.kill('SIGKILL');
        }
    }

    const ffmpegPath = getBundledFfmpegPath();
    if (!ffmpegPath) {
        throw new errors.UnknownError(
            'Screen recording is not available: the bundled ffmpeg is missing. Reinstall the driver.'
        );
    }

    const ffmpegArgs = [
        '-f', 'gdigrab',
        '-framerate', String(videoFps),
        '-i', 'desktop',
        '-t', String(timeLimit),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-y',
        outputPath,
    ];
    if (videoSize) {
        const sizeIdx = ffmpegArgs.indexOf('-i');
        ffmpegArgs.splice(sizeIdx, 0, '-video_size', videoSize);
    }

    const proc = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.on('error', (err) => {
        this.log.error(
            `Screen recording failed: ${err.message}. The bundled ffmpeg may be missing or invalid; try reinstalling the driver.`
        );
    });
    proc.stderr?.on('data', () => { /* suppress ffmpeg progress output */ });

    this.recordingProcess = proc as ChildProcessWithoutNullStreams;
    this.recordingOutputPath = outputPath;
}

export async function stopRecordingScreen(this: NovaWindowsDriver, args?: { remotePath?: string }): Promise<string> {
    const { remotePath } = args ?? {};

    if (!this.recordingProcess || !this.recordingOutputPath) {
        throw new errors.InvalidArgumentError('No screen recording in progress.');
    }

    const proc = this.recordingProcess;
    const outputPath = this.recordingOutputPath;
    this.recordingProcess = undefined;
    this.recordingOutputPath = undefined;

    proc.stdin?.write('q');

    await new Promise<void>((resolve) => {
        proc.on('exit', () => resolve());
        setTimeout(() => resolve(), 5000);
    });

    if (remotePath) {
        // TODO: upload to remotePath; for now return empty per Appium convention
        try {
            await unlink(outputPath);
        } catch {
            /* ignore */
        }
        return '';
    }

    try {
        const buffer = await readFile(outputPath);
        await unlink(outputPath);
        return buffer.toString('base64');
    } catch (err) {
        throw new errors.UnknownError(`Failed to read recording: ${(err as Error).message}`);
    }
}

export async function deleteFile(this: NovaWindowsDriver, args: { path: string }): Promise<void> {
    if (!args || typeof args !== 'object' || !args.path) {
        throw new errors.InvalidArgumentError("'path' must be provided.");
    }
    const escapedPath = args.path.replace(/'/g, "''");
    const useLiteralPath = /[\[\]?]/.test(args.path);
    const pathParam = useLiteralPath ? `-LiteralPath '${escapedPath}'` : `-Path '${escapedPath}'`;
    await this.sendPowerShellCommand(`Remove-Item ${pathParam} -Force -ErrorAction Stop`);
}

export async function deleteFolder(this: NovaWindowsDriver, args: { path: string, recursive?: boolean }): Promise<void> {
    if (!args || typeof args !== 'object' || !args.path) {
        throw new errors.InvalidArgumentError("'path' must be provided.");
    }
    const { path: pathArg, recursive = true } = args;
    const escapedPath = pathArg.replace(/'/g, "''");
    const useLiteralPath = /[\[\]?]/.test(pathArg);
    const pathParam = useLiteralPath ? `-LiteralPath '${escapedPath}'` : `-Path '${escapedPath}'`;
    const recurseFlag = recursive ? ' -Recurse' : '';
    await this.sendPowerShellCommand(`Remove-Item ${pathParam} -Force${recurseFlag} -ErrorAction Stop`);
}

export async function executeClickAndDrag(this: NovaWindowsDriver, dragArgs: {
    startElementId?: string,
    startX?: number,
    startY?: number,
    endElementId?: string,
    endX?: number,
    endY?: number,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[],
    durationMs?: number,
    button?: ClickType,
}) {
    const {
        startElementId,
        startX, startY,
        endElementId,
        endX, endY,
        modifierKeys = [],
        durationMs = 500,
        button = ClickType.LEFT,
    } = dragArgs ?? {};

    if ((startX != null) !== (startY != null)) {
        throw new errors.InvalidArgumentError('Both startX and startY must be provided if either is set.');
    }

    if ((endX != null) !== (endY != null)) {
        throw new errors.InvalidArgumentError('Both endX and endY must be provided if either is set.');
    }

    const processesModifierKeys = Array.isArray(modifierKeys) ? modifierKeys : [modifierKeys];
    const clickTypeToButtonMapping: { [key in ClickType]: number } = {
        [ClickType.LEFT]: 0,
        [ClickType.MIDDLE]: 1,
        [ClickType.RIGHT]: 2,
        [ClickType.BACK]: 3,
        [ClickType.FORWARD]: 4,
    };
    const mouseButton = clickTypeToButtonMapping[button];

    let startPos: [number, number];
    if (startElementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(startElementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(startElementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(startElementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        startPos = [
            rect.x + (startX ?? rect.width / 2),
            rect.y + (startY ?? rect.height / 2)
        ];
    } else {
        if (startX == null || startY == null) {
            throw new errors.InvalidArgumentError('Either startElementId or startX and startY must be provided.');
        }
        startPos = [startX, startY];
    }

    let endPos: [number, number];
    if (endElementId) {
        if (await this.sendPowerShellCommand(/* ps1 */ `$null -eq ${new FoundAutomationElement(endElementId).toString()}`)) {
            const condition = new PropertyCondition(Property.RUNTIME_ID, new PSInt32Array(endElementId.split('.').map(Number)));
            const elId = await this.sendPowerShellCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, condition).buildCommand());

            if (elId.trim() === '') {
                throw new errors.NoSuchElementError();
            }
        }

        const rectJson = await this.sendPowerShellCommand(new FoundAutomationElement(endElementId).buildGetElementRectCommand());
        const rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
        endPos = [
            rect.x + (endX ?? rect.width / 2),
            rect.y + (endY ?? rect.height / 2)
        ];
    } else {
        if (endX == null || endY == null) {
            throw new errors.InvalidArgumentError('Either endElementId or endX and endY must be provided.');
        }
        endPos = [endX, endY];
    }

    await mouseMoveAbsolute(startPos[0], startPos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyDown(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyDown(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyDown(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyDown(Key.META);
    }

    mouseDown(mouseButton);
    await mouseMoveAbsolute(endPos[0], endPos[1], durationMs, this.caps.smoothPointerMove);
    mouseUp(mouseButton);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) {
        keyUp(Key.CONTROL);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) {
        keyUp(Key.ALT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) {
        keyUp(Key.SHIFT);
    }
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) {
        keyUp(Key.META);
    }
}
