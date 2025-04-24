import { Orientation } from '@appium/types';
import {
    load,
    struct,
    union,
    sizeof,
    array,
    proto,
    opaque,
    pointer,
    alias,
    types,
    address,
} from 'koffi';
import {
    InputType,
    KeyEventFlags,
    MouseEventFlags,
    ScanCode,
    VirtualKey,
    XMouseButton,
} from './types';
import { SystemMetric } from './types/systemmetric';
import { errors } from '@appium/base-driver';
import bezier, { EasingFunction } from 'bezier-easing';
import { sleep } from '../util';
import { Key } from '../enums';

interface Event {
    type: InputType,
    u: {
        ki?: KeyboardInputStruct,
        mi?: MouseInputStruct,
        hi?: HardwareInputStruct,
    }
}

interface KeyboardEvent extends Event {
    type: typeof InputType.INPUT_KEYBOARD,
    u: {
        ki: {
            wVk: VirtualKey | 0,
            wScan: ScanCode | 0,
            dwFlags: KeyEventFlags,
            time: unknown,
            dwExtraInfo: unknown,
        } & KeyboardInputStruct,
    },
}

interface MouseEvent extends Event {
    type: typeof InputType.INPUT_MOUSE,
    u: {
        mi: {
            dx: unknown,
            dy: unknown,
            mouseData: XMouseButton | number,
            dwFlags: MouseEventFlags,
            time: unknown,
            dwExtraInfo: unknown,
        } & MouseInputStruct,
    },
}

interface Point {
    x: number,
    y: number,
}

interface DeviceModeAnsi {
    dmDeviceName: string | null,
    dmSpecVersion: number,
    dmDriverVersion: number,
    dmSize: number,
    dmDriverExtra: number,
    dmFields: number,
    u1: {
        s1: {
            dmOrientation: number,
            dmPaperSize: number,
            dmPaperLength: number,
            dmPaperWidth: number,
            dmScale: number,
            dmCopies: number,
            dmDefaultSource: number,
            dmPrintQuality: number,
        },
      dmPosition: Point,
      s2: {
            dmPosition: Point,
            dmDisplayOrientation: number,
            dmDisplayFixedOutput: number,
        },
    },
    dmColor: number,
    dmDuplex: number,
    dmYResolution: number,
    dmTTOption: number,
    dmCollate: number,
    dmFormName: string | null,
    dmLogPixels: number,
    dmBitsPerPel: number,
    dmPelsWidth: number,
    dmPelsHeight: number,
    u2: {
        dmDisplayFlags: number,
        dmNup: number,
    },
    dmDisplayFrequency: number,
    dmICMMethod: number,
    dmICMIntent: number,
    dmMediaType: number,
    dmDitherType: number,
    dmReserved1: number,
    dmReserved2: number,
    dmPanningWidth: number,
    dmPanningHeight: number,
}

// TODO: remove eslint-disable-next-line when used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HardwareInputEvent extends Event {
    type: typeof InputType.INPUT_HARDWARE,
    u: {
        hi: {
            uMsg: unknown,
            wParamL: unknown,
            wParamH: unknown,
        } & HardwareInputStruct,
    },
}

type PointStruct = {
    x: unknown,
    y: unknown,
}

type InputUnion = {
    ki: unknown,
    mi: unknown,
    hi: unknown,
}

type MouseInputStruct = {
    dx: unknown,
    dy: unknown,
    mouseData: unknown,
    dwFlags: unknown,
    time: unknown,
    dwExtraInfo: unknown,
}

type KeyboardInputStruct = {
    wVk: unknown,
    wScan: unknown,
    dwFlags: unknown,
    time: unknown,
    dwExtraInfo: unknown,
}

type HardwareInputStruct = {
    uMsg: unknown,
    wParamL: unknown,
    wParamH: unknown,
}

const easingFunctions = Object.freeze({
    'linear': (x: number) => x,
    'ease': bezier(0.25, 1, 0.25, 1),
    'ease-in': bezier(0.42, 0, 1, 1),
    'ease-out': bezier(0, 0, 0.58, 1),
    'ease-in-out': bezier(0.42, 0, 0.58, 1),
} as const);

