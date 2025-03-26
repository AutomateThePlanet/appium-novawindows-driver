import { FlagsEnum } from '../../enums';

export const KeyEventFlags = Object.freeze({
    /** If specified, the wScan scan code consists of a sequence of two bytes, where the first byte has a value of 0xE0. See Extended-Key Flag for more info. */
    KEYEVENTF_EXTENDEDKEY: 0x0001,
    /** If specified, the key is being released. If not specified, the key is being pressed. */
    KEYEVENTF_KEYUP: 0x0002,
    /** If specified, wScan identifies the key and wVk is ignored. */
    KEYEVENTF_SCANCODE: 0x0008,
    /** If specified, the system synthesizes a VK_PACKET keystroke. The wVk parameter must be zero. This flag can only be combined with the KEYEVENTF_KEYUP flag. For more information, see the Remarks section. */
    KEYEVENTF_UNICODE: 0x0004,
} as const);

export type KeyEventFlags = FlagsEnum<typeof KeyEventFlags>;