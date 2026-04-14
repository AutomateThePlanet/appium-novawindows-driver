import { NovaWindowsDriver } from '../driver';
import { NovaUIAutomationClient } from '../server/client';

export async function startServerSession(this: NovaWindowsDriver): Promise<void> {
    this.serverClient = new NovaUIAutomationClient(this.log);
    await this.serverClient.start();

    // Initialize the session (cache request, element table, etc.)
    await this.sendCommand('init', {});

    if (this.caps.appWorkingDir) {
        const envVarsSet: Set<string> = new Set();
        const matches = this.caps.appWorkingDir.matchAll(/%([^%]+)%/g);

        for (const match of matches) {
            envVarsSet.add(match[1]);
        }
        const envVars = Array.from(envVarsSet);
        for (const envVar of envVars) {
            this.caps.appWorkingDir = this.caps.appWorkingDir.replaceAll(`%${envVar}%`, process.env[envVar.toUpperCase()] ?? '');
        }
    }

    if ((!this.caps.app && !this.caps.appTopLevelWindow) || (!this.caps.app || this.caps.app.toLowerCase() === 'none')) {
        this.log.info(`No app or top-level window specified in capabilities. Setting root element to null.`);
        await this.sendCommand('setRootElementNull', {});
    }

    if (this.caps.app && this.caps.app.toLowerCase() === 'root') {
        this.log.info(`'root' specified as app in capabilities. Setting root element to desktop root.`);
        await this.sendCommand('setRootElement', {});
    }

    if (this.caps.app && this.caps.app.toLowerCase() !== 'none' && this.caps.app.toLowerCase() !== 'root') {
        this.log.info(`Application path specified in capabilities: ${this.caps.app}`);
        const envVarsSet: Set<string> = new Set();
        const matches = this.caps.app.matchAll(/%([^%]+)%/g);

        for (const match of matches) {
            envVarsSet.add(match[1]);
        }

        const envVars = Array.from(envVarsSet);
        this.log.info(`Detected the following environment variables in app path: ${envVars.map((envVar) => `%${envVar}%`).join(', ')}`);

        for (const envVar of envVars) {
            this.caps.app = this.caps.app.replaceAll(`%${envVar}%`, process.env[envVar.toUpperCase()] ?? '');
        }

        await this.changeRootElement(this.caps.app);
    }

    if (this.caps.appTopLevelWindow) {
        const nativeWindowHandle = Number(this.caps.appTopLevelWindow);

        if (isNaN(nativeWindowHandle)) {
            throw new Error(`Invalid capabilities. Capability 'appTopLevelWindow' is not a valid native window handle.`);
        }

        await this.changeRootElement(nativeWindowHandle);
    }
}

export async function terminateServerSession(this: NovaWindowsDriver): Promise<void> {
    if (!this.serverClient) {
        return;
    }

    this.log.debug(`Terminating NovaUIAutomationServer session...`);
    await this.serverClient.dispose();
    this.serverClient = undefined;
    this.log.debug(`NovaUIAutomationServer session terminated successfully.`);
}