const UINT32_MAX = 0xFFFFFFFF;
const UINT16_MAX = 0xFFFF;

const user32 = load('user32.dll');

const POINT = struct('POINT', {
    x: 'long',
    y: 'long',
} satisfies PointStruct);

const MOUSEINPUT = struct('MOUSEINPUT', {
    dx: 'long',
    dy: 'long',
    mouseData: 'uint32',
    dwFlags: 'uint32',
    time: 'uint32',
    dwExtraInfo: 'uintptr',
} satisfies MouseInputStruct);

const KEYBDINPUT = struct('KEYBDINPUT', {
    wVk: 'uint16',
    wScan: 'uint16',
    dwFlags: 'uint32',
    time: 'uint32',
    dwExtraInfo: 'uintptr',
} satisfies KeyboardInputStruct);

const HARDWAREINPUT = struct('HARDWAREINPUT', {
    uMsg: 'uint32',
    wParamL: 'uint16',
    wParamH: 'uint16',
} satisfies HardwareInputStruct);

const INPUT = struct('INPUT', {
    type: 'uint32',
    u: union({
        mi: MOUSEINPUT,
        ki: KEYBDINPUT,
        hi: HARDWAREINPUT,
    } satisfies InputUnion)
});

const DEVMODEA = struct('DEVMODEA', {
    dmDeviceName: array('char', 32, 'String'),
    dmSpecVersion: 'uint16',
    dmDriverVersion: 'uint16',
    dmSize: 'uint16',
    dmDriverExtra: 'uint16',
    dmFields: 'uint32',
    u1: union({
      s1: struct({
        dmOrientation: 'short',
        dmPaperSize: 'short',
        dmPaperLength: 'short',
        dmPaperWidth: 'short',
        dmScale: 'short',
        dmCopies: 'short',
        dmDefaultSource: 'short',
        dmPrintQuality: 'short',
      }),
      dmPosition: POINT,
      s2: struct({
        dmPosition: POINT,
        dmDisplayOrientation: 'uint32',
        dmDisplayFixedOutput: 'uint32',
      }),
    }),
    dmColor: 'short',
    dmDuplex: 'short',
    dmYResolution: 'short',
    dmTTOption: 'short',
    dmCollate: 'short',
    dmFormName: array('char', 32, 'String'),
    dmLogPixels: 'uint16',
    dmBitsPerPel: 'uint32',
    dmPelsWidth: 'uint32',
    dmPelsHeight: 'uint32',
    u2: union({
      dmDisplayFlags: 'uint32',
      dmNup: 'uint32',
    }),
    dmDisplayFrequency: 'uint32',
    dmICMMethod: 'uint32',
    dmICMIntent: 'uint32',
    dmMediaType: 'uint32',
    dmDitherType: 'uint32',
    dmReserved1: 'uint32',
    dmReserved2: 'uint32',
    dmPanningWidth: 'uint32',
    dmPanningHeight: 'uint32',
});

const BOOL = alias('BOOL', types.bool);
const DWORD = alias('DWORD', types.uint32_t);
const HANDLE = pointer('HANDLE', opaque());
const LONG_PTR = pointer('LONG_PTR', types.long);
const LPDWORD = pointer('LPDWORD', DWORD);
const HWND = alias('HWND', HANDLE);
const LPARAM = alias('LPARAM', LONG_PTR);
const LPSTR = pointer('LPSTR', 'char');

const EnumWindowsProc = proto('BOOL __stdcall EnumWindowsProc (HWND hwnd, LPARAM lParam)');

type BOOL = boolean;
type DWORD = number;
type HANDLE = unknown;
type LONG_PTR = number;
type LPDWORD = number;
type HWND = unknown;
type LPARAM = number;
type LPSTR = Buffer;

type EnumWindowsProc = (hWnd: HWND, lParam: LPARAM) => BOOL;

