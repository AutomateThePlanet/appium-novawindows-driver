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

// setWindow is called often during a session. If a handle doesn't exist,
// we fail fast (~400ms) instead of waiting 6s. Session-attach loops below
// still use MAX_POLL_ATTEMPTS.
const SET_WINDOW_MAX_POLL_ATTEMPTS = 2;

/**
 * Normalizes the `ms:waitForAppLaunch` capability to milliseconds.
 *
 * WinAppDriver's spec says the value is in seconds (max 50), but many users
 * pass milliseconds (e.g. 120000 meaning "120 seconds"). We auto-detect:
 * values > 120 are assumed to already be in milliseconds; values ≤ 120 are
 * treated as seconds and converted to ms.
 */
function normalizeWaitForAppLaunchMs(raw: number | undefined): number {
    if (raw == null || raw <= 0) {return 0;}
    // Values > 120 are almost certainly milliseconds (120 seconds is already very generous;
    // WinAppDriver caps at 50s). Values ≤ 120 are seconds per the original spec.
    return raw > 120 ? raw : raw * 1000;
}

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
    for (let i = 1; i <= SET_WINDOW_MAX_POLL_ATTEMPTS; i++) {
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

        this.log.info(`Failed to locate window with name '${name}'. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (${i}/${SET_WINDOW_MAX_POLL_ATTEMPTS})`);
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
    const waitForAppLaunchMs = normalizeWaitForAppLaunchMs(this.caps['ms:waitForAppLaunch']);

    // When ms:waitForAppLaunch is set, use it as an overall deadline for
    // all retry loops. When not set, fall back to fixed iteration counts.
    const deadline = waitForAppLaunchMs ? Date.now() + waitForAppLaunchMs : null;

    if (isUwp) {
        this.log.debug('Detected app path to be in the UWP format.');
        await this.sendCommand('startProcess', {
            path: 'explorer.exe',
            arguments: `shell:AppsFolder\\${path}`,
        });

        // Outer retry loop: polls until the app window is found or the
        // deadline / attempt limit is reached. Each iteration is one
        // POLL_INTERVAL_MS tick — no blind sleep up front.
        for (let i = 1; deadline ? Date.now() < deadline : i <= 10; i++) {
            const processIds = await this.sendCommand('getProcessIds', { processName: 'ApplicationFrameHost' }) as number[];

            if (processIds.length > 0) {
                this.log.debug('Process IDs of ApplicationFrameHost processes: ' + processIds.join(', '));
                try {
                    const result = await this.attachToApplicationWindow(processIds, { isUwp: true, deadline });
                    if (!result.focused && deadline && Date.now() < deadline) {
                        this.log.info('Attached to a window that cannot receive focus (likely a splash screen). Waiting for the main window...');
                        await this.waitForMainWindow(processIds, { isUwp: true }, deadline);
                    }
                    return;
                } catch {
                    // noop — retry after a short delay
                }
            }

            this.log.info(`Failed to locate window of the app. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (attempt ${i})`);
            await sleep(POLL_INTERVAL_MS);
        }
    } else {
        this.log.debug('Detected app path to be in the classic format.');
        const normalizedPath = normalize(path);
        await this.sendCommand('startProcess', {
            path: normalizedPath,
            arguments: this.caps.appArguments ?? null,
            workingDir: this.caps.appWorkingDir ?? null,
            waitForAppLaunchMs: waitForAppLaunchMs || null,
        });

        const breadcrumbs = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
        const executable = breadcrumbs[breadcrumbs.length - 1];
        const processName = executable.endsWith('.exe') ? executable.slice(0, executable.length - 4) : executable;

        for (let i = 1; deadline ? Date.now() < deadline : i <= MAX_POLL_ATTEMPTS; i++) {
            try {
                const processIds = await this.sendCommand('getProcessIds', { processName }) as number[];
                if (processIds.length > 0) {
                    this.log.debug(`Process IDs of '${processName}' processes: ` + processIds.join(', '));
                    const result = await this.attachToApplicationWindow(processIds, { isUwp: false, deadline });
                    if (!result.focused && deadline && Date.now() < deadline) {
                        this.log.info('Attached to a window that cannot receive focus (likely a splash screen). Waiting for the main window...');
                        await this.waitForMainWindow(processIds, { isUwp: false }, deadline);
                    }
                    return;
                }
            } catch (err) {
                if (err instanceof Error) {
                    this.log.debug(`Received error:\n${err.message}`);
                }
            }

            this.log.info(`Failed to locate window of the app. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (attempt ${i})`);
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

export async function maximizeWindow(this: NovaWindowsDriver): Promise<Rect> {
    const elementId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    await this.sendCommand('maximizeWindow', { elementId });
    return await this.getWindowRect();
}

export async function minimizeWindow(this: NovaWindowsDriver): Promise<Rect> {
    const elementId = (await this.sendCommand('saveRootElementToTable', {}) as string)?.trim();
    if (!elementId) {
        throw new errors.NoSuchWindowError('No active window found for this session.');
    }
    await this.sendCommand('minimizeWindow', { elementId });
    return await this.getWindowRect();
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
    options: { isUwp?: boolean, deadline?: number | null } = {},
): Promise<{ focused: boolean }> {
    const { isUwp = false, deadline = null } = options;
    const waitForAppLaunchMs = normalizeWaitForAppLaunchMs(this.caps['ms:waitForAppLaunch']) || POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS;
    const windowTimeout = deadline
        ? Math.min(waitForAppLaunchMs, Math.max(0, deadline - Date.now()))
        : waitForAppLaunchMs;
    const nativeWindowHandle = await waitForNewWindow.call(
        this,
        processIds[0],
        windowTimeout,
    );

    let elementId = '';

    for (let i = 1; deadline ? Date.now() < deadline : i <= MAX_POLL_ATTEMPTS; i++) {
        // --- Strategy A: match by NativeWindowHandle (best for classic apps) ---
        // --- Strategy B: match by ProcessId (best for UWP apps) ---
        // Run the preferred strategy first to avoid a wasted round-trip.

        if (!isUwp) {
            // Classic path: resolve the HWND directly via AutomationElement.FromHandle.
            // One COM call to the target window's provider — no TreeScope.Children
            // enumeration of the desktop, so a neighboring unresponsive top-level
            // window can't block us for the full 60s COM RPC timeout.
            try {
                elementId = await this.sendCommand('elementFromHandle', { handle: nativeWindowHandle }) as string ?? '';
            } catch {
                elementId = '';
            }

            if (!elementId) {
                // Fallback to ProcessId (still uses the desktop children walk — only
                // reached when FromHandle returned null, e.g. HWND not in UIA tree yet).
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
            // UWP path: ApplicationFrameHost often has several HWNDs
            // (pre-existing for other UWP apps, plus calc's outer frame and
            // inner XAML host). Iterate all of them, attaching via
            // elementFromHandle, and pick the first whose subtree actually has
            // focusable content — that's the loaded app. elementFromHandle is
            // sub-ms; the IsKeyboardFocusable probe is whatever the native
            // FindFirst costs for that window, which is negligible when the
            // window has no content and sub-100ms when it does.
            const uwpHandles = getWindowAllHandlesForProcessIds(processIds);
            let fallbackElementId = '';
            for (const hwnd of uwpHandles) {
                let candidateId = '';
                try {
                    candidateId = await this.sendCommand('elementFromHandle', { handle: hwnd }) as string ?? '';
                } catch {
                    continue;
                }
                if (!candidateId) {continue;}
                if (!fallbackElementId) {fallbackElementId = candidateId;}

                const focusables = await this.sendCommand('findElements', {
                    scope: 'descendants',
                    condition: propertyCondition('IsKeyboardFocusable', true),
                    contextElementId: candidateId,
                }) as string[];

                if (focusables && focusables.length >= 2) {
                    this.log.info(`Found UWP window 0x${hwnd.toString(16).padStart(8, '0')} with content (${focusables.length} focusable descendants).`);
                    elementId = candidateId;
                    break;
                }
            }

            if (!elementId && fallbackElementId) {
                // No window with content yet (calc still loading). Attach to the
                // most recent HWND; the retry loop will try again or the post-
                // attach splash probe will fire waitForMainWindow.
                elementId = fallbackElementId;
            }

            if (!elementId) {
                // No HWND matched at all — fall back to ProcessId search on
                // desktop (slow while UWP apps are loading, but correct once
                // calc's window is registered).
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
            }
        }

        if (elementId) {
            break;
        }

        this.log.info(`The window with handle 0x${nativeWindowHandle.toString(16).padStart(8, '0')} is not yet available in the UI Automation tree. Sleeping for ${POLL_INTERVAL_MS}ms and retrying... (attempt ${i})`);
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
        let focused = trySetForegroundWindow(nwh);
        if (!focused) {
            try {
                await this.focusElement({
                    [W3C_ELEMENT_KEY]: elementId,
                } satisfies Element);
                focused = true;
            } catch {
                // Window cannot receive focus (e.g. splash screen)
            }
        }

        // Splash-screen guard. UIA3's SetFocus returns success even on splash
        // windows (unlike UIA1, which threw on non-focusable targets). Probe
        // the attached window for keyboard-focusable descendants — splash
        // screens typically have 0–1 (a bitmap plus maybe a single button),
        // real app windows have several (inputs + action buttons). If the
        // window looks splash-shaped, flag it as unfocused so the caller
        // runs waitForMainWindow and re-attaches once the real window appears.
        if (focused) {
            try {
                const focusables = await this.sendCommand('findElements', {
                    scope: 'descendants',
                    condition: propertyCondition('IsKeyboardFocusable', true),
                    contextElementId: elementId,
                }) as string[];
                if (!focusables || focusables.length < 2) {
                    this.log.info(`Attached window has only ${focusables?.length ?? 0} focusable descendant(s); treating as a splash screen.`);
                    focused = false;
                }
            } catch {
                // If the check itself fails, we can't tell — leave focused as-is.
            }
        }

        return { focused };
    }
    return { focused: false };
}

/**
 * Waits for a splash screen to disappear and re-attaches to the app's main window.
 *
 * After `attachToApplicationWindow` attaches to a window that can't receive focus
 * (a splash screen), this function polls until the current root element becomes
 * stale (splash screen closed) or a new, different window handle appears for the
 * same process. It then re-attaches to the new main window.
 */
export async function waitForMainWindow(
    this: NovaWindowsDriver,
    processIds: number[],
    options: { isUwp: boolean },
    deadline: number,
): Promise<void> {
    // Capture the splash screen's window handle so we can detect when a new window appears
    let splashHandle: number | null = null;
    try {
        const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
        splashHandle = Number(await this.sendCommand('getProperty', { elementId: rootId, property: 'NativeWindowHandle' }) as string);
    } catch {
        // If we can't get the handle, we'll just watch for staleness
    }

    this.log.debug(`Splash screen handle: ${splashHandle != null ? `0x${splashHandle.toString(16).padStart(8, '0')}` : 'unknown'}. Polling for main window...`);

    let attempt = 0;
    while (Date.now() < deadline) {
        attempt++;
        await sleep(POLL_INTERVAL_MS);

        // Check if the current root element is still alive
        let rootStale = false;
        try {
            const isNotNull = await this.sendCommand('checkRootElementNotNull', {}) as boolean;
            if (!isNotNull) {
                rootStale = true;
            } else {
                // Try to read a property — if the element is stale, this throws
                const rootId = await this.sendCommand('saveRootElementToTable', {}) as string;
                await this.sendCommand('getProperty', { elementId: rootId, property: 'Name' });
            }
        } catch {
            rootStale = true;
        }

        if (rootStale) {
            this.log.info(`Splash screen closed (root element stale after ${attempt} polls). Re-attaching to main window via attachToApplicationWindow...`);
            // Clear the stale root so attachToApplicationWindow starts fresh
            await this.sendCommand('setRootElementNull', {});
            // attachToApplicationWindow has its own polling loop for the UIA tree,
            // so it will wait until the new main window registers.
            const result = await this.attachToApplicationWindow(processIds, { isUwp: options.isUwp, deadline });
            if (result.focused) {
                this.log.info('Successfully attached to the main application window after splash screen.');
            } else {
                this.log.info('Attached to main window (could not focus, but window found).');
            }
            return;
        }

        // Root is still alive — check if the process now has a different (new) window
        if (splashHandle != null) {
            const handles = getWindowAllHandlesForProcessIds(processIds);
            const newHandle = handles.find((h) => h !== splashHandle);
            if (newHandle) {
                this.log.info(`New window detected (0x${newHandle.toString(16).padStart(8, '0')}) alongside splash screen (attempt ${attempt}). Waiting for splash to close...`);
                // Don't re-attach yet — let the splash finish naturally.
                // Once it closes, the root-stale path above will handle re-attach.
            }
        }

        if (attempt % 10 === 0) {
            this.log.debug(`Still waiting for splash screen to close... (attempt ${attempt})`);
        }
    }

    this.log.warn('Deadline reached while waiting for splash screen to close. Session is attached to the splash screen window.');
}

