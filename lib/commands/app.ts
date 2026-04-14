import { normalize } from 'node:path';
import { Element, Rect } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import { propertyCondition, trueCondition } from '../server/conditions';
import type { RectResult } from '../server/protocol';
import { sleep } from '../util';
import { errors, W3C_ELEMENT_KEY } from '@appium/base-driver';
import {
    getWindowAllHandlesForProcessIds,
    keyDown,
    keyUp,
    trySetForegroundWindow,
} from '../winapi/user32';
import { Key } from '../enums';

/**
 * Polling interval used when waiting for windows/elements to appear during
 * app launch and window switching.
 *
 * This is deliberately kept low (200ms) because the app launch flow has
 * multiple sequential retry phases that each sleep on failure:
 *
 *   changeRootElement (outer loop)
 *     → attachToApplicationWindow
 *       → waitForNewWindow  (polls for Win32 window handle)
 *       → findElement loop  (polls UIAutomation tree for the element)
 *
 * At 500ms per poll, 10 failed attempts in any one phase cost 5 seconds,
 * and the phases compound. At 200ms the same 10 attempts cost 2 seconds,
 * cutting overall launch latency from 10-15s down to ~3-5s for typical
 * UWP apps like Calculator.
 */
const POLL_INTERVAL_MS = 200;

/**
 * Maximum number of polling attempts per retry phase.
 * Combined with POLL_INTERVAL_MS this gives a ~6s window per phase,
 * which is enough for most apps to register in the UIAutomation tree.
 */
const MAX_POLL_ATTEMPTS = 30;

export async function getPageSource(this: NovaWindowsDriver): Promise<string> {
    return await this.sendCommand('getPageSource', {}) as string;
}

export async function getScreenshot(this: NovaWindowsDriver): Promise<string> {
    const automationRootId = await this.sendCommand('saveRootElementToTable', {}) as string;

    if (this.caps.app && this.caps.app.toLowerCase() !== 'root') {
        try {
            await this.focusElement({
                [W3C_ELEMENT_KEY]: automationRootId?.trim(),
            } satisfies Element);
        } catch {
            // noop
        }
    }

    return await this.sendCommand('getScreenshot', {}) as string;
}

export async function getWindowRect(this: NovaWindowsDriver): Promise<Rect> {
    return await this.sendCommand('getRootRect', {}) as RectResult;
}

export async function getWindowHandle(this: NovaWindowsDriver): Promise<string> {
    const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
    const nativeWindowHandle = await this.sendCommand('getProperty', { elementId: rootId, property: 'NativeWindowHandle' }) as string;
    return `0x${Number(nativeWindowHandle).toString(16).padStart(8, '0')}`;
}

export async function getWindowHandles(this: NovaWindowsDriver): Promise<string[]> {
    // Search from desktop root (RootElement), not the session root
    const elIds = await this.sendCommand('findElements', {
        scope: 'children',
        condition: trueCondition(),
        contextElementId: null,
    }) as string[];

    const nativeWindowHandles: string[] = [];

    for (const elId of elIds ?? []) {
        const nativeWindowHandle = await this.sendCommand('getProperty', { elementId: elId, property: 'NativeWindowHandle' }) as string;
        nativeWindowHandles.push(`0x${Number(nativeWindowHandle).toString(16).padStart(8, '0')}`);
    }

    return nativeWindowHandles;
}

export async function setWindow(this: NovaWindowsDriver, nameOrHandle: string): Promise<void> {
    const handle = Number(nameOrHandle);
    for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
        if (!isNaN(handle)) {
            const elementId = await this.sendCommand('findElement', {
                scope: 'child-or-self',
                condition: propertyCondition('NativeWindowHandle', handle),
                contextElementId: null,
            }) as string | null;

            if (elementId && elementId.trim() !== '') {
                await this.sendCommand('setRootElementFromElementId', { elementId });
                trySetForegroundWindow(handle);
                return;
            }
        }

        const name = nameOrHandle;
        const elementId = await this.sendCommand('findElement', {
            scope: 'children',
            condition: propertyCondition('Name', name),
            contextElementId: null,
        }) as string | null;

        if (elementId && elementId.trim() !== '') {
            this.log.info(`Found window with name '${name}'. Setting it as the root element.`);
            await this.sendCommand('setRootElementFromElementId', { elementId });
            trySetForegroundWindow(handle);
            return;
        }

        this.log.info(`Failed to locate window with name '${name}'. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (${i}/${MAX_POLL_ATTEMPTS})`);
        await sleep(POLL_INTERVAL_MS);
    }

    throw new errors.NoSuchWindowError(`No window was found with name or handle '${nameOrHandle}'.`);
}

