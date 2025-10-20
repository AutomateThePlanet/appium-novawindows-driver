type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>> | T

type AllFlagsValue<N extends number, A extends any[] = []> = [N] extends [Partial<A>['length']] ? A['length'] : UnionFlags<N, [0, ...A, ...A]>;
type UnionFlags<N extends number, A extends any[] = []> = IntRange<0, AllFlagsValue<N, A>>;

export type Enum<T> = T[keyof T];
export type FlagsEnum<T> = Enum<T> extends number ? UnionFlags<Enum<T>> : never;

export const Key = Object.freeze({
    NULL: '\uE000',
    CANCEL: '\uE001',
    HELP: '\uE002',
    BACKSPACE: '\uE003',
    TAB: '\uE004',
    CLEAR: '\uE005',
    RETURN: '\uE006',
    ENTER: '\uE007',
    SHIFT: '\uE008',
    CONTROL: '\uE009',
    ALT: '\uE00A',
    PAUSE: '\uE00B',
    ESCAPE: '\uE00C',
    SPACE: '\uE00D',
    PAGE_UP: '\uE00E',
    PAGE_DOWN: '\uE00F',
    END: '\uE010',
    HOME: '\uE011',
    LEFT: '\uE012',
    UP: '\uE013',
    RIGHT: '\uE014',
    DOWN: '\uE015',
    INSERT: '\uE016',
    DELETE: '\uE017',
    SEMICOLON: '\uE018',
    EQUALS: '\uE019',
    NUMPAD0: '\uE01A',
    NUMPAD1: '\uE01B',
    NUMPAD2: '\uE01C',
    NUMPAD3: '\uE01D',
    NUMPAD4: '\uE01E',
    NUMPAD5: '\uE01F',
    NUMPAD6: '\uE020',
    NUMPAD7: '\uE021',
    NUMPAD8: '\uE022',
    NUMPAD9: '\uE023',
    MULTIPLY: '\uE024',
    ADD: '\uE025',
    SEPARATOR: '\uE026',
    SUBTRACT: '\uE027',
    DECIMAL: '\uE028',
    DIVIDE: '\uE029',
    F1: '\uE031',
    F2: '\uE032',
    F3: '\uE033',
    F4: '\uE034',
    F5: '\uE035',
    F6: '\uE036',
    F7: '\uE037',
    F8: '\uE038',
    F9: '\uE039',
    F10: '\uE03A',
    F11: '\uE03B',
    F12: '\uE03C',
    META: '\uE03D',
    ZENKAKUHANKAKU: '\uE040',
    R_SHIFT: '\uE050',
    R_CONTROL: '\uE051',
    R_ALT: '\uE052',
    R_META: '\uE053',
    R_PAGEUP: '\uE054',
    R_PAGEDOWN: '\uE055',
    R_END: '\uE056',
    R_HOME: '\uE057',
    R_ARROWLEFT: '\uE058',
    R_ARROWUP: '\uE059',
    R_ARROWRIGHT: '\uE05A',
    R_ARROWDOWN: '\uE05B',
    R_INSERT: '\uE05C',
    R_DELETE: '\uE05D',
} as const);

export type Key = Enum<typeof Key>;

export const ClickType = Object.freeze({
    LEFT: 'left',
    MIDDLE: 'middle',
    RIGHT: 'right',
    BACK: 'back',
    FORWARD: 'forward'
});

export type ClickType = Enum<typeof ClickType>;