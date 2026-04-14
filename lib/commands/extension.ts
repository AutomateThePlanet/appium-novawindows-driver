import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { Element, Rect } from '@appium/types';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { MODIFY_FS_FEATURE, POWER_SHELL_FEATURE } from '../constants';
import { NovaWindowsDriver } from '../driver';
import { ClickType, Enum, Key } from '../enums';
import { propertyCondition } from '../server/conditions';
import { conditionToDto } from '../server/converter-bridge';
import { convertStringToCondition } from '../powershell/converter';
import { Property } from '../powershell/types';
import type { RectResult } from '../server/protocol';
import { $, sleep } from '../util';
import { DEFAULT_EXT, ScreenRecorder, UploadOptions, uploadRecordedMedia } from './screen-recorder';
import { KeyEventFlags, VirtualKey } from '../winapi/types';
import {
    keyDown,
    keyUp,
    mouseDown,
    mouseMoveAbsolute,
    mouseScroll,
    mouseUp,
    sendKeyboardEvents
} from '../winapi/user32';

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
    closeApp: 'windowsCloseApp',
    launchApp: 'windowsLaunchApp',
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
    getDeviceTime: 'windowsGetDeviceTime',
    getWindowElement: 'getWindowElement',
} as const);

const ContentType = Object.freeze({
    PLAINTEXT: 'plaintext',
    IMAGE: 'image',
} as const);

type ContentType = Enum<typeof ContentType>;

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
        const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
        return await this.sendCommand('getProperty', { elementId: rootId, property: 'Name' }) as string;
    }

    throw new errors.NotImplementedError();
};

type CacheRequest = {
    treeScope?: string,
    treeFilter?: string,
    automationElementMode?: string,
}

export async function pushCacheRequest(this: NovaWindowsDriver, cacheRequest: CacheRequest): Promise<void> {
    if (Object.keys(cacheRequest).every((key) => cacheRequest[key] === undefined)) {
        throw new errors.InvalidArgumentError('At least one property of the cache request must be set.');
    }

    if (cacheRequest.treeFilter) {
        const condition = convertStringToCondition(cacheRequest.treeFilter);
        await this.sendCommand('setCacheRequestTreeFilter', { condition: conditionToDto(condition) });
    }

    if (cacheRequest.treeScope) {
        await this.sendCommand('setCacheRequestTreeScope', { scope: cacheRequest.treeScope });
    }

    if (cacheRequest.automationElementMode) {
        await this.sendCommand('setCacheRequestAutomationElementMode', { mode: cacheRequest.automationElementMode });
    }
}