// TODO: update all functions to have their parameters aliased properly
const SendInput = user32.func(/* c */ `unsigned int __stdcall SendInput(unsigned int cInputs, INPUT *pInputs, int cbSize)`) as (cInputs: number, pInouts: Event[], cbSize: number) => number;
const GetSystemMetrics = user32.func(/* c */ `int __stdcall GetSystemMetrics(int nIndex)`) as (nIndex: SystemMetric) => number;
const SetProcessDPIAware = user32.func(/* c */ `bool __stdcall SetProcessDPIAware()`) as () => boolean;
const GetDpiForSystem = user32.func(/* c */ `unsigned int __stdcall GetDpiForSystem()`) as () => number;
const GetCursorPos = user32.func(/* c */ `bool __stdcall GetCursorPos(_Out_ POINT *lpPoint)`) as (lpPoint: Point) => boolean;
const EnumDisplaySettingsA = user32.func(/* c */ `bool __stdcall EnumDisplaySettingsA(str lpszDeviceName, uint iModeNum, _Out_ DEVMODEA *lpDevMode)`) as (lpszDeviceName: string | null, iModeNum: number, lpDevMode: Buffer) => boolean;
// end TODO

const GetWindowThreadProcessId = user32.func(/* c */ `DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ LPDWORD lpdwProcessId)`) as (hWnd: HWND, lpdwProcessId: [LPDWORD | null]) => DWORD;
const GetWindowTextA = user32.func(/* c */ `int __stdcall GetWindowTextA(HWND hWnd, LPSTR lpString, int nMaxCount)`) as (hWnd: HWND, lpString: LPSTR, nMaxCount: number) => number;
const IsWindowVisible = user32.func(/* c */ `BOOL __stdcall IsWindowVisible(HWND hWnd)`) as (hWnd: HWND) => BOOL;
const EnumWindows = user32.func(/* c */ `BOOL __stdcall EnumWindows(EnumWindowsProc *enumProc, LPARAM lParam)`) as (enumProc: EnumWindowsProc, lParam: LPARAM) => BOOL;
const SetForegroundWindow = user32.func(/* c */ `BOOL __stdcall SetForegroundWindow(HWND hWnd)`) as (hWnd: HWND) => BOOL;

function makeKeyboardEvent(args: {
        /** A virtual-key code. The code must be a value in the range 1 to 254. If the dwFlags member specifies KEYEVENTF_UNICODE, wVk must be 0. */
        vk?: VirtualKey,
        /** A hardware scan code for the key. If dwFlags specifies KEYEVENTF_UNICODE, wScan specifies a Unicode character which is to be sent to the foreground application. */
        scan?: ScanCode | string,
        /** Set to true if the key should be pressed, and false if key is should be released. */
        down: boolean,
    }
): KeyboardEvent {
    let flags: KeyEventFlags = 0;

    if ((args.scan === undefined && args.vk === undefined) || (args.scan !== undefined && args.vk !== undefined)) {
        throw new errors.InvalidArgumentError('You should provide either vk or scan, but not both.');
    }

    switch (typeof args.scan) {
        case 'string':
            if (args.scan.length !== 1) {
                throw new errors.InvalidArgumentError(`scan parameter expects a single character, but received ${args.scan.length}.`);
            }

            flags |= KeyEventFlags.KEYEVENTF_UNICODE;
            args.scan = args.scan.charCodeAt(0) as ScanCode;
            break;
        case 'number':
            flags |= KeyEventFlags.KEYEVENTF_SCANCODE;
            break;
    }

    if (!args.down) {
        flags |= KeyEventFlags.KEYEVENTF_KEYUP;
    }

    return {
        type: InputType.INPUT_KEYBOARD,
        u: {
            ki: {
                wVk: args.vk ?? 0,
                wScan: args.scan as ScanCode ?? 0,
                dwFlags: flags as KeyEventFlags ?? 0,
                time: 0,
                dwExtraInfo: 0,
            }
        }
    };
}

function makeEmptyMouseEvent(): MouseEvent {
    return {
        type: InputType.INPUT_MOUSE,
        u: {
            mi: {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: 0,
                time: 0,
                dwExtraInfo: 0,
            }
        }
    };
}

