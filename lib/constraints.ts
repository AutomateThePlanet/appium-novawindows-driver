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
        isString: true,
    },
    appWorkingDir: {
        isString: true,
    },
    prerun: {
        isObject: true,
    },
    postrun: {
        isObject: true,
    },
    isolatedScriptExecution: {
        isBoolean: true,
    },
    deviceName: {
        isString: true,
    },
    systemPort: {
        isNumber: true,
    },
    'ms:waitForAppLaunch': {
        isNumber: true,
    },
    'ms:experimental-webdriver': {
        isBoolean: true,
    },
    'ms:forcequit': {
        isBoolean: true,
    },
    logFile: {},
} as const satisfies Constraints;

export default UI_AUTOMATION_DRIVER_CONSTRAINTS;

export type NovaWindowsDriverConstraints = typeof UI_AUTOMATION_DRIVER_CONSTRAINTS;