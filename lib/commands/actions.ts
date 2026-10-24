import {
    ActionSequence,
    KeyAction,
    KeyActionSequence,
    NullActionSequence,
    PointerActionSequence,
    PointerMoveAction,
    ScrollAction,
    WheelActionSequence,
} from '@appium/types';

import { W3C_ELEMENT_KEY, errors } from '@appium/base-driver';
import { NovaWindowsDriver } from '../driver';
import { keyDown, keyUp, mouseMoveRelative, mouseMoveAbsolute, mouseDown, mouseUp, mouseScroll } from '../winapi/user32';
import { fetchElementRect, sleep } from '../util';
import { AutomationElement, FoundAutomationElement } from '../powershell';
import { Key } from '../enums';

export async function performActions(this: NovaWindowsDriver, actionSequences: ActionSequence[]): Promise<void> {
    for (const actionSequence of actionSequences) {
        if (actionSequence.type === 'pointer' &&
            (actionSequence.parameters?.pointerType === 'touch' || actionSequence.parameters?.pointerType === 'pen')) {
            throw new errors.NotImplementedError(`Pointer type ${actionSequence.parameters.pointerType} not implemented yet.`);
        }
        if (!['key', 'pointer', 'wheel', 'none'].includes(actionSequence.type)) {
            throw new errors.InvalidArgumentError();
        }
    }

    const maxTicks = Math.max(0, ...actionSequences.map((seq) => seq.actions.length));

    for (let tick = 0; tick < maxTicks; tick++) {
        const tickPromises: Promise<void>[] = [];

        for (const actionSequence of actionSequences) {
            const action = actionSequence.actions[tick];
            if (!action) {
                continue;
            }

            switch (actionSequence.type) {
                case 'key':
                    tickPromises.push(this.handleKeyAction(action as KeyAction));
                    break;
                case 'pointer':
                    tickPromises.push(this.handleMousePointerAction(action as PointerActionSequence['actions'][number]));
                    break;
                case 'wheel':
                    tickPromises.push(this.handleWheelAction(action as WheelActionSequence['actions'][number]));
                    break;
                case 'none': {
                    const duration = (action as NullActionSequence['actions'][number]).duration;
                    if (duration) {
                        tickPromises.push(sleep(duration));
                    }
                    break;
                }
            }
        }

        await Promise.all(tickPromises);
    }
};

export async function handleKeyActionSequence(this: NovaWindowsDriver, actionSequence: KeyActionSequence): Promise<void> {
    const actions = actionSequence.actions;
    for (const action of actions) {
        await this.handleKeyAction(action);
    }
}

export async function handleMousePointerAction(this: NovaWindowsDriver, action: PointerActionSequence['actions'][number]): Promise<void> {
    switch (action.type) {
        case 'pointerMove':
            await this.handleMouseMoveAction(action);
            break;
        case 'pointerDown':
            mouseDown(action.button);
            this.mouseButtonsDown.add(action.button);
            break;
        case 'pointerUp':
            mouseUp(action.button);
            this.mouseButtonsDown.delete(action.button);
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

export async function handleWheelAction(this: NovaWindowsDriver, action: WheelActionSequence['actions'][number]): Promise<void> {
    switch (action.type) {
        case 'scroll':
            await this.handleMouseMoveAction({ ...action, duration: 0 });
            mouseScroll(action.deltaX, action.deltaY);
            if (action.duration) {
                await sleep(action.duration);
            }
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

export async function handleMouseMoveAction(this: NovaWindowsDriver, action: PointerMoveAction | ScrollAction): Promise<void> {
    const easingFunction = this.caps.smoothPointerMove;
    switch (action.origin) {
        case 'pointer':
            await mouseMoveRelative(action.x, action.y, action.duration, easingFunction);
            break;
        case undefined:
        case 'viewport': {
            const rootRect = await fetchElementRect(this, AutomationElement.automationRoot);
            await mouseMoveAbsolute(action.x + rootRect.x, action.y + rootRect.y, action.duration, easingFunction);
            break;
        }
        default:
            if (action.origin?.[W3C_ELEMENT_KEY]) {
                const element = new FoundAutomationElement(action.origin[W3C_ELEMENT_KEY]);
                let rect = await fetchElementRect(this, element);

                if (Object.values(rect).some((x) => x === 0x7FFFFFFF)) {
                    await this.sendPowerShellCommand(element.buildScrollIntoViewCommand());
                    rect = await fetchElementRect(this, element);
                }

                // W3C: x and y are offsets from the element's center point
                await mouseMoveAbsolute(rect.x + rect.width / 2 + (action.x ?? 0), rect.y + rect.height / 2 + (action.y ?? 0), action.duration, easingFunction);
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
                for (const key of Array.from(this.keyboardState.pressed)) {
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

export async function releaseActions(this: NovaWindowsDriver): Promise<void> {
    if (this.keyboardState.shift) {
        keyUp(Key.SHIFT);
        keyUp(Key.R_SHIFT);
        this.keyboardState.shift = false;
    }
    if (this.keyboardState.ctrl) {
        keyUp(Key.CONTROL);
        keyUp(Key.R_CONTROL);
        this.keyboardState.ctrl = false;
    }
    if (this.keyboardState.meta) {
        keyUp(Key.META);
        keyUp(Key.R_META);
        this.keyboardState.meta = false;
    }
    if (this.keyboardState.alt) {
        keyUp(Key.ALT);
        keyUp(Key.R_ALT);
        this.keyboardState.alt = false;
    }
    for (const key of this.keyboardState.pressed) {
        keyUp(key);
    }
    this.keyboardState.pressed.clear();
    for (const button of this.mouseButtonsDown) {
        mouseUp(button);
    }
    this.mouseButtonsDown.clear();
}
