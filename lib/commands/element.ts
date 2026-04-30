import { Element, Rect } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import { Property } from '../powershell/types';
import { propertyCondition, andCondition, orCondition } from '../server/conditions';
import { errors, W3C_ELEMENT_KEY } from '@appium/base-driver';
import { mouseDown, mouseMoveAbsolute, mouseUp, getCursorPos } from '../winapi/user32';
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

    // Teleport for menu items (an interpolated path crosses sibling items and
    // WPF hover-opens their submenus mid-flight); non-menu callers can opt
    // into an interpolated path via delayBeforeClick + smoothPointerMove.
    const moveDuration = isMenuItem ? 0 : (this.caps.delayBeforeClick ?? 0);
    this.log.debug(`click(${elementId}) controlType=${controlType || '?'} coords=(${coordinates.x},${coordinates.y}) menu=${isMenuItem}`);
    await mouseMoveAbsolute(coordinates.x!, coordinates.y!, moveDuration, easingFunction);

    if (isMenuItem) {
        // WPF ContextMenu items need the WM_MOUSEMOVE to be fully processed
        // before WM_LBUTTONDOWN arrives. Without this gap, the popup's hover
        // tracker hasn't yet marked the target as IsMouseOver, so the click
        // is routed to the popup background and silently dismissed.
        await sleep(100);

        // Re-check ClickablePoint: the popup can still be animating when the
        // initial coordinate read happened (observed 14 px y-drift between
        // consecutive runs of the same click, first one fast enough to catch
        // the popup mid-flight). If the coord moved meaningfully, re-teleport
        // to the final position; otherwise the stale coord lands on the
        // sibling item below/above the target.
        try {
            const refreshed = await this.sendCommand('getProperty', { elementId, property: 'ClickablePoint' }) as { x: number; y: number };
            const drift = Math.abs(refreshed.x - coordinates.x!) + Math.abs(refreshed.y - coordinates.y!);
            if (drift > 2) {
                this.log.debug(`click(${elementId}) popup settled: (${coordinates.x},${coordinates.y}) → (${refreshed.x},${refreshed.y}) — re-teleporting`);
                coordinates.x = refreshed.x;
                coordinates.y = refreshed.y;
                await mouseMoveAbsolute(coordinates.x, coordinates.y, 0, easingFunction);
                await sleep(100);
            }
        } catch {
            // ClickablePoint no longer available — fall through with the
            // original coords; better to click the old spot than skip.
        }

        const afterMovePos = getCursorPos();
        if (afterMovePos) {
            const cursorDrift = Math.abs(afterMovePos.x - coordinates.x!) + Math.abs(afterMovePos.y - coordinates.y!);
            if (cursorDrift > 2) {
                this.log.warn(`click(${elementId}) cursor drift: wanted (${coordinates.x},${coordinates.y}), got (${afterMovePos.x},${afterMovePos.y})`);
            } else {
                this.log.debug(`click(${elementId}) cursor confirmed at (${afterMovePos.x},${afterMovePos.y})`);
            }
        }
    }

    mouseDown();
    mouseUp();

    // Post-click settle — FlaUI's Wait.UntilInputIsProcessed
    // (FlaUI.Core/Input/Wait.cs:19-25, Thread.Sleep(100)). Lets Windows
    // finish dispatching mouseDown/mouseUp before the next UIA call runs.
    const postClickSettleMs = isMenuItem ? 100 : 50;
    await sleep(this.caps.delayAfterClick ?? postClickSettleMs);
}

export async function getElementScreenshot(this: NovaWindowsDriver, elementId: string): Promise<string> {
    const rootId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    return await this.sendCommand('getElementScreenshot', { elementId }) as string;
}
