import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { join } from 'node:path';
import { createWriteStream, WriteStream } from 'node:fs';
import { errors } from '@appium/base-driver';
import type { ServerRequest, ServerResponse } from './protocol';

const SERVER_EXE_NAME = 'NovaUIAutomationServer.exe';

export class NovaUIAutomationClient {
    private process?: ChildProcessWithoutNullStreams;
    private requestId = 0;
    private buffer = '';
    private pendingRequests = new Map<number, {
        resolve: (value: unknown) => void;
        reject: (reason: Error) => void;
        method: string;
        startTime: number;
    }>();
    private log: { info: (...args: unknown[]) => void; debug: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
    private recordingStream?: WriteStream;

    constructor(log: NovaUIAutomationClient['log'], recordingPath?: string) {
        this.log = log;
        if (recordingPath) {
            this.recordingStream = createWriteStream(recordingPath, { encoding: 'utf8' });
        }
    }

    private getServerPath(): string {
        // __dirname at runtime is build/lib/server/, so go up 3 levels to project root
        return join(__dirname, '..', '..', '..', 'native', 'win-x64', SERVER_EXE_NAME);
    }

    async start(recordingPath?: string): Promise<void> {
        const serverPath = this.getServerPath();
        this.log.info(`Starting NovaUIAutomationServer from: ${serverPath}`);

        const args: string[] = [];
        if (recordingPath) {
            args.push('--record', recordingPath);
        }

        this.process = spawn(serverPath, args);
        this.process.stdout.setEncoding('utf8');
        this.process.stderr.setEncoding('utf8');

        this.process.stdout.on('data', (chunk: string) => {
            this.buffer += chunk;
            this.processBuffer();
        });

        this.process.stderr.on('data', (chunk: string) => {
            // Server logs go to stderr - forward to driver log
            const lines = chunk.split('\n').filter(Boolean);
            for (const line of lines) {
                this.log.debug(`[server] ${line}`);
            }
        });

        this.process.on('exit', (code) => {
            this.log.info(`NovaUIAutomationServer exited with code ${code}`);
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests) {
                pending.reject(new errors.UnknownError(`Server process exited while waiting for response to ${pending.method} (id=${id})`));
            }
            this.pendingRequests.clear();
            this.process = undefined;
        });

        // Wait a moment for the server to start
        await new Promise<void>((resolve) => setTimeout(resolve, 100));

        // Verify the server is running with a ping
        const result = await this.sendCommand('debug:ping', {});
        this.log.info(`NovaUIAutomationServer started: ${JSON.stringify(result)}`);
    }

    async sendCommand(method: string, params: Record<string, unknown>): Promise<unknown> {
        if (!this.process) {
            throw new errors.UnknownError('NovaUIAutomationServer is not running.');
        }

        const id = ++this.requestId;
        const request: ServerRequest = { id, method, params };
        const json = JSON.stringify(request);

        if (this.recordingStream) {
            this.recordingStream.write(JSON.stringify({
                ts: new Date().toISOString(),
                direction: 'request',
                ...request,
            }) + '\n');
        }

        return new Promise<unknown>((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject, method, startTime: Date.now() });
            this.process!.stdin.write(json + '\n');
        });
    }

    private processBuffer(): void {
        const lines = this.buffer.split('\n');
        // Keep the last partial line in the buffer
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const response: ServerResponse = JSON.parse(line);
                const pending = this.pendingRequests.get(response.id);

                if (!pending) {
                    this.log.warn(`Received response for unknown request id=${response.id}`);
                    continue;
                }

                this.pendingRequests.delete(response.id);

                if (this.recordingStream) {
                    this.recordingStream.write(JSON.stringify({
                        ts: new Date().toISOString(),
                        direction: 'response',
                        id: response.id,
                        result: response.result,
                        error: response.error,
                        duration_ms: response.duration_ms,
                    }) + '\n');
                }

                const elapsed = Date.now() - pending.startTime;
                if (elapsed > 500) {
                    this.log.warn(`SLOW command: ${pending.method} took ${elapsed}ms (server: ${response.duration_ms}ms)`);
                }

                if (response.error) {
                    const errorMessage = `${response.error.code}: ${response.error.message}`;
                    switch (response.error.code) {
                        case 'ElementNotFound':
                            pending.reject(new errors.NoSuchElementError(errorMessage));
                            break;
                        case 'InvalidArgument':
                        case 'InvalidCondition':
                            pending.reject(new errors.InvalidArgumentError(errorMessage));
                            break;
                        case 'PatternNotSupported':
                            pending.reject(new errors.UnknownError(errorMessage));
                            break;
                        default:
                            pending.reject(new errors.UnknownError(errorMessage));
                    }
                } else {
                    pending.resolve(response.result);
                }
            } catch {
                this.log.warn(`Failed to parse server response: ${line}`);
            }
        }
    }

    async dispose(): Promise<void> {
        if (!this.process) return;

        try {
            await this.sendCommand('dispose', {});
        } catch {
            // ignore - server may already be shutting down
        }

        // Give the process a moment to exit gracefully
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                this.process?.kill();
                resolve();
            }, 2000);

            this.process?.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        this.recordingStream?.end();
        this.recordingStream = undefined;
        this.process = undefined;
    }
}
