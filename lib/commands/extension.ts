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
    PSInt32Array,
    Property,
    PropertyCondition,
    PropertyRegexMatcher,
    TreeScope,
    convertStringToCondition,
    pwsh
} from '../powershell';
import { ClickType, Enum, Key } from '../enums';

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
    keys: 'executeKeys',
    click: 'executeClick',
    hover: 'executeHover',
    scroll: 'executeScroll',
    setFocus: 'focusElement',
    getClipboard: 'getClipboardBase64',
    setClipboard: 'setClipboardFromBase64',
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return await this.sendPowerShellCommand(scriptToExecute);
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

    if (!!elementId && ((x !== null && x !== undefined) || (y !== null && y !== undefined))) {
        throw new errors.InvalidArgumentError('Either elementId or x and y must be provided.');
    }

    if ((x !== null && x !== undefined) !== (y !== null && y !== undefined)) {
        throw new errors.InvalidArgumentError('Both x and y must be provided.');
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
        pos = [rect.x + (rect.width / 2), rect.y + (rect.height / 2)];
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

    await mouseMoveAbsolute(pos[0], pos[1], 0);
    for (let i = 0; i < times; i++) {
        if (i !== 0) {
            await sleep(interClickDelayMs);
        }

        if (modifierKeys.includes('ctrl')) {
            keyDown(Key.CONTROL);
        }
        if (modifierKeys.includes('alt')) {
            keyDown(Key.ALT);
        }
        if (modifierKeys.includes('shift')) {
            keyDown(Key.SHIFT);
        }
        if (modifierKeys.includes('win')) {
            keyDown(Key.META);
        }

        mouseDown(mouseButton);
        if (durationMs > 0) {
            await sleep(durationMs);
        }
        mouseUp(mouseButton);

        if (modifierKeys.includes('ctrl')) {
            keyUp(Key.CONTROL);
        }
        if (modifierKeys.includes('alt')) {
            keyUp(Key.ALT);
        }
        if (modifierKeys.includes('shift')) {
            keyUp(Key.SHIFT);
        }
        if (modifierKeys.includes('win')) {
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
    modifierKeys?: ('shift' | 'ctrl' | 'alt' | 'win') | ('shift' | 'ctrl' | 'alt' | 'win')[], // TODO: add types
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

    if (!!startElementId && ((startX !== null && startX !== undefined) || (startY !== null && startY !== undefined))) {
        throw new errors.InvalidArgumentError('Either startElementId or startX and startY must be provided.');
    }

    if (!!endElementId && ((endX !== null && endX !== undefined) || (endY !== null && endY !== undefined))) {
        throw new errors.InvalidArgumentError('Either endElementId or endX and endY must be provided.');
    }

    if ((startX !== null && startX !== undefined) !== (startY !== null && startY !== undefined)) {
        throw new errors.InvalidArgumentError('Both startX and startY must be provided.');
    }

    if ((endX !== null && endX !== undefined) !== (endY !== null && endY !== undefined)) {
        throw new errors.InvalidArgumentError('Both endX and endY must be provided.');
    }

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
        startPos = [rect.x + (rect.width / 2), rect.y + (rect.height / 2)];
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
        endPos = [rect.x + (rect.width / 2), rect.y + (rect.height / 2)];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        endPos = [endX!, endY!];
    }

    await mouseMoveAbsolute(startPos[0], startPos[1], 0);

    if (modifierKeys.includes('ctrl')) {
        keyDown(Key.CONTROL);
    }
    if (modifierKeys.includes('alt')) {
        keyDown(Key.ALT);
    }
    if (modifierKeys.includes('shift')) {
        keyDown(Key.SHIFT);
    }
    if (modifierKeys.includes('win')) {
        keyDown(Key.META);
    }

    await mouseMoveAbsolute(endPos[0], endPos[1], durationMs, this.caps.smoothPointerMove);

    if (modifierKeys.includes('ctrl')) {
        keyUp(Key.CONTROL);
    }
    if (modifierKeys.includes('alt')) {
        keyUp(Key.ALT);
    }
    if (modifierKeys.includes('shift')) {
        keyUp(Key.SHIFT);
    }
    if (modifierKeys.includes('win')) {
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

    if (modifierKeys.includes('ctrl')) {
        keyDown(Key.CONTROL);
    }
    if (modifierKeys.includes('alt')) {
        keyDown(Key.ALT);
    }
    if (modifierKeys.includes('shift')) {
        keyDown(Key.SHIFT);
    }
    if (modifierKeys.includes('win')) {
        keyDown(Key.META);
    }

    mouseScroll(deltaX ?? 0, deltaY ?? 0);

    if (modifierKeys.includes('ctrl')) {
        keyUp(Key.CONTROL);
    }
    if (modifierKeys.includes('alt')) {
        keyUp(Key.ALT);
    }
    if (modifierKeys.includes('shift')) {
        keyUp(Key.SHIFT);
    }
    if (modifierKeys.includes('win')) {
        keyUp(Key.META);
    }
}
