import * as http from 'node:http';
import * as path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { McpConfig } from './config.js';

const POLL_INTERVAL_MS = 500;
const STARTUP_TIMEOUT_MS = 30_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;

function isAppiumReady(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.get(
            { hostname: host, port, path: '/status', timeout: 2000 },
            (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        resolve(json?.value?.ready === true);
                    } catch {
                        resolve(false);
                    }
                });
            }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

function waitForAppium(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;
        const poll = async () => {
            if (await isAppiumReady(host, port)) {
                resolve();
                return;
            }
            if (Date.now() >= deadline) {
                reject(new Error(`Appium did not become ready within ${STARTUP_TIMEOUT_MS / 1000}s on ${host}:${port}`));
                return;
            }
            setTimeout(poll, POLL_INTERVAL_MS);
        };
        poll();
    });
}

function resolveAppiumBinary(configBinary?: string): string {
    if (configBinary) {return configBinary;}

    // Prefer a local node_modules/.bin/appium (3 levels up from build/lib/mcp/)
    const localBin = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'appium');
    if (require('node:fs').existsSync(localBin)) {return localBin;}

    // Fall back to appium on the system PATH (global install: npm install -g appium)
    return 'appium';
}

export class AppiumManager {
    private process: ChildProcess | null = null;
    private managed = false;

    async ensureRunning(config: McpConfig): Promise<void> {
        const { appiumHost: host, appiumPort: port } = config;

        if (await isAppiumReady(host, port)) {
            process.stderr.write(`[MCP] Appium already running on ${host}:${port}\n`);
            return;
        }

        if (!config.appiumAutoStart) {
            throw new Error(
                `Appium is not running on ${host}:${port}.\n` +
                `Start it with: appium --port ${port}\n` +
                `Or set APPIUM_AUTO_START=true to start it automatically.`
            );
        }

        const binary = resolveAppiumBinary(config.appiumBinary);
        process.stderr.write(`[MCP] Starting Appium: ${binary} --port ${port} --address ${host}\n`);

        const child = spawn(binary, ['--port', String(port), '--address', host], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
        });

        // Attach error handler immediately to prevent unhandled error crash
        await new Promise<void>((resolve, reject) => {
            child.once('error', (err) => {
                reject(new Error(
                    `Failed to spawn Appium binary at "${binary}": ${err.message}\n` +
                    `Install Appium globally with: npm install -g appium\n` +
                    `Or set APPIUM_BINARY to the full path of the appium executable.`
                ));
            });
            // If no error fires synchronously, we're past the spawn phase
            setImmediate(resolve);
        });

        this.process = child;
        this.managed = true;

        this.process.stdout?.on('data', (data: Buffer) => {
            process.stderr.write(`[Appium] ${data}`);
        });
        this.process.stderr?.on('data', (data: Buffer) => {
            process.stderr.write(`[Appium] ${data}`);
        });
        this.process.on('exit', (code) => {
            process.stderr.write(`[MCP] Appium process exited with code ${code}\n`);
        });

        await waitForAppium(host, port);
        process.stderr.write(`[MCP] Appium ready on ${host}:${port}\n`);
    }

    async shutdown(): Promise<void> {
        if (!this.managed || !this.process) {return;}

        process.stderr.write('[MCP] Stopping Appium...\n');
        this.process.kill('SIGTERM');

        const child = this.process;
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                child.kill('SIGKILL');
                resolve();
            }, SHUTDOWN_TIMEOUT_MS);

            child.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        this.process = null;
        this.managed = false;
    }
}
