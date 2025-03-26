import {
    ActionSequence,
    KeyAction,
    KeyActionSequence,
    NullActionSequence,
    PointerActionSequence,
    PointerMoveAction,
    Rect,
    ScrollAction,
    WheelActionSequence,
} from '@appium/types';

import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { NovaWindowsDriver } from '../driver';
import { keyDown, keyUp, mouseMoveRelative, mouseMoveAbsolute, mouseDown, mouseUp, mouseScroll } from '../winapi/user32';
import { sleep } from '../util';
import { AutomationElement, FoundAutomationElement } from '../powershell';
import { Key } from '../enums';

export async function performActions(this: NovaWindowsDriver, actionSequences: ActionSequence[]): Promise<void> {
    for (const actionSequence of actionSequences) {
        switch (actionSequence.type) {
            case 'key':
                await this.handleKeyActionSequence(actionSequence);
                break;
            case 'wheel':
                await this.handleWheelActionSequence(actionSequence);
                break;
            case 'pointer':
                await this.handlePointerActionSequence(actionSequence);
                break;
            case 'none':
                await this.handleNullActionSequence(actionSequence);
                break;
            default:
                throw new errors.InvalidArgumentError();
        }
    }
};

export async function handleKeyActionSequence(this: NovaWindowsDriver, actionSequence: KeyActionSequence): Promise<void> {
    const actions = actionSequence.actions;
    for (const action of actions) {
        await this.handleKeyAction(action);
    }
}

export async function handlePointerActionSequence(this: NovaWindowsDriver, actionSequence: PointerActionSequence): Promise<void> {
    switch (actionSequence.parameters?.pointerType) {
        case 'touch':
        case 'pen':
            throw new errors.NotImplementedError(`Pointer type ${actionSequence.parameters?.pointerType} not implemented yet.`);
        case 'mouse':
        default:
            await this.handleMousePointerActionSequence(actionSequence);
    }
}

export async function handleMousePointerActionSequence(this: NovaWindowsDriver, actionSequence: PointerActionSequence): Promise<void> {
    const actions = actionSequence.actions;
    for (const action of actions) {
        switch (action.type) {
            case 'pointerMove':
                await this.handleMouseMoveAction(action);
                break;
            case 'pointerDown':
                mouseDown(action.button);
                break;
            case 'pointerUp':
                mouseUp(action.button);
                break;
            case 'pause':
                if (action.duration) {
                    await sleep(action.duration);
                }
                break;
            default:
                throw new errors.InvalidArgumentError();
        }
    }
}

export async function handleWheelActionSequence(this: NovaWindowsDriver, actionSequence: WheelActionSequence): Promise<void> {
    const actions = actionSequence.actions;
    for (const action of actions) {
        switch (action.type) {
            case 'scroll':
                await this.handleMouseMoveAction(action);
                mouseScroll(action.deltaX, action.deltaY);
                break;
            case 'pause':
                if (action.duration) {
                    await sleep(action.duration);
                }
                break;
            default:
                throw new errors.InvalidArgumentError();
        }
    }
}

export async function handleNullActionSequence(this: NovaWindowsDriver, actionSequence: NullActionSequence): Promise<void> {
    const actions = actionSequence.actions;
    for (const action of actions) {
        if (action.duration) {
            await sleep(action.duration);
        }
    }
}

export async function handleMouseMoveAction(this: NovaWindowsDriver, action: PointerMoveAction | ScrollAction): Promise<void> {
    const easingFunction = this.caps.smoothPointerMove;
    switch (action.origin) {
        case 'pointer':
            await mouseMoveRelative(action.x, action.y, action.duration, easingFunction);
            break;
        case 'viewport': {
            const rootRectJson = await this.sendPowerShellCommand(AutomationElement.automationRoot.buildGetElementRectCommand());
            const rootRect = JSON.parse(rootRectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
            await mouseMoveAbsolute(action.x + rootRect.x, action.y + rootRect.y, action.duration, easingFunction);
            break;
        }
        default:
            if (action.origin?.[W3C_ELEMENT_KEY]) {
                const element = new FoundAutomationElement(action.origin[W3C_ELEMENT_KEY]);
                const rectJson = await this.sendPowerShellCommand(element.buildGetElementRectCommand());
                let rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;

                if (Object.values(rect).some((x) => x === 0x7FFFFFFF)) {
                    await this.sendPowerShellCommand(element.buildScrollIntoViewCommand());
                    rect = JSON.parse(rectJson.replaceAll(/(?:infinity)/gi, 0x7FFFFFFF.toString())) as Rect;
                }

                await mouseMoveAbsolute(action.x === 0 ? rect.x + rect.width / 2 : action.x, action.y === 0 ? rect.y + rect.height / 2 : action.y, action.duration, easingFunction);
                break;
            }

            throw new errors.InvalidArgumentError();
    }
}

export async function handleKeyAction(this: NovaWindowsDriver, action: KeyAction): Promise<void> {
    if (action.type === 'pause') {
        if (action.duration) {
            await sleep(action.duration);
        }
        return;
    }

    switch (action.value) {
        case Key.SHIFT:
        case Key.R_SHIFT:
            if (action.type === 'keyDown') {
                keyDown(action.value);
                this.keyboardState.shift = true;
                return;
            }

            keyUp(Key.SHIFT);
            keyUp(Key.R_SHIFT);
            this.keyboardState.shift = false;
            return;
        case Key.CONTROL:
        case Key.R_CONTROL:
            if (action.type === 'keyDown') {
                keyDown(action.value);
                this.keyboardState.ctrl = true;
                return;
            }

            keyUp(Key.CONTROL);
            keyUp(Key.R_CONTROL);
            this.keyboardState.ctrl = false;
            return;
        case Key.META:
        case Key.R_META:
            if (action.type === 'keyDown') {
                keyDown(action.value);
                this.keyboardState.meta = true;
                return;
            }

            keyUp(Key.META);
            keyUp(Key.R_META);
            this.keyboardState.meta = false;
            return;
        case Key.ALT:
        case Key.R_ALT:
            if (action.type === 'keyDown') {
                keyDown(action.value);
                this.keyboardState.alt = true;
                return;
            }

            keyUp(Key.ALT);
            keyUp(Key.R_ALT);
            this.keyboardState.alt = false;
            return;
        case Key.NULL:
            if (action.type === 'keyDown') {
                if (this.keyboardState.shift) {
                    await this.handleKeyAction({ type: 'keyUp', value: Key.SHIFT });
                }
                if (this.keyboardState.ctrl) {
                    await this.handleKeyAction({ type: 'keyUp', value: Key.CONTROL });
                }
                if (this.keyboardState.meta) {
                    await this.handleKeyAction({ type: 'keyUp', value: Key.META });
                }
                if (this.keyboardState.alt) {
                    await this.handleKeyAction({ type: 'keyUp', value: Key.ALT });
                }
                for (const key in Array.of(this.keyboardState.pressed)) {
                    keyUp(key);
                    this.keyboardState.pressed.delete(key);
                }
            }
            return;
        default:
            if (action.type === 'keyDown') {
                keyDown(action.value);
                this.keyboardState.pressed.add(action.value);
            }
            else {
                keyUp(action.value);
                this.keyboardState.pressed.delete(action.value);
            }
    }
}
