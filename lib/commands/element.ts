import { Element, Rect } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import { Property } from '../powershell/types';
import { propertyCondition, andCondition, orCondition } from '../server/conditions';
import { errors, W3C_ELEMENT_KEY } from '@appium/base-driver';
import { mouseDown, mouseMoveAbsolute, mouseUp } from '../winapi/user32';
import { Key } from '../enums';
import { sleep } from '../util';
import type { RectResult } from '../server/protocol';

export async function getProperty(this: NovaWindowsDriver, propertyName: string, elementId: string): Promise<string> {
    return await this.sendCommand('getProperty', { elementId, property: propertyName }) as string;
}

export async function getAttribute(this: NovaWindowsDriver, propertyName: string, elementId: string) {
    this.log.warn('Warning: Use getProperty instead of getAttribute for retrieving element properties.');
    return await this.getProperty(propertyName, elementId);
}

export async function active(this: NovaWindowsDriver): Promise<Element> {
    const elementId = await this.sendCommand('findElementFocused', {}) as string;
    return { [W3C_ELEMENT_KEY]: elementId };
}

export async function getName(this: NovaWindowsDriver, elementId: string): Promise<string> {
    return await this.sendCommand('getTagName', { elementId }) as string;
}

export async function getText(this: NovaWindowsDriver, elementId: string): Promise<string> {
    return await this.sendCommand('getText', { elementId }) as string;
}

export async function clear(this: NovaWindowsDriver, elementId: string): Promise<void> {
    await this.sendCommand('setElementValue', { elementId, value: '' });
}

export async function setValue(this: NovaWindowsDriver, value: string | string[], elementId: string): Promise<void> {
    await this.sendCommand('setFocus', { elementId });
    const metaKeyStates = {
        shift: false,
        ctrl: false,
        meta: false,
        alt: false,
    };

    if (!Array.isArray(value)) {
        value = value.split('');
    }

    let keysToSend: string[] = [];

    const sendKeysAndResetArray = async () => {
        if (keysToSend.length > 0) {
            await this.sendCommand('sendKeys', { text: keysToSend.join('') });
            keysToSend = [];
        }
    };

    for (const char of value) {
        switch (char) {
            case Key.SHIFT:
            case Key.R_SHIFT:
                await sendKeysAndResetArray();
                if (metaKeyStates.shift) {
                    metaKeyStates.shift = false;
                    await this.handleKeyActionSequence({
                        type: 'key',
                        id: 'default keyboard',
                        actions: [{ type: 'keyUp', value: char }]
                    });
                    break;
                }

                metaKeyStates.shift = true;
                await this.handleKeyActionSequence({
                    type: 'key',
                    id: 'default keyboard',
                    actions: [{ type: 'keyDown', value: char }]
                });
                break;
            case Key.CONTROL:
            case Key.R_CONTROL:
                await sendKeysAndResetArray();
                if (metaKeyStates.ctrl) {
                    metaKeyStates.ctrl = false;
                    await this.handleKeyActionSequence({
                        type: 'key',
                        id: 'default keyboard',
                        actions: [{ type: 'keyUp', value: char }]
                    });
                    break;
                }

                metaKeyStates.ctrl = true;
                await this.handleKeyActionSequence({
                    type: 'key',
                    id: 'default keyboard',
                    actions: [{ type: 'keyDown', value: char }]
                });
                break;
            case Key.META:
            case Key.R_META:
                await sendKeysAndResetArray();
                if (metaKeyStates.meta) {
                    metaKeyStates.meta = false;
                    await this.handleKeyActionSequence({
                        type: 'key',
                        id: 'default keyboard',
                        actions: [{ type: 'keyUp', value: char }]
                    });
                    break;
                }

                metaKeyStates.meta = true;
                await this.handleKeyActionSequence({
                    type: 'key',
                    id: 'default keyboard',
                    actions: [{ type: 'keyDown', value: char }]
                });
                break;
            case Key.ALT:
            case Key.R_ALT:
                await sendKeysAndResetArray();
                if (metaKeyStates.alt) {
                    metaKeyStates.alt = false;
                    await this.handleKeyActionSequence({
                        type: 'key',
                        id: 'default keyboard',
                        actions: [{ type: 'keyUp', value: char }]
                    });
                    break;
                }

                metaKeyStates.alt = true;
                await this.handleKeyActionSequence({
                    type: 'key',
                    id: 'default keyboard',
                    actions: [{ type: 'keyDown', value: char }]
                });
                break;
            default:
                if (char.charCodeAt(0) >= 0xE000) {
                    await sendKeysAndResetArray();
                    await this.handleKeyActionSequence({
                        type: 'key',
                        id: 'default keyboard',
                        actions: [{ type: 'keyDown', value: char }, { type: 'keyUp', value: char }]
                    });
                } else {
                    keysToSend.push(char.replace(/[+^%~()]/, '{$&}'));
                }
        }
    }

    await sendKeysAndResetArray();
}

