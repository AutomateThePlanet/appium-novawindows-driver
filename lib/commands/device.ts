import { NovaWindowsDriver } from '../driver';

const ISO_8061_FORMAT = 'yyyy-MM-ddTHH:mm:sszzz';

export async function getDeviceTime(this: NovaWindowsDriver, _sessionId?: string, format?: string): Promise<string> {
    const fmt = format ?? ISO_8061_FORMAT;
    // Use the C# server to get formatted date/time
    const script = `(Get-Date).ToString('${fmt.replace(/'/g, "''")}')`;
    return await this.sendCommand('executePowerShellScript', { script }) as string;
}
