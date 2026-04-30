import { fs, net, util } from 'appium/support';
import { waitForCondition } from 'asyncbox';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { getBundledFfmpegPath } from '../util';
import { NovaWindowsDriver } from '../driver';

const RETRY_PAUSE = 300;
const RETRY_TIMEOUT = 5000;
const DEFAULT_TIME_LIMIT = 60 * 10; // 10 minutes
const PROCESS_SHUTDOWN_TIMEOUT = 10 * 1000;
export const DEFAULT_EXT = 'mp4';
const DEFAULT_FPS = 15;
const DEFAULT_PRESET = 'veryfast';

export interface ScreenRecorderOptions {
    fps?: number;
    timeLimit?: number;
    preset?: string;
    captureCursor?: boolean;
    captureClicks?: boolean;
    audioInput?: string;
    videoFilter?: string;
}

export interface UploadOptions {
    remotePath?: string;
    user?: string;
    pass?: string;
    method?: string;
    headers?: Record<string, string>;
    fileFieldName?: string;
    formFields?: Array<[string, string]> | Record<string, string>;
}

async function requireFfmpegPath(driver: NovaWindowsDriver): Promise<string> {
    const bundled = await getBundledFfmpegPath(driver);
    if (bundled) {
        return bundled;
    }
    const ffmpegBinary = 'ffmpeg.exe';
    try {
        return await fs.which(ffmpegBinary);
    } catch {
        throw new Error(
            `${ffmpegBinary} has not been found in PATH and the bundled ffmpeg is missing. ` +
            'Please reinstall the driver or install ffmpeg manually.',
        );
    }
}

export async function uploadRecordedMedia(
    localFile: string,
    remotePath?: string,
    uploadOptions: Omit<UploadOptions, 'remotePath'> = {},
): Promise<string> {
    if (!remotePath) {
        return (await util.toInMemoryBase64(localFile)).toString();
    }

    const { user, pass, method, headers, fileFieldName, formFields } = uploadOptions;

    const options: Record<string, unknown> = {
        method: method ?? 'PUT',
        headers,
        fileFieldName,
        formFields,
    };

    if (user && pass) {
        options.auth = { user, pass };
    }

    await net.uploadFile(localFile, remotePath, options as Parameters<typeof net.uploadFile>[2]);
    return '';
}

export class ScreenRecorder {
    private _driver: NovaWindowsDriver;
    private _videoPath: string;
    private _process: ChildProcessWithoutNullStreams | null = null;
    private _fps: number;
    private _audioInput?: string;
    private _captureCursor: boolean;
    private _captureClicks: boolean;
    private _preset: string;
    private _videoFilter?: string;
    private _timeLimit: number;

    constructor(videoPath: string, driver: NovaWindowsDriver, opts: ScreenRecorderOptions = {}) {
        this._driver = driver;
        this._videoPath = videoPath;
        this._fps = opts.fps && opts.fps > 0 ? opts.fps : DEFAULT_FPS;
        this._audioInput = opts.audioInput;
        this._captureCursor = opts.captureCursor ?? false;
        this._captureClicks = opts.captureClicks ?? false;
        this._preset = opts.preset ?? DEFAULT_PRESET;
        this._videoFilter = opts.videoFilter;
        this._timeLimit = opts.timeLimit && opts.timeLimit > 0 ? opts.timeLimit : DEFAULT_TIME_LIMIT;
    }

    async getVideoPath(): Promise<string> {
        if (!(await fs.exists(this._videoPath))) {
            return '';
        }
        const stat = await fs.stat(this._videoPath);
        if (!stat.isFile()) {
            throw new Error(
                `The video path '${this._videoPath}' does not point to a regular file and will not be deleted`,
            );
        }
        return this._videoPath;
    }

    isRunning(): boolean {
        return !!this._process && !this._process.killed;
    }