export async function closeApp(this: NovaWindowsDriver): Promise<void> {
    const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active app window is found for this session.');
    }
    await this.sendCommand('closeWindow', { elementId: rootId });
    await this.sendCommand('setRootElementNull', {});
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
        const elementId = await this.sendCommand('setRootElementFromHandle', { handle: nativeWindowHandle }) as string | null;

        if (elementId) {
            trySetForegroundWindow(nativeWindowHandle);
            return;
        }

        throw new errors.UnknownError('Failed to locate top level window with that window handle.');
    }

    const path = pathOrNativeWindowHandle;
    const isUwp = path.includes('!') && path.includes('_') && !(path.includes('/') || path.includes('\\'));

    if (isUwp) {
        this.log.debug('Detected app path to be in the UWP format.');
        await this.sendCommand('startProcess', {
            path: 'explorer.exe',
            arguments: `shell:AppsFolder\\${path}`,
        });
        await sleep((this.caps['ms:waitForAppLaunch'] ?? 0) * 1000 || POLL_INTERVAL_MS);

        // Outer retry loop: only needed when getProcessIds returns stale data
        // before the newly launched app registers its ApplicationFrameHost.
        // Kept short (10 attempts) because attachToApplicationWindow has its
        // own internal retries for the UIAutomation tree lookup.
        for (let i = 1; i <= 10; i++) {
            const processIds = await this.sendCommand('getProcessIds', { processName: 'ApplicationFrameHost' }) as number[];

            this.log.debug('Process IDs of ApplicationFrameHost processes: ' + processIds.join(', '));
            try {
                await this.attachToApplicationWindow(processIds, { isUwp: true });
                return;
            } catch {
                // noop — retry after a short delay
            }

            this.log.info(`Failed to locate window of the app. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (${i}/10)`);
            await sleep(POLL_INTERVAL_MS);
        }
    } else {
        this.log.debug('Detected app path to be in the classic format.');
        const normalizedPath = normalize(path);
        await this.sendCommand('startProcess', {
            path: normalizedPath,
            arguments: this.caps.appArguments ?? null,
            workingDir: this.caps.appWorkingDir ?? null,
        });
        await sleep((this.caps['ms:waitForAppLaunch'] ?? 0) * 1000 || POLL_INTERVAL_MS);

        for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
            try {
                const breadcrumbs = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
                const executable = breadcrumbs[breadcrumbs.length - 1];
                const processName = executable.endsWith('.exe') ? executable.slice(0, executable.length - 4) : executable;
                const processIds = await this.sendCommand('getProcessIds', { processName }) as number[];
                this.log.debug(`Process IDs of '${processName}' processes: ` + processIds.join(', '));

                await this.attachToApplicationWindow(processIds, { isUwp: false });
                return;
            } catch (err) {
                if (err instanceof Error) {
                    this.log.debug(`Received error:\n${err.message}`);
                }
            }

            this.log.info(`Failed to locate window of the app. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (${i}/${MAX_POLL_ATTEMPTS})`);
            await sleep(POLL_INTERVAL_MS);
        }
    }

    throw new errors.UnknownError('Failed to locate window of the app.');
}

export async function back(this: NovaWindowsDriver): Promise<void> {
    const rootId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    keyDown(Key.ALT);
    keyDown(Key.LEFT);
    keyUp(Key.LEFT);
    keyUp(Key.ALT);
}

export async function forward(this: NovaWindowsDriver): Promise<void> {
    const rootId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    keyDown(Key.ALT);
    keyDown(Key.RIGHT);
    keyUp(Key.RIGHT);
    keyUp(Key.ALT);
}

export async function title(this: NovaWindowsDriver): Promise<string> {
    const rootId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!rootId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    return await this.sendCommand('getProperty', { elementId: rootId, property: 'Name' }) as string;
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

    const elementId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }

    if (x !== null && y !== null) {
        await this.sendCommand('moveWindow', { elementId, x, y });
    }
    if (width !== null && height !== null) {
        await this.sendCommand('resizeWindow', { elementId, width, height });
    }

    return await this.getWindowRect();
}

/**
 * Polls for a visible Win32 window belonging to the given process ID.
 *
 * Uses EnumWindows + GetWindowThreadProcessId under the hood. Returns the
 * last handle found (most recently created window for the process).
 *
 * For UWP apps the ApplicationFrameHost process usually already has
 * windows, so this returns almost immediately. For classic apps it
 * polls until the newly launched process creates its first window.
 */
