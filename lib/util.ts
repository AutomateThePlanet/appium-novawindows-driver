import { errors } from '@appium/base-driver';
import { fs, zip, node, tempDir } from 'appium/support';
import { pipeline } from 'node:stream/promises';
import { NovaWindowsDriver } from './driver';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';

export async function findFreePort(start: number, end: number): Promise<number> {
    for (let port = start; port <= end; port++) {
        const free = await new Promise<boolean>((resolve) => {
            const srv = net.createServer();
            srv.once('error', () => resolve(false));
            srv.once('listening', () => srv.close(() => resolve(true)));
            srv.listen(port);
        });
        if (free) return port;
    }
    throw new Error(`No free port available in range ${start}-${end}.`);
}

export const MODULE_NAME = 'appium-novawindows-driver';

/**
 * Resolves the path to the bundled ffmpeg binary from the ffmpeg-static package.
 * Used by startRecordingScreen; no system PATH fallback.
 */
export async function getBundledFfmpegPath(driver: NovaWindowsDriver): Promise<string | null> {
    const ffmpegExecutablePath = driver.caps.ffmpegExecutablePath;

    if (ffmpegExecutablePath) {
        const exists = await fs.exists(ffmpegExecutablePath);
        if (!exists) {
            throw new errors.InvalidArgumentError(
                `ffmpeg executable not found at: ${ffmpegExecutablePath}`,
            );
        }

        return ffmpegExecutablePath;
    }

    const root = node.getModuleRootSync(MODULE_NAME, __filename);
    if (!root) {
        throw new errors.InvalidArgumentError(
            `Cannot find the root folder of the ${MODULE_NAME} Node.js module`,
        );
    }

    const exePath = path.join(root, 'ffmpeg', 'ffmpeg.exe');

    if (await fs.exists(exePath)) {
        return exePath;
    }

    const tmpRoot = await tempDir.openDir();

    driver.log.info(`ffmpeg: downloading into temp folder ${tmpRoot}`);

    try {
        await fs.mkdir(tmpRoot, { recursive: true });

        driver.log.info(`ffmpeg: fetching latest release info from GitHub`);

        const res = await fetch(
            'https://api.github.com/repos/GyanD/codexffmpeg/releases/latest',
            {
                headers: {
                    accept: 'application/vnd.github+json',
                },
            },
        );

        if (!res.ok) {
            throw new errors.UnknownError(
                `Failed to fetch ffmpeg release: ${res.status}`,
            );
        }

        driver.log.info(`ffmpeg: parsing release metadata`);

        const release = (await res.json()) as {
            assets: { name: string; browser_download_url: string }[];
        };

        const asset = release.assets?.find((a) =>
            a.name.endsWith('full_build.zip'),
        );

        if (!asset?.browser_download_url) {
            throw new errors.UnknownError(
                'No ffmpeg full_build.zip asset found in latest release',
            );
        }

        driver.log.info(`ffmpeg: downloading ${asset.name}`);

        const zipPath = path.join(tmpRoot, 'ffmpeg.zip');

        await downloadFile(asset.browser_download_url, tmpRoot);

        const downloadedZip = path.join(
            tmpRoot,
            path.basename(asset.browser_download_url),
        );

        driver.log.info(`ffmpeg: verifying downloaded archive`);

        if (!(await fs.exists(downloadedZip))) {
            throw new errors.UnknownError(
                `Downloaded ffmpeg zip not found at ${downloadedZip}`,
            );
        }

        await fs.rename(downloadedZip, zipPath);

        driver.log.info(`ffmpeg: extracting archive`);

        await zip.extractAllTo(zipPath, tmpRoot);

        await fs.unlink(zipPath).catch(() => {});

        driver.log.info(`ffmpeg: searching for ffmpeg.exe`);

        const found = await fs.walkDir(
            tmpRoot,
            true,
            (itemPath: string, isDirectory: boolean) =>
                !isDirectory &&
                path.basename(itemPath).toLowerCase() === 'ffmpeg.exe',
        );

        if (!found) {
            throw new errors.UnknownError('ffmpeg.exe not found after extraction');
        }

        driver.log.info(`ffmpeg: moving binary to ${exePath}`);

        await fs.mkdir(path.dirname(exePath), { recursive: true });
        await fs.mv(found, exePath, { mkdirp: true });

        driver.log.info(`ffmpeg: ready at ${exePath}`);

        return exePath;
    } finally {
        driver.log.info(`ffmpeg: cleaning up temp directory`);
        await fs.rimraf(tmpRoot);
    }
}