export async function patternInvoke(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('invokeElement', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternExpand(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('expandElement', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternCollapse(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('collapseElement', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternScrollIntoView(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('scrollElementIntoView', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternIsMultiple(this: NovaWindowsDriver, element: Element): Promise<boolean> {
    const result = await this.sendCommand('isMultipleSelect', { elementId: element[W3C_ELEMENT_KEY] });
    return result === true || String(result).toLowerCase() === 'true';
}

export async function patternGetSelectedItem(this: NovaWindowsDriver, element: Element): Promise<Element> {
    const result = await this.sendCommand('getSelectedElements', { elementId: element[W3C_ELEMENT_KEY] }) as string[];
    const elId = result?.[0];

    if (!elId) {
        throw new errors.NoSuchElementError();
    }

    return { [W3C_ELEMENT_KEY]: elId };
}

export async function patternGetAllSelectedItems(this: NovaWindowsDriver, element: Element): Promise<Element[]> {
    const result = await this.sendCommand('getSelectedElements', { elementId: element[W3C_ELEMENT_KEY] }) as string[];
    return (result ?? []).map((elId) => ({ [W3C_ELEMENT_KEY]: elId }));
}

export async function patternAddToSelection(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('addToSelection', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternRemoveFromSelection(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('removeFromSelection', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternSelect(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('selectElement', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternToggle(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('toggleElement', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternSetValue(this: NovaWindowsDriver, element: Element, value: string): Promise<void> {
    try {
        await this.sendCommand('setElementValue', { elementId: element[W3C_ELEMENT_KEY], value });
    } catch {
        await this.sendCommand('setElementRangeValue', { elementId: element[W3C_ELEMENT_KEY], value: Number(value) });
    }
}

export async function patternGetValue(this: NovaWindowsDriver, element: Element): Promise<string> {
    return await this.sendCommand('getElementValue', { elementId: element[W3C_ELEMENT_KEY] }) as string;
}

export async function patternMaximize(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('maximizeWindow', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternMinimize(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('minimizeWindow', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternRestore(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('restoreWindow', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function patternClose(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('closeWindow', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function windowsCloseApp(this: NovaWindowsDriver): Promise<void> {
    return await this.closeApp();
}

export async function windowsLaunchApp(this: NovaWindowsDriver): Promise<void> {
    return await this.launchApp();
}

export async function focusElement(this: NovaWindowsDriver, element: Element): Promise<void> {
    await this.sendCommand('setFocus', { elementId: element[W3C_ELEMENT_KEY] });
}

export async function getClipboardBase64(this: NovaWindowsDriver, contentType?: ContentType | { contentType?: ContentType }): Promise<string> {
    if (!contentType || (contentType && typeof contentType === 'object')) {
        contentType = contentType?.contentType ?? ContentType.PLAINTEXT;
    }

    switch (contentType.toLowerCase()) {
        case ContentType.PLAINTEXT:
            return await this.sendCommand('getClipboardText', {}) as string;
        case ContentType.IMAGE:
            return await this.sendCommand('getClipboardImage', {}) as string;
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
            await this.sendCommand('setClipboardText', { b64Content: args.b64Content });
            return '';
        case ContentType.IMAGE:
            await this.sendCommand('setClipboardImage', { b64Content: args.b64Content });
            return '';
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

    return await this.sendCommand('executePowerShellScript', {
        script,
        workingDir: this.caps.appWorkingDir ?? null,
    }) as string;
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

async function getElementPos(driver: NovaWindowsDriver, elementId: string, offsetX?: number, offsetY?: number): Promise<[number, number]> {
    const exists = await driver.sendCommand('lookupElement', { elementId }) as boolean;
    if (!exists) {
        const elId = await driver.sendCommand('findElement', {
            scope: 'subtree',
            condition: propertyCondition('RuntimeId', elementId.split('.').map(Number)),
            contextElementId: null,
        }) as string | null;

        if (!elId || elId.trim() === '') {
            throw new errors.NoSuchElementError();
        }
    }

    const rect = await driver.sendCommand('getRect', { elementId }) as RectResult;
    return [
        rect.x + (offsetX ?? Math.trunc(rect.width / 2)),
        rect.y + (offsetY ?? Math.trunc(rect.height / 2)),
    ];
}

export async function executeClick(this: NovaWindowsDriver, clickArgs: {
    elementId?: string,
    x?: number,
    y?: number,
    button?: ClickType,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[],
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
        pos = await getElementPos(this, elementId, x, y);
    } else {
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

        if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyDown(Key.CONTROL);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyDown(Key.ALT);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyDown(Key.SHIFT);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyDown(Key.META);

        mouseDown(mouseButton);
        if (durationMs > 0) {
            await sleep(durationMs);
        }
        mouseUp(mouseButton);

        if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyUp(Key.CONTROL);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyUp(Key.ALT);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyUp(Key.SHIFT);
        if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyUp(Key.META);
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
        startPos = await getElementPos(this, startElementId, startX, startY);
    } else {
        startPos = [startX!, startY!];
    }

    let endPos: [number, number];
    if (endElementId) {
        endPos = await getElementPos(this, endElementId, endX, endY);
    } else {
        endPos = [endX!, endY!];
    }

    await mouseMoveAbsolute(startPos[0], startPos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyDown(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyDown(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyDown(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyDown(Key.META);

    await mouseMoveAbsolute(endPos[0], endPos[1], durationMs, this.caps.smoothPointerMove);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyUp(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyUp(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyUp(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyUp(Key.META);
}

export async function executeScroll(this: NovaWindowsDriver, scrollArgs: {
    elementId?: string,
    x?: number,
    y?: number,
    deltaX?: number,
    deltaY?: number,
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[],
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
        pos = await getElementPos(this, elementId);
    } else {
        pos = [x!, y!];
    }

    await mouseMoveAbsolute(pos[0], pos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyDown(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyDown(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyDown(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyDown(Key.META);

    mouseScroll(deltaX ?? 0, deltaY ?? 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyUp(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyUp(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyUp(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyUp(Key.META);
}

export async function startRecordingScreen(this: NovaWindowsDriver, args?: {
    outputPath?: string,
    timeLimit?: number,
    videoFps?: number,
    videoFilter?: string,
    preset?: string,
    captureCursor?: boolean,
    captureClicks?: boolean,
    audioInput?: string,
    forceRestart?: boolean,
}): Promise<void> {
    const {
        outputPath,
        timeLimit,
        videoFps: fps,
        videoFilter,
        preset,
        captureCursor,
        captureClicks,
        audioInput,
        forceRestart = true,
    } = args ?? {};

    if (this._screenRecorder?.isRunning()) {
        this.log.debug('The screen recording is already running');
        if (!forceRestart) {
            this.log.debug('Doing nothing');
            return;
        }
        this.log.debug('Forcing the active screen recording to stop');
        await this._screenRecorder.stop(true);
    } else if (this._screenRecorder) {
        this.log.debug('Clearing the recent screen recording');
        await this._screenRecorder.stop(true);
    }
    this._screenRecorder = null;

    if (outputPath) {
        const ext = extname(outputPath).toLowerCase();
        if (ext !== `.${DEFAULT_EXT}`) {
            throw new errors.InvalidArgumentError(
                `outputPath must be a path to a .${DEFAULT_EXT} file, got: '${outputPath}'`,
            );
        }
    }
    const videoPath = outputPath ?? join(tmpdir(), `novawindows-recording-${Date.now()}.${DEFAULT_EXT}`);
    this._screenRecorder = new ScreenRecorder(videoPath, this.log, {
        fps: fps !== undefined ? parseInt(String(fps), 10) : undefined,
        timeLimit: timeLimit !== undefined ? parseInt(String(timeLimit), 10) : undefined,
        preset,
        captureCursor,
        captureClicks,
        videoFilter,
        audioInput,
    });
    try {
        await this._screenRecorder.start();
    } catch (e) {
        this._screenRecorder = null;
        throw e;
    }
}

export async function stopRecordingScreen(this: NovaWindowsDriver, args?: UploadOptions): Promise<string> {
    if (!this._screenRecorder) {
        this.log.debug('No screen recording has been started. Doing nothing');
        return '';
    }

    this.log.debug('Retrieving the resulting video data');
    const videoPath = await this._screenRecorder.stop();
    if (!videoPath) {
        this.log.debug('No video data is found. Returning an empty string');
        return '';
    }

    const { remotePath, ...uploadOpts } = args ?? {};
    return await uploadRecordedMedia(videoPath, remotePath, uploadOpts);
}

export async function deleteFile(this: NovaWindowsDriver, args: { path: string }): Promise<void> {
    this.assertFeatureEnabled(MODIFY_FS_FEATURE);
    if (!args || typeof args !== 'object' || !args.path) {
        throw new errors.InvalidArgumentError("'path' must be provided.");
    }
    await this.sendCommand('deleteFile', { path: args.path });
}

export async function deleteFolder(this: NovaWindowsDriver, args: { path: string, recursive?: boolean }): Promise<void> {
    this.assertFeatureEnabled(MODIFY_FS_FEATURE);
    if (!args || typeof args !== 'object' || !args.path) {
        throw new errors.InvalidArgumentError("'path' must be provided.");
    }
    await this.sendCommand('deleteFolder', { path: args.path, recursive: args.recursive ?? true });
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
        startPos = await getElementPos(this, startElementId, startX, startY);
    } else {
        if (startX == null || startY == null) {
            throw new errors.InvalidArgumentError('Either startElementId or startX and startY must be provided.');
        }
        startPos = [startX, startY];
    }

    let endPos: [number, number];
    if (endElementId) {
        endPos = await getElementPos(this, endElementId, endX, endY);
    } else {
        if (endX == null || endY == null) {
            throw new errors.InvalidArgumentError('Either endElementId or endX and endY must be provided.');
        }
        endPos = [endX, endY];
    }

    await mouseMoveAbsolute(startPos[0], startPos[1], 0);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyDown(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyDown(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyDown(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyDown(Key.META);

    mouseDown(mouseButton);
    await mouseMoveAbsolute(endPos[0], endPos[1], durationMs, this.caps.smoothPointerMove);
    mouseUp(mouseButton);

    if (processesModifierKeys.some((key) => key.toLowerCase() === 'ctrl')) keyUp(Key.CONTROL);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'alt')) keyUp(Key.ALT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'shift')) keyUp(Key.SHIFT);
    if (processesModifierKeys.some((key) => key.toLowerCase() === 'win')) keyUp(Key.META);
}

export async function windowsGetDeviceTime(this: NovaWindowsDriver, args?: { format?: string }): Promise<string> {
    return this.getDeviceTime(undefined, args?.format);
}

export async function getWindowElement(this: NovaWindowsDriver): Promise<Element> {
    const elementId = await this.sendCommand('saveRootElementToTable', {}) as string;
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active app window is found for this session.');
    }
    return { [W3C_ELEMENT_KEY]: elementId };
}