function makeMouseDownEvents(button: number): MouseEvent[] {
    const mouseEvent: MouseEvent = makeEmptyMouseEvent();

    switch (button) {
        case 0:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_LEFTDOWN;
            break;
        case 1:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_MIDDLEDOWN;
            break;
        case 2:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_RIGHTDOWN;
            break;
        case 3:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_XDOWN;
            mouseEvent.u.mi.mouseData = XMouseButton.XBUTTON1;
            break;
        case 4:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_XDOWN;
            mouseEvent.u.mi.mouseData = XMouseButton.XBUTTON2;
            break;
        default:
            throw new errors.InvalidArgumentError('button parameter should be a positive integer between 0 and 4.');
    }

    return [mouseEvent];
}

function makeMouseUpEvents(button: number): MouseEvent[] {
    const mouseEvent: MouseEvent = makeEmptyMouseEvent();

    switch (button) {
        case 0:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_LEFTUP;
            break;
        case 1:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_MIDDLEUP;
            break;
        case 2:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_RIGHTUP;
            break;
        case 3:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_XUP;
            mouseEvent.u.mi.mouseData = XMouseButton.XBUTTON1;
            break;
        case 4:
            mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_XUP;
            mouseEvent.u.mi.mouseData = XMouseButton.XBUTTON2;
            break;
        default:
            throw new errors.InvalidArgumentError('button parameter should be a positive integer between 0 and 4.');
    }

    return [mouseEvent];
}

function makeMouseMoveEvents(args: {
        /** The absolute position of the mouse, or the amount of motion since the last mouse event was generated, depending on the value of the dwFlags member. Absolute data is specified as the x coordinate of the mouse; relative data is specified as the number of pixels moved. */
        x: number,
        /** The absolute position of the mouse, or the amount of motion since the last mouse event was generated, depending on the value of the dwFlags member. Absolute data is specified as the y coordinate of the mouse; relative data is specified as the number of pixels moved. */
        y: number,
        /** Set to true if the event is a mouse wheel move, and false if it's a mouse move. */
        wheel: boolean,
        /** Set to true if the event is a mouse move with relative coordinates. This argument is ignored for mouse wheel move. */
        relative?: boolean,
        /** Set to screen resolution [width, height] when the mouse move is absolute. */
        screenResolutionAndRefreshRate?: ReturnType<typeof getScreenResolutionAndRefreshRate>;
    }
): MouseEvent[] {
    const { x, y, wheel, relative, screenResolutionAndRefreshRate} = args;

    if (wheel) {
        const mouseEvents: MouseEvent[] = [];

        if (x !== 0) {
            const horizontalScrollEvent = makeEmptyMouseEvent();
            horizontalScrollEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_HWHEEL;
            horizontalScrollEvent.u.mi.mouseData = x;
            mouseEvents.push(horizontalScrollEvent);
        }

        if (y !== 0) {
            const verticalScrollEvent = makeEmptyMouseEvent();
            verticalScrollEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_WHEEL;
            verticalScrollEvent.u.mi.mouseData = y;
        }

        return mouseEvents;
    }

    const mouseEvent: MouseEvent = makeEmptyMouseEvent();

    if (!screenResolutionAndRefreshRate) {
        throw new errors.InvalidArgumentError('screenResolution parameter must be set for absolute mouse move.');
    }

    const [screenWidth, screenHeight] = screenResolutionAndRefreshRate;

    mouseEvent.u.mi.dx = relative ? Math.trunc(x) : Math.trunc((x * UINT16_MAX) / screenWidth);
    mouseEvent.u.mi.dy = relative ? Math.trunc(y) : Math.trunc((y * UINT16_MAX) / screenHeight);
    mouseEvent.u.mi.dwFlags = MouseEventFlags.MOUSEEVENTF_MOVE;

    if (!relative) {
        mouseEvent.u.mi.dwFlags |= MouseEventFlags.MOUSEEVENTF_ABSOLUTE;
    }

    return [mouseEvent];
}