    async _enforceTermination(): Promise<string> {
        if (this._process && this.isRunning()) {
            this._driver.log.debug('Force-stopping the currently running video recording');
            try {
                this._process.kill('SIGKILL');
            } catch {}
        }

        this._process = null;

        const videoPath = await this.getVideoPath();
        if (videoPath) {
            await fs.rimraf(videoPath);
        }

        return '';
    }

    async start(): Promise<void> {
        const ffmpegPath = await requireFfmpegPath(this._driver);

        const args: string[] = [
            '-loglevel',
            'error',
            '-t',
            String(this._timeLimit),
            '-f',
            'gdigrab',
            ...(this._captureCursor ? ['-capture_cursor', '1'] : []),
            ...(this._captureClicks ? ['-capture_mouse_clicks', '1'] : []),
            '-framerate',
            String(this._fps),
            '-i',
            'desktop',
            ...(this._audioInput ? ['-f', 'dshow', '-i', `audio=${this._audioInput}`] : []),
            '-vcodec',
            'libx264',
            '-preset',
            this._preset,
            '-tune',
            'zerolatency',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            '-fflags',
            'nobuffer',
            '-vf',
            'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            ...(this._videoFilter ? ['-filter:v', this._videoFilter] : []),
            this._videoPath,
        ];

        this._process = spawn(ffmpegPath, args, { windowsHide: true });

        this._driver.log.debug(`Starting ffmpeg: ${util.quote([ffmpegPath, ...args])}`);

        this._process.stdout.on('data', (data: Buffer) => {
            const out = data.toString();
            if (out.trim()) {
                this._driver.log.debug(`[ffmpeg] ${out.trim()}`);
            }
        });

        this._process.stderr.on('data', (data: Buffer) => {
            const out = data.toString();
            if (out.trim()) {
                this._driver.log.debug(`[ffmpeg] ${out.trim()}`);
            }
        });

        this._process.once('exit', async (code: number, signal: string) => {
            this._process = null;

            if (code === 0) {
                this._driver.log.debug('Screen recording exited without errors');
            } else {
                await this._enforceTermination();
                this._driver.log.warn(`Screen recording exited with error code ${code}, signal ${signal}`);
            }
        });

        await new Promise<void>((resolve, reject) => {
            this._process?.once('error', reject);
            setTimeout(resolve, 50);
        });

        try {
            await waitForCondition(
                async () => {
                    if (await this.getVideoPath()) {
                        return true;
                    }
                    if (!this._process) {
                        throw new Error('ffmpeg process died unexpectedly');
                    }
                    return false;
                },
                { waitMs: RETRY_TIMEOUT, intervalMs: RETRY_PAUSE },
            );
        } catch {
            await this._enforceTermination();
            throw new Error(
                `The expected screen record file '${this._videoPath}' does not exist. ` +
                'Check the server log for more details',
            );
        }

        this._driver.log.info(
            `The video recording has started. Will timeout in ${util.pluralize('second', this._timeLimit, true)}`,
        );
    }

    async stop(force = false): Promise<string> {
        if (force) {
            return await this._enforceTermination();
        }

        if (!this.isRunning()) {
            this._driver.log.debug('Screen recording is not running. Returning the recent result');
            return await this.getVideoPath();
        }

        return new Promise<string>((resolve, reject) => {
            const timer = setTimeout(async () => {
                await this._enforceTermination();
                reject(
                    new Error(
                        `Screen recording has failed to exit after ${PROCESS_SHUTDOWN_TIMEOUT}ms`,
                    ),
                );
            }, PROCESS_SHUTDOWN_TIMEOUT);

            this._process?.once('exit', async (code: number, signal: string) => {
                clearTimeout(timer);

                if (code === 0) {
                    resolve(await this.getVideoPath());
                } else {
                    reject(
                        new Error(
                            `Screen recording exited with error code ${code}, signal ${signal}`,
                        ),
                    );
                }
            });

            this._process?.stdin?.write('q');
            this._process?.stdin?.end();
        });
    }
}