export async function waitForNewWindow(this: NovaWindowsDriver, pid: number, timeout: number): Promise<number> {
    const start = Date.now();
    let attempts = 0;

    while (Date.now() - start < timeout) {
        const handles = getWindowAllHandlesForProcessIds([pid]);

        if (handles.length > 0) {
            return handles[handles.length - 1];
        }

        this.log.debug(`Waiting for the process window to appear... (${++attempts}/${Math.floor(timeout / POLL_INTERVAL_MS)})`);
        await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('Timed out waiting for window.');
}

/**
 * Attaches the driver session to the application window owned by one of the
 * given process IDs. This is the core of the app launch flow — it bridges
 * from a Win32 window handle to a UIAutomation element.
 *
 * ### Search order depends on app type
 *
 * **Classic (Win32) apps** — `isUwp: false` (default):
 *   1. Try NativeWindowHandle first (fast, exact match).
 *   2. Fall back to ProcessId if the handle isn't in the UIA tree yet.
 *
 * **UWP / packaged apps** — `isUwp: true`:
 *   1. Try ProcessId first. The Win32 handle from EnumWindows almost never
 *      matches the UIAutomation NativeWindowHandle for UWP apps because
 *      UWP windows are hosted inside ApplicationFrameHost, and the UIA
 *      tree reports the inner (XAML) window handle, not the outer frame.
 *      Skipping the doomed NativeWindowHandle search saves one full
 *      findElement round-trip per retry iteration.
 *   2. Fall back to NativeWindowHandle (rarely needed, but harmless).
 *
 * @param processIds - Process IDs returned by getProcessIds for the app.
 * @param options.isUwp - When true, search by ProcessId first (see above).
 */
export async function attachToApplicationWindow(
    this: NovaWindowsDriver,
    processIds: number[],
    options: { isUwp?: boolean } = {},
): Promise<void> {
    const { isUwp = false } = options;
    const nativeWindowHandle = await waitForNewWindow.call(
        this,
        processIds[0],
        this.caps['ms:waitForAppLaunch'] ?? POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS,
    );

    let elementId = '';

    for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
        // --- Strategy A: match by NativeWindowHandle (best for classic apps) ---
        // --- Strategy B: match by ProcessId (best for UWP apps) ---
        // Run the preferred strategy first to avoid a wasted round-trip.

        if (!isUwp) {
            // Classic path: try NativeWindowHandle first
            elementId = await this.sendCommand('findElement', {
                scope: 'children',
                condition: propertyCondition('NativeWindowHandle', nativeWindowHandle),
                contextElementId: null,
            }) as string ?? '';

            if (!elementId) {
                // Fallback to ProcessId
                for (const pid of processIds) {
                    const foundId = await this.sendCommand('findElement', {
                        scope: 'children',
                        condition: propertyCondition('ProcessId', pid),
                        contextElementId: null,
                    }) as string ?? '';

                    if (foundId) {
                        this.log.info(`Found window by ProcessId ${pid} (handle mismatch: Win32=0x${nativeWindowHandle.toString(16).padStart(8, '0')})`);
                        elementId = foundId;
                        break;
                    }
                }
            }
        } else {
            // UWP path: try ProcessId first (NativeWindowHandle almost never matches)
            for (const pid of processIds) {
                const foundId = await this.sendCommand('findElement', {
                    scope: 'children',
                    condition: propertyCondition('ProcessId', pid),
                    contextElementId: null,
                }) as string ?? '';

                if (foundId) {
                    this.log.info(`Found UWP window by ProcessId ${pid}`);
                    elementId = foundId;
                    break;
                }
            }

            if (!elementId) {
                // Fallback to NativeWindowHandle (unlikely to help, but covers edge cases)
                elementId = await this.sendCommand('findElement', {
                    scope: 'children',
                    condition: propertyCondition('NativeWindowHandle', nativeWindowHandle),
                    contextElementId: null,
                }) as string ?? '';
            }
        }

        if (elementId) {
            break;
        }

        this.log.info(`The window with handle 0x${nativeWindowHandle.toString(16).padStart(8, '0')} is not yet available in the UI Automation tree. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (${i}/${MAX_POLL_ATTEMPTS})`);
        await sleep(POLL_INTERVAL_MS);
    }

    if (!elementId) {
        throw new errors.UnknownError(`Failed to find window in UI Automation tree after ${MAX_POLL_ATTEMPTS} retries.`);
    }

    await this.sendCommand('setRootElementFromElementId', { elementId });
    const isNotNull = await this.sendCommand('checkRootElementNotNull', {}) as boolean;
    if (isNotNull) {
        const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
        const nwh = Number(await this.sendCommand('getProperty', { elementId: rootId, property: 'NativeWindowHandle' }) as string);
        if (!trySetForegroundWindow(nwh)) {
            await this.focusElement({
                [W3C_ELEMENT_KEY]: elementId,
            } satisfies Element);
        };
        return;
    }
}