function charToKeyboardEvents(char: string, down: boolean, forceUnicode: boolean = false): KeyboardEvent[] {
    const charCode = char.charCodeAt(0);
    if ((charCode & 0xF000) === 0xE000) {
        switch (char) {
            case Key.CANCEL:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_CANCEL, down })];
            case Key.HELP:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_HELP, down })];
            case Key.BACKSPACE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_BACK, down })];
            case Key.TAB:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_TAB, down })];
            case Key.CLEAR:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_CLEAR, down })];
            case Key.RETURN:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RETURN, down })];
            case Key.ENTER:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RETURN, down })];
            case Key.SHIFT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_SHIFT, down })];
            case Key.CONTROL:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_CONTROL, down })];
            case Key.ALT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_MENU, down })];
            case Key.PAUSE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_PAUSE, down })];
            case Key.ESCAPE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_ESCAPE, down })];
            case Key.SPACE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_SPACE, down })];
            case Key.PAGE_UP:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_PRIOR, down })];
            case Key.PAGE_DOWN:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NEXT, down })];
            case Key.END:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_END, down })];
            case Key.HOME:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_HOME, down })];
            case Key.LEFT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_LEFT, down })];
            case Key.UP:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_UP, down })];
            case Key.RIGHT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RIGHT, down })];
            case Key.DOWN:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_DOWN, down })];
            case Key.INSERT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_INSERT, down })];
            case Key.DELETE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_DELETE, down })];
            case Key.SEMICOLON:
                return [makeKeyboardEvent({ scan: ScanCode.SEMICOLON, down })];
            case Key.EQUALS:
                return [makeKeyboardEvent({ scan: ScanCode.EQUAL, down })];
            case Key.NUMPAD0:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD0, down })];
            case Key.NUMPAD1:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD1, down })];
            case Key.NUMPAD2:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD2, down })];
            case Key.NUMPAD3:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD3, down })];
            case Key.NUMPAD4:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD4, down })];
            case Key.NUMPAD5:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD5, down })];
            case Key.NUMPAD6:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD6, down })];
            case Key.NUMPAD7:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD7, down })];
            case Key.NUMPAD8:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD8, down })];
            case Key.NUMPAD9:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD9, down })];
            case Key.MULTIPLY:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_MULTIPLY, down })];
            case Key.ADD:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_ADD, down })];
            case Key.SEPARATOR:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_SEPARATOR, down })];
            case Key.SUBTRACT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_SUBTRACT, down })];
            case Key.DECIMAL:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_DECIMAL, down })];
            case Key.DIVIDE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_DIVIDE, down })];
            case Key.F1:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F1, down })];
            case Key.F2:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F2, down })];
            case Key.F3:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F3, down })];
            case Key.F4:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F4, down })];
            case Key.F5:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F5, down })];
            case Key.F6:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F6, down })];
            case Key.F7:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F7, down })];
            case Key.F8:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F8, down })];
            case Key.F9:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F9, down })];
            case Key.F10:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F10, down })];
            case Key.F11:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F11, down })];
            case Key.F12:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_F12, down })];
            case Key.META:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_LWIN, down })];
            case Key.ZENKAKUHANKAKU:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_OEM_AUTO, down })];
            case Key.R_SHIFT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RSHIFT, down })];
            case Key.R_CONTROL:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RCONTROL, down })];
            case Key.R_ALT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RMENU, down })];
            case Key.R_META:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_RWIN, down })];
            case Key.R_PAGEUP:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD9, down })];
            case Key.R_PAGEDOWN:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD3, down })];
            case Key.R_END:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD1, down })];
            case Key.R_HOME:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD7, down })];
            case Key.R_ARROWLEFT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD4, down })];
            case Key.R_ARROWUP:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD8, down })];
            case Key.R_ARROWRIGHT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD6, down })];
            case Key.R_ARROWDOWN:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD2, down })];
            case Key.R_INSERT:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_NUMPAD0, down })];
            case Key.R_DELETE:
                return [makeKeyboardEvent({ vk: VirtualKey.VK_DECIMAL, down })];
            default:
                throw new errors.InvalidArgumentError(`Invalid character \\u${charCode.toString(16)}.`);
        }
    }

    // Currently only [a-z0-9] are sent as scan code through performAction (in order for them to work in hotkeys).
    if (!forceUnicode) {
        if (/[a-z]/.test(char)) {
            return [makeKeyboardEvent({ scan: ScanCode[char.toUpperCase() as keyof typeof ScanCode], down })];
        }
        if (/[0-9]/.test(char)) {
            return [makeKeyboardEvent({ scan: ScanCode[`N${char}` as keyof typeof ScanCode], down })];
        }
    }

    return [makeKeyboardEvent({ scan: char, down })];
}

