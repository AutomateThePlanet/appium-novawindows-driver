import type {Enum} from '../../enums';

export const VirtualKey = Object.freeze({
  /** Left mouse button */
  VK_LBUTTON: 0x01,
  /** Right mouse button */
  VK_RBUTTON: 0x02,
  /** Control-break processing */
  VK_CANCEL: 0x03,
  /** Middle mouse button */
  VK_MBUTTON: 0x04,
  /** X1 mouse button */
  VK_XBUTTON1: 0x05,
  /** X2 mouse button */
  VK_XBUTTON2: 0x06,
  /** BACKSPACE key */
  VK_BACK: 0x08,
  /** TAB key */
  VK_TAB: 0x09,
  /** CLEAR key */
  VK_CLEAR: 0x0c,
  /** ENTER key */
  VK_RETURN: 0x0d,
  /** SHIFT key */
  VK_SHIFT: 0x10,
  /** CTRL key */
  VK_CONTROL: 0x11,
  /** ALT key */
  VK_MENU: 0x12,
  /** PAUSE key */
  VK_PAUSE: 0x13,
  /** CAPS LOCK key */
  VK_CAPITAL: 0x14,
  /** IME Kana mode */
  VK_KANA: 0x15,
  /** IME Hangul mode */
  VK_HANGUL: 0x15,
  /** IME On */
  VK_IME_ON: 0x16,
  /** IME Junja mode */
  VK_JUNJA: 0x17,
  /** IME final mode */
  VK_FINAL: 0x18,
  /** IME Hanja mode */
  VK_HANJA: 0x19,
  /** IME Kanji mode */
  VK_KANJI: 0x19,
  /** IME Off */
  VK_IME_OFF: 0x1a,
  /** ESC key */
  VK_ESCAPE: 0x1b,
  /** IME convert */
  VK_CONVERT: 0x1c,
  /** IME nonconvert */
  VK_NONCONVERT: 0x1d,
  /** IME accept */
  VK_ACCEPT: 0x1e,
  /** IME mode change request */
  VK_MODECHANGE: 0x1f,
  /** SPACEBAR */
  VK_SPACE: 0x20,
  /** PAGE UP key */
  VK_PRIOR: 0x21,
  /** PAGE DOWN key */
  VK_NEXT: 0x22,
  /** END key */
  VK_END: 0x23,
  /**  HOME key */
  VK_HOME: 0x24,
  /** LEFT ARROW key */
  VK_LEFT: 0x25,
  /** UP ARROW key */
  VK_UP: 0x26,
  /** RIGHT ARROW key */
  VK_RIGHT: 0x27,
  /** DOWN ARROW key */
  VK_DOWN: 0x28,
  /** SELECT key */
  VK_SELECT: 0x29,
  /** PRINT key */
  VK_PRINT: 0x2a,
  /** EXECUTE key */
  VK_EXECUTE: 0x2b,
  /** PRINT SCREEN key */
  VK_SNAPSHOT: 0x2c,
  /** INS key */
  VK_INSERT: 0x2d,
  /** DEL key */
  VK_DELETE: 0x2e,
  /** HELP key */
  VK_HELP: 0x2f,
  /** 0 key */
  VK_KEY_0: 0x30,
  /** 1 key */
  VK_KEY_1: 0x31,
  /** 2 key */
  VK_KEY_2: 0x32,
  /** 3 key */
  VK_KEY_3: 0x33,
  /** 4 key */
  VK_KEY_4: 0x34,
  /** 5 key */
  VK_KEY_5: 0x35,
  /** 6 key */
  VK_KEY_6: 0x36,
  /** 7 key */
  VK_KEY_7: 0x37,
  /** 8 key */
  VK_KEY_8: 0x38,
  /** 9 key */
  VK_KEY_9: 0x39,
  /** A key */
  VK_KEY_A: 0x41,
  /** B key */
  VK_KEY_B: 0x42,
  /** C key */
  VK_KEY_C: 0x43,
  /** D key */
  VK_KEY_D: 0x44,
  /** E key */
  VK_KEY_E: 0x45,
  /** F key */
  VK_KEY_F: 0x46,
  /** G key */
  VK_KEY_G: 0x47,
  /** H key */
  VK_KEY_H: 0x48,
  /** I key */
  VK_KEY_I: 0x49,
  /** J key */
  VK_KEY_J: 0x4a,
  /** K key */
  VK_KEY_K: 0x4b,
  /** L key */
  VK_KEY_L: 0x4c,
  /** M key */
  VK_KEY_M: 0x4d,
  /** N key */
  VK_KEY_N: 0x4e,
  /** O key */
  VK_KEY_O: 0x4f,
  /** P key */
  VK_KEY_P: 0x50,
  /** Q key */
  VK_KEY_Q: 0x51,
  /** R key */
  VK_KEY_R: 0x52,
  /** S key */
  VK_KEY_S: 0x53,
  /** T key */
  VK_KEY_T: 0x54,
  /** U key */
  VK_KEY_U: 0x55,
  /** V key */
  VK_KEY_V: 0x56,
  /** W key */
  VK_KEY_W: 0x57,
  /** X key */
  VK_KEY_X: 0x58,
  /** Y key */
  VK_KEY_Y: 0x59,
  /** Z key */
  VK_KEY_Z: 0x5a,
  /** Left Windows key */
  VK_LWIN: 0x5b,
  /** Right Windows key */
  VK_RWIN: 0x5c,
  /** Applications key */
  VK_APPS: 0x5d,
  /** Computer Sleep key */
  VK_SLEEP: 0x5f,
  /** Numeric keypad 0 key */
  VK_NUMPAD0: 0x60,
  /** Numeric keypad 1 key */
  VK_NUMPAD1: 0x61,
  /** Numeric keypad 2 key */
  VK_NUMPAD2: 0x62,
  /** Numeric keypad 3 key */
  VK_NUMPAD3: 0x63,
  /** Numeric keypad 4 key */
  VK_NUMPAD4: 0x64,
  /** Numeric keypad 5 key */
  VK_NUMPAD5: 0x65,
  /** Numeric keypad 6 key */
  VK_NUMPAD6: 0x66,
  /** Numeric keypad 7 key */
  VK_NUMPAD7: 0x67,
  /** Numeric keypad 8 key */
  VK_NUMPAD8: 0x68,
  /** Numeric keypad 9 key */
  VK_NUMPAD9: 0x69,
  /** Multiply key */
  VK_MULTIPLY: 0x6a,
  /** Add key */
  VK_ADD: 0x6b,
  /** Separator key */
  VK_SEPARATOR: 0x6c,
  /** Subtract key */
  VK_SUBTRACT: 0x6d,
  /** Decimal key */
  VK_DECIMAL: 0x6e,
  /** Divide key */
  VK_DIVIDE: 0x6f,
  /** F1 key */
  VK_F1: 0x70,
  /** F2 key */
  VK_F2: 0x71,
  /** F3 key */
  VK_F3: 0x72,
  /** F4 key */
  VK_F4: 0x73,
  /** F5 key */
  VK_F5: 0x74,
  /** F6 key */
  VK_F6: 0x75,
  /** F7 key */
  VK_F7: 0x76,
  /** F8 key */
  VK_F8: 0x77,
  /** F9 key */
  VK_F9: 0x78,
  /** F10 key */
  VK_F10: 0x79,
  /** F11 key */
  VK_F11: 0x7a,
  /** F12 key */
  VK_F12: 0x7b,
  /** F13 key */
  VK_F13: 0x7c,
  /** F14 key */
  VK_F14: 0x7d,
  /** F15 key */
  VK_F15: 0x7e,
  /** F16 key */
  VK_F16: 0x7f,
  /** F17 key */
  VK_F17: 0x80,
  /** F18 key */
  VK_F18: 0x81,
  /** F19 key */
  VK_F19: 0x82,
  /** F20 key */
  VK_F20: 0x83,
  /** F21 key */
  VK_F21: 0x84,
  /** F22 key */
  VK_F22: 0x85,
  /** F23 key */
  VK_F23: 0x86,
  /** F24 key */
  VK_F24: 0x87,
  /** NUM LOCK key */
  VK_NUMLOCK: 0x90,
  /** SCROLL LOCK key */
  VK_SCROLL: 0x91,
  /** Left SHIFT key */
  VK_LSHIFT: 0xa0,
  /** Right SHIFT key */
  VK_RSHIFT: 0xa1,
  /** Left CONTROL key */
  VK_LCONTROL: 0xa2,
  /** Right CONTROL key */
  VK_RCONTROL: 0xa3,
  /** Left ALT key */
  VK_LMENU: 0xa4,
  /** Right ALT key */
  VK_RMENU: 0xa5,
  /** Browser Back key */
  VK_BROWSER_BACK: 0xa6,
  /** Browser Forward key */
  VK_BROWSER_FORWARD: 0xa7,
  /** Browser Refresh key */
  VK_BROWSER_REFRESH: 0xa8,
  /** Browser Stop key */
  VK_BROWSER_STOP: 0xa9,
  /** Browser Search key */
  VK_BROWSER_SEARCH: 0xaa,
  /** Browser Favorites key */
  VK_BROWSER_FAVORITES: 0xab,
  /** Browser Start and Home key */
  VK_BROWSER_HOME: 0xac,
  /** Volume Mute key */
  VK_VOLUME_MUTE: 0xad,
  /** Volume Down key */
  VK_VOLUME_DOWN: 0xae,
  /** Volume Up key */
  VK_VOLUME_UP: 0xaf,
  /** Next Track key */
  VK_MEDIA_NEXT_TRACK: 0xb0,
  /** Previous Track key */
  VK_MEDIA_PREV_TRACK: 0xb1,
  /** Stop Media key */
  VK_MEDIA_STOP: 0xb2,
  /** Play/Pause Media key */
  VK_MEDIA_PLAY_PAUSE: 0xb3,
  /** Start Mail key */
  VK_LAUNCH_MAIL: 0xb4,
  /** Select Media key */
  VK_LAUNCH_MEDIA_SELECT: 0xb6,
  /** Start Application 1 key */
  VK_LAUNCH_APP2: 0xb7,
  /** Start Application 2 key */
  VK_OEM_1: 0xba,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ;: key */
  VK_OEM_PLUS: 0xbb,
  /** For any country/region, the + key */
  VK_OEM_COMMA: 0xbc,
  /** For any country/region, the , key */
  VK_OEM_MINUS: 0xbd,
  /** For any country/region, the - key */
  VK_OEM_PERIOD: 0xbe,
  /** For any country/region, the . key */
  VK_OEM_2: 0xbf,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the /? key */
  VK_OEM_3: 0xc0,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the `~ key */
  VK_OEM_4: 0xdb,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the [{ key */
  VK_OEM_5: 0xdc,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the \\| key */
  VK_OEM_6: 0xdd,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ]} key */
  VK_OEM_7: 0xde,
  /** Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '" key */
  VK_OEM_8: 0xdf,
  /** Used for miscellaneous characters; it can vary by keyboard. */
  VK_OEM_102: 0xe2,
  /** The <> keys on the US standard keyboard, or the \\| key on the non-US 102-key keyboard */
  VK_PROCESSKEY: 0xe5,
  /** IME PROCESS key */
  VK_PACKET: 0xe7,
  /** Auto */
  VK_OEM_AUTO: 0xf3,
  /** Used to pass Unicode characters as if they were keystrokes. The VK_PACKET key is the low word of a 32-bit Virtual Key value used for non-keyboard input methods. For more information, see Remark in KEYBDINPUT, SendInput, WM_KEYDOWN, and WM_KEYUP */
  VK_ATTN: 0xf6,
  /** Attn key */
  VK_CRSEL: 0xf7,
  /** CrSel key */
  VK_EXSEL: 0xf8,
  /** ExSel key */
  VK_EREOF: 0xf9,
  /** Erase EOF key */
  VK_PLAY: 0xfa,
  /** Play key */
  VK_ZOOM: 0xfb,
  /** Zoom key */
  VK_NONAME: 0xfc,
  /** PA1 key */
  VK_PA1: 0xfd,
  /** Clear key */
  VK_OEM_CLEAR: 0xfe,
} as const);

export type VirtualKey = Enum<typeof VirtualKey>;
