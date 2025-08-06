import type { Constraints } from '@appium/types';

export const UI_AUTOMATION_DRIVER_CONSTRAINTS = {
    platformName: {
        isString: true,
        inclusionCaseInsensitive: ['Windows'],
        presence: true,
    },
    smoothPointerMove: {
        isString: true,
    },
    delayBeforeClick: {
        isNumber: true,
    },
    delayAfterClick: {
        isNumber: true,
    },
    appTopLevelWindow: {
        isString: true,
    },
    shouldCloseApp: {
        isBoolean: true,
    },
    appArguments: {
        isString: true
    },
} as const satisfies Constraints;

export default UI_AUTOMATION_DRIVER_CONSTRAINTS;

export type NovaWindowsDriverConstraints = typeof UI_AUTOMATION_DRIVER_CONSTRAINTS;