function sendKeyInput(char: string, down: boolean, forceUnicode: boolean = false): void {
    const events = charToKeyboardEvents(char, down, forceUnicode);
    const returnCode = SendInput(events.length, events, sizeof(INPUT));

    assertSuccessSendInputReturnCode(returnCode);
}

function sendMouseButtonInput(button: number, down: boolean) {
    const events = down ? makeMouseDownEvents(button) : makeMouseUpEvents(button);
    const returnCode = SendInput(events.length, events, sizeof(INPUT));

    assertSuccessSendInputReturnCode(returnCode);
}

async function sendMouseMoveInput(args: { x: number, y: number, relative: boolean, duration: number, easingFunction?: string }): Promise<void> {
    const { duration } = args;
    let { x, y, easingFunction, relative } = args;
    const screenResolutionAndRefreshRate = getScreenResolutionAndRefreshRate();
    const [, , refreshRate] = screenResolutionAndRefreshRate;
    const updateInterval = 1000 / refreshRate;
    const iterations = Math.max(Math.floor(duration / updateInterval), 1);

    const cursorPosition = {
        x: 0,
        y: 0,
    } satisfies Point;

    if (GetCursorPos(cursorPosition) && iterations > 1) {
        if (relative) {
            x += cursorPosition.x;
            y += cursorPosition.y;
        }

        // setting relative to false since coordinates are now absolute
        relative = false;
    } else {
        // ignore easing function of it can't retrieve current cursor position
        // this is preventing the method from failing
        easingFunction = undefined;
    }

    if (easingFunction) {
        let calculatePoint: EasingFunction;

        // the lines below assume that the validation has been made on createSession
        if (easingFunction.startsWith('cubic-bezier')) {
            const bezierArgs = /\((.*?)\)/.exec(easingFunction)?.groups?.[0]
                .split(',').map((n) => parseFloat(n.trim())) ?? [0, 0, 1, 1];

            calculatePoint = bezier.apply(bezierArgs);
        } else {
            calculatePoint = easingFunctions[easingFunction];
        }

        for (let i = 1; i < iterations; i++) {
            setTimeout(() => {
                const normalizedProgress = (i + 1) / iterations;
                const easedProgress = i !== iterations - 1 ? calculatePoint(normalizedProgress) : 1;
                const interpolatedX = cursorPosition.x + (x - cursorPosition.x) * easedProgress;
                const interpolatedY = cursorPosition.y + (y - cursorPosition.y) * easedProgress;

                const events = makeMouseMoveEvents({ x: interpolatedX, y: interpolatedY, wheel: false, screenResolutionAndRefreshRate });
                const returnCode = SendInput(events.length, events, sizeof(INPUT));

                assertSuccessSendInputReturnCode(returnCode);
            }, i * updateInterval);
        }
    } else {
        const events = makeMouseMoveEvents({ x, y, wheel: false, screenResolutionAndRefreshRate });
        const returnCode = SendInput(events.length, events, sizeof(INPUT));

        assertSuccessSendInputReturnCode(returnCode);
    }

    await sleep(duration);
}

function sendMouseScrollInput(x: number, y: number) {
    const events = makeMouseMoveEvents({ x, y, wheel: true });
    const returnCode = SendInput(events.length, events, sizeof(INPUT));

    assertSuccessSendInputReturnCode(returnCode);
}

function assertSuccessSendInputReturnCode(returnCode: number) {
    if (returnCode === UINT32_MAX) {
        throw new errors.UnknownError('An error occurred while executing SendInput.');
    }
}