export async function cdpRequest<T = unknown>(
    this: NovaWindowsDriver | undefined,
    { host, port, endpoint, timeout },
): Promise<T> {
    if (this?.log) {
        this.log.debug(`Sending request to ${host}:${port}${endpoint}`);
    }

    return new Promise<T>((resolve, reject) => {
        const options = {
            hostname: host,
            port,
            path: endpoint,
            method: 'GET',
            agent: new http.Agent({ keepAlive: false }),
            timeout,
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);

        req.on('timeout', () => {
            req.destroy(new Error('Request timed out'));
        });

        req.end();
    });
}

export async function downloadFile(
    url: string,
    destPath: string,
    timeout = 30000,
): Promise<void> {
    const protocol = url.startsWith('https') ? https : http;
    const fileName = path.basename(new URL(url).pathname);

    const fullFilePath = path.join(destPath, fileName);

    const request = (currentUrl: string, redirectCount = 0): Promise<void> => new Promise<void>((resolve, reject) => {
            const req = protocol.get(currentUrl, async (res) => {
                const status = res.statusCode ?? 0;

                if ([301, 302, 307, 308].includes(status) && res.headers.location) {
                    if (redirectCount >= 10) {
                        return reject(new Error(`Too many redirects while downloading ${url}`));
                    }

                    const nextUrl = new URL(res.headers.location, currentUrl).toString();
                    return resolve(request(nextUrl, redirectCount + 1));
                }

                if (status !== 200) {
                    return reject(
                        new Error(`Download failed from ${currentUrl}: ${status} ${res.statusMessage}`),
                    );
                }

                try {
                    const fileStream = fs.createWriteStream(fullFilePath);
                    await pipeline(res, fileStream);
                    resolve();
                } catch (err) {
                    await fs.unlink(fullFilePath).catch(() => {});
                    reject(err);
                }
            });

            req.on('error', reject);

            req.setTimeout(timeout, () => {
                req.destroy();
                reject(new Error(`Timeout downloading from ${currentUrl} after ${timeout}ms`));
            });
        });

    return request(url);
}

const SupportedEasingFunctions = Object.freeze([
    'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
]);

export function assertSupportedEasingFunction(value: string) {
    const cubicBezierRegex = /^cubic-bezier\(\s*(0|1|0?\.\d+|\d+(\.\d+)?)\s*,\s*(-?0|-?1|-?0?\.\d+|-?\d+(\.\d+)?)\s*,\s*(0|1|0?\.\d+|\d+(\.\d+)?)\s*,\s*(-?0|-?1|-?0?\.\d+|-?\d+(\.\d+)?)\s*\)$/;
    if (!SupportedEasingFunctions.includes(value) && !cubicBezierRegex.test(value)) {
        throw new errors.InvalidArgumentError(`Unsupported or invalid easing function '${value}' in appium:smoothPointerMove capability.`
            + `Supported functions are [${SupportedEasingFunctions.join[', ']}, cubic-bezier(x1,y1,x2,y2)].`);
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

export function $(literals: TemplateStringsArray, ...substitutions: number[]) {
    substitutions.forEach((index) => {
        if (!Number.isInteger(index) && index < 0) {
            throw new errors.InvalidArgumentError(`Indices must be positive integers starting from 0. Received: ${index}`);
        }
    });

    return new DeferredStringTemplate(literals, substitutions);
}

export class DeferredStringTemplate {
    private literals: TemplateStringsArray;
    private substitutions: number[];

    constructor(literals: TemplateStringsArray, substitutions: number[]) {
        this.literals = literals;
        this.substitutions = substitutions;

        substitutions.forEach((index) => {
            if (!Number.isInteger(index) || index < 0) {
                throw new errors.InvalidArgumentError(`Indices must be positive integers starting from 0. Received: ${index}`);
            }
        });
    }

    format(...args: any[]): string {
        const out: string[] = [];
        for (let i = 0, k = 0; i < this.literals.length; i++, k++) {
            out[k] = this.literals[i];
            out[++k] = args[this.substitutions[i]]?.toString();
        }
        return out.join('');
    }
}
