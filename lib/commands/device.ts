import { NovaWindowsDriver } from '../driver';
import { PSString, pwsh$ } from '../powershell';

const GET_SYSTEM_TIME_COMMAND = pwsh$ /* ps1 */ `(Get-Date).ToString(${0})`;
const ISO_8061_FORMAT = 'yyyy-MM-ddTHH:mm:sszzz';

export async function getDeviceTime(this: NovaWindowsDriver, format?: string): Promise<string> {
    format = format ? new PSString(format).toString() : `'${ISO_8061_FORMAT}'`;
    return await this.sendPowerShellCommand(GET_SYSTEM_TIME_COMMAND.format(format));
}

// command: 'hideKeyboard'
// payloadParams: { optional: ['strategy', 'key', 'keyCode', 'keyName'] }

// command: 'isKeyboardShown'

// command: 'pushFile'
// payloadParams: { required: ['path', 'data'] }

// command: 'pullFile'
// payloadParams: { required: ['path'] }

// command: 'pullFolder'
// payloadParams: { required: ['path'] }

// # APP MANAGEMENT

// command: 'activateApp'
// payloadParams: { required: [['appId'], ['bundleId']], optional: ['options'] }

// command: 'removeApp'
// payloadParams: { required: [['appId'], ['bundleId']], optional: ['options'] }

//command: 'terminateApp'
// payloadParams: { required: [['appId'], ['bundleId']], optional: ['options'] }

// command: 'isAppInstalled'
// payloadParams: { required: [['appId'], ['bundleId']] }

// command: 'installApp'
// payloadParams: { required: ['appPath'], optional: ['options'] }
