import { Enum } from '../../enums';

export const XMouseButton = Object.freeze({
    XBUTTON1: 0x0001,
    XBUTTON2: 0x0002,
} as const);

export type XMouseButton = Enum<typeof XMouseButton>;