export async function getElementRect(this: NovaWindowsDriver, elementId: string): Promise<Rect> {
    const rect = await this.sendCommand('getRect', { elementId }) as RectResult;
    const rootRect = await this.sendCommand('getRootRect', {}) as RectResult;
    rect.x -= rootRect.x;
    rect.y -= rootRect.y;
    rect.x = Math.min(0x7FFFFFFF, rect.x);
    rect.y = Math.min(0x7FFFFFFF, rect.y);
    return rect;
}

export async function elementDisplayed(this: NovaWindowsDriver, elementId: string): Promise<boolean> {
    const result = await this.sendCommand('getProperty', { elementId, property: 'IsOffscreen' });
    // UIA3 getProperty returns a JS boolean for bool-typed properties; the old
    // PowerShell/UIA1 path returned the stringified "True"/"False". Handle both.
    const isOffscreen = typeof result === 'boolean' ? result : String(result).toLowerCase() === 'true';
    return !isOffscreen;
}

// TODO: find better way to handle whether to use select or toggle
export async function elementSelected(this: NovaWindowsDriver, elementId: string): Promise<boolean> {
    try {
        const result = await this.sendCommand('isElementSelected', { elementId }) as boolean;
        return result === true || String(result) === 'True';
    } catch {
        const result = await this.sendCommand('getToggleState', { elementId }) as string;
        return result === 'On';
    }
}

export async function elementEnabled(this: NovaWindowsDriver, elementId: string): Promise<boolean> {
    const result = await this.sendCommand('getProperty', { elementId, property: 'IsEnabled' });
    return typeof result === 'boolean' ? result : String(result).toLowerCase() === 'true';
}

export async function click(this: NovaWindowsDriver, elementId: string): Promise<void> {
    const easingFunction = this.caps.smoothPointerMove;

    // Detect menu items up-front — focusing an ancestor Pane/Window closes
    // the open popup, so subsequent ClickablePoint reads return stale coords
    // and the mouse click lands on empty space. WPF menus in particular lose
    // their dropdown on focus-change. Menu items don't need pre-focus anyway;
    // the mouseDown/mouseUp activates them directly.
    let controlType = '';
    try {
        controlType = await this.sendCommand('getProperty', { elementId, property: 'ControlType' }) as string;
    } catch {
        // not fatal — fall through, we just won't know the type
    }
    const isMenuItem = controlType === 'MenuItem' || controlType === 'Menu' || controlType === 'MenuBar';

    if (!isMenuItem) {
        const focusCondition = andCondition(
            propertyCondition('IsKeyboardFocusable', true),
            orCondition(
                propertyCondition('ControlType', 'Pane'),
                propertyCondition('ControlType', 'Window'),
            ),
        );

        try {
            const focusableElementId = await this.sendCommand('findElement', {
                scope: 'ancestors-or-self',
                condition: focusCondition,
                contextElementId: elementId,
            }) as string | null;
            if (focusableElementId) {
                await this.sendCommand('setFocus', { elementId: focusableElementId.trim() });
            }
        } catch {
            // ignore if it fails, focus may fail if there is a forced popup window
        }
    }

    const coordinates = {
        x: undefined as number | undefined,
        y: undefined as number | undefined,
    };

    try {
        const clickablePoint = await this.sendCommand('getProperty', { elementId, property: 'ClickablePoint' }) as { x: number; y: number };
        coordinates.x = clickablePoint.x;
        coordinates.y = clickablePoint.y;
    } catch {
        const rect = await this.sendCommand('getRect', { elementId }) as RectResult;
        coordinates.x = rect.x + rect.width / 2;
        coordinates.y = rect.y + rect.height / 2;
    }

    // Pass delayBeforeClick through as-is — undefined lets mouseMoveAbsolute's
    // default kick in (interpolated ~100 ms path), explicit 0 still teleports
    // for speed-sensitive callers (calculator button mashing etc.).
    await mouseMoveAbsolute(coordinates.x!, coordinates.y!, this.caps.delayBeforeClick, easingFunction);

    // Drain the hardware input queue before the button event, matching FlaUI's
    // Wait.UntilInputIsProcessed (FlaUI.Core/Input/Wait.cs:19-25 — implemented
    // as Thread.Sleep(100), cites Raymond Chen / The Old New Thing on the need
    // to let Windows process input before the next event). Without this gap,
    // WPF ContextMenu / MenuItem controls route the button-down to the popup
    // background because the hover tracker hasn't marked the item as hovered
    // yet, so the popup dismisses and the command never fires.
    await sleep(100);

    mouseDown();
    mouseUp();

    // Small default post-click settle so menu/navigation animations have a
    // chance to finish before the next findElement runs. The explicit
    // delayAfterClick capability overrides this for tests that want a longer
    // wait (or 0 for back-to-back clicks where speed matters).
    const POST_CLICK_SETTLE_MS = 50;
    await sleep(this.caps.delayAfterClick ?? POST_CLICK_SETTLE_MS);
}

export async function getElementScreenshot(this: NovaWindowsDriver, elementId: string): Promise<string> {
    const rootId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    return await this.sendCommand('getElementScreenshot', { elementId }) as string;
}
