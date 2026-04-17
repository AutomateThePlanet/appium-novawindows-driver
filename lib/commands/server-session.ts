import { normalize } from 'node:path';
import { NovaWindowsDriver } from '../driver';
import { NovaUIAutomationClient } from '../server/client';

const MAX_INIT_RETRIES = 5;
const INIT_RETRY_DELAY_MS = 500;

export async function startServerSession(this: NovaWindowsDriver): Promise<void> {
    // The C# server's `init` command triggers UIAutomation static type
    // initializers (COM objects). These can fail intermittently, and once
    // a .NET type initializer fails it stays broken for the process lifetime.
    // The only recovery is to restart the server process and try again.
    for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
        this.serverClient = new NovaUIAutomationClient(this.log);
        await this.serverClient.start();

        try {
            await this.sendCommand('init', {});
            break; // success
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (attempt < MAX_INIT_RETRIES && msg.includes('type initializer')) {
                this.log.warn(`Server init failed (attempt ${attempt}/${MAX_INIT_RETRIES}): ${msg}. Restarting server...`);
                await this.serverClient.dispose();
                this.serverClient = undefined;
                // Delay before retrying to let COM resources be released
                await new Promise((r) => setTimeout(r, INIT_RETRY_DELAY_MS));
            } else {
                throw err;
            }
        }
    }

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

        // When noReset is true, try to attach to an already-running instance
        // of the app before launching a new one.
        if (this.opts.noReset) {
            const attached = await this.tryAttachToRunningApp(this.caps.app);
            if (attached) {
                this.log.info('noReset: attached to an already-running instance of the app.');
                return;
            }
            this.log.info('noReset: no running instance found, launching the app.');
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

/**
 * Attempts to attach to an already-running instance of the given app.
 * Returns true if successfully attached, false if no running process found.
 */
export async function tryAttachToRunningApp(this: NovaWindowsDriver, appPath: string): Promise<boolean> {
    const isUwp = appPath.includes('!') && appPath.includes('_') && !(appPath.includes('/') || appPath.includes('\\'));

    try {
        if (isUwp) {
            const processIds = await this.sendCommand('getProcessIds', { processName: 'ApplicationFrameHost' }) as number[];
            if (processIds.length === 0) return false;
            await this.attachToApplicationWindow(processIds, { isUwp: true });
            return true;
        }

        const normalizedPath = normalize(appPath);
        const breadcrumbs = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
        const executable = breadcrumbs[breadcrumbs.length - 1];
        const processName = executable.endsWith('.exe') ? executable.slice(0, executable.length - 4) : executable;
        const processIds = await this.sendCommand('getProcessIds', { processName }) as number[];
        if (processIds.length === 0) return false;
        await this.attachToApplicationWindow(processIds, { isUwp: false });
        return true;
    } catch {
        return false;
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
