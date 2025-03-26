import { Enum } from '../../enums';

export const InputType = Object.freeze({
    /** The event is a mouse event. Use the mi structure of the union. */
    INPUT_MOUSE: 0,
    /** The event is a keyboard event. Use the ki structure of the union. */
    INPUT_KEYBOARD: 1,
    /** The event is a hardware event. Use the hi structure of the union. */
    INPUT_HARDWARE: 2,
} as const);

export type InputType = Enum<typeof InputType>;