// TODO: Remove eslint-disable-next-line when used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getResolutionScalingFactor(): number {
    const dpi = GetDpiForSystem();
    const scalingFactor = dpi / 96;

    // @ts-expect-error temporary quick and dirty version of memoization
    getResolutionScalingFactor = () => scalingFactor;

    return scalingFactor;
}

function getScreenResolutionAndRefreshRate(): [number, number, number] {
    const width = GetSystemMetrics(SystemMetric.SM_CXSCREEN);
    const height = GetSystemMetrics(SystemMetric.SM_CYSCREEN);
    let refreshRate: number | null = null;

    const buffer = Buffer.alloc(sizeof(DEVMODEA));
    EnumDisplaySettingsA(null, -1, buffer);
    const deviceMode = { dmDisplayFrequency: buffer.readUInt32LE(120) } as DeviceModeAnsi;
    refreshRate = deviceMode.dmDisplayFrequency;

    const resolution = [width, height, refreshRate] satisfies ReturnType<typeof getScreenResolutionAndRefreshRate>;

    const nonMemoizedMethod = getScreenResolutionAndRefreshRate;
    const currentTime = new Date().getTime();

    // @ts-expect-error memoizing the function to prevent repeated calls that might crash Node.js
    getScreenResolutionAndRefreshRate = () => {
        if (new Date().getTime() - currentTime > 1000) {
            // @ts-expect-error reset memoization after 1 second
            getScreenResolutionAndRefreshRate = nonMemoizedMethod;
        }
        return resolution;
    };

    return resolution;
}

export function keyDown(char: string, forceUnicode: boolean = false): void {
    sendKeyInput(char, true, forceUnicode);
}

export function keyUp(char: string, forceUnicode: boolean = false): void {
    sendKeyInput(char, false, forceUnicode);
}

export async function mouseMoveRelative(x: number, y: number, duration: number = 0, easingFunction?: string): Promise<void> {
    await sendMouseMoveInput({x, y, relative: true, duration, easingFunction});
}

export function mouseScroll(x: number, y: number): void {
    sendMouseScrollInput(x, y);
}

export async function mouseMoveAbsolute(x: number, y: number, duration: number = 0, easingFunction?: string): Promise<void> {
    await sendMouseMoveInput({x, y, relative: false, duration, easingFunction});
}

export function mouseDown(button: number = 0): void {
    sendMouseButtonInput(button, true);
}

export function mouseUp(button: number = 0): void {
    sendMouseButtonInput(button, false);
}

export function getDisplayOrientation(): Orientation {
    const resolution = getScreenResolutionAndRefreshRate();
    return resolution[0] > resolution[1] ? 'LANDSCAPE' : 'PORTRAIT';
}

export function setDpiAwareness() {
    if (!SetProcessDPIAware()) {
        throw new errors.UnknownError('An error occurred while trying to set DPI awareness.');
    };
}

export function getWindowAllHandlesForProcessIds(processIds: number[]): number[] {
    const handles: number[] = [];
    EnumWindows((hWnd) => {
        const ptr: [LPDWORD | null] = [null];
        GetWindowThreadProcessId(hWnd, ptr);
        const pid = ptr[0];
        if (pid && processIds.includes(pid) && IsWindowVisible(hWnd)) {
            const buffer = Buffer.alloc(256); // Adjust size as needed
            GetWindowTextA(hWnd, buffer, buffer.length);
            const windowTitle = buffer.toString('utf8').replace(/\0/g, '');

            if (windowTitle) {
                handles.push(Number(address(hWnd)));
            }
        }

        return true;
    }, 0);

    return handles;
}

export function trySetForegroundWindow(windowHandle: number): boolean {
    return EnumWindows((hWnd) => {
        if (windowHandle === Number(address(hWnd))) {
            SetForegroundWindow(hWnd);
            return false;
        }

        return true;
    }, 0);
}

export function sendKeyboardEvents(inputs: (KeyboardEvent['u']['ki'])[]): number {
    return SendInput(inputs.length, inputs.map((ki) => ({
        type: InputType.INPUT_KEYBOARD,
        u: { ki },
    })), sizeof(INPUT));
}
