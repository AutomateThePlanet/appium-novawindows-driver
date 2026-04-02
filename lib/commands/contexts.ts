import { Chromedriver, ChromedriverOpts } from 'appium-chromedriver';
import { fs, node, system, tempDir, zip } from '@appium/support';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { sleep } from '../util';
import { NovaWindowsDriver } from '../driver';
import { errors } from '@appium/base-driver';

const NATIVE_APP = 'NATIVE_APP';
const WEBVIEW = 'WEBVIEW';
const WEBVIEW_BASE = `${WEBVIEW}_`;

const MODULE_NAME = 'appium-novawindows-driver';

export async function getCurrentContext(this: NovaWindowsDriver): Promise<string> {
    return this.currentContext ??= NATIVE_APP;
}

export async function setContext(this: NovaWindowsDriver, name?: string | null): Promise<void> {
    if (!name || name === NATIVE_APP) {
        this.chromedriver?.stop();
        this.chromedriver = null;
        this.jwpProxyActive = false;
        this.proxyReqRes = null;
        this.proxyCommand = null;
        this.currentContext = NATIVE_APP;
        return;
    }

    const webViewDetails = await this.getWebViewDetails();

    if (!(webViewDetails.pages ?? []).map((page) => page.id).includes(name.replace(WEBVIEW_BASE, ''))) {
        throw new errors.InvalidArgumentError(`Web view not found: ${name}`);
    }

    const browser = webViewDetails.info?.Browser ?? '';
    const match = browser.match(/(Chrome|Edg)\/([\d.]+)/);

    if (!match?.[1] || (match[1] !== 'Edg' && match[1] !== 'Chrome')) {
        throw new errors.InvalidArgumentError(`Unsupported browser type: ${match?.[1]}`);
    }

    const browserType = match[1] === 'Edg' ? 'Edge' : 'Chrome';
    const browserVersion = match?.[2] ?? '';

    const DRIVER_VERSION_REGEX = /^\d+(\.\d+){3}$/;
    if (!DRIVER_VERSION_REGEX.test(browserVersion)) {
        throw new errors.InvalidArgumentError(`Invalid browser version: ${browserVersion}`);
    }

    this.log.debug(`Type: ${browserType}, Version: ${browserVersion}`);

    const executable: string = await getDriverExecutable.call(this, browserType, browserVersion);

    const chromedriverOpts: ChromedriverOpts & { details?: WebViewDetails } = {
        executable,
        details: webViewDetails,
    };

    if (this.basePath) {
        chromedriverOpts.reqBasePath = this.basePath;
    }

    const cd = new Chromedriver(chromedriverOpts);
    this.chromedriver = cd;

    const page = webViewDetails.pages?.find((p) => p.id === name.replace(WEBVIEW_BASE, ''));

    const debuggerAddress = (page?.webSocketDebuggerUrl ?? '')
        .replace('ws://', '')
        .split('/')[0];

    const options = { debuggerAddress };

    const caps = {
        'ms:edgeOptions': options,
        'goog:chromeOptions': options,
    };

    await this.chromedriver.start(caps);
    this.log.debug('Chromedriver started. Session ID:', cd.sessionId());

    this.proxyReqRes = this.chromedriver.proxyReq.bind(this.chromedriver);
    this.proxyCommand = this.chromedriver.jwproxy.command.bind(this.chromedriver.jwproxy);
    this.jwpProxyActive = true;
}

export async function getContexts(this: NovaWindowsDriver): Promise<string[]> {
    const webViewDetails = await this.getWebViewDetails();
    return [
        NATIVE_APP,
        ...(webViewDetails.pages?.map((page) => `${WEBVIEW_BASE}${page.id}`) ?? []),
    ];
}

export interface WebViewDetails {
    /**
     * Web view details as returned by /json/version CDP endpoint
     * @example
     * {
     *  "Browser": "Edg/145.0.3800.97",
     *  "Protocol-Version": "1.3",
     *  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
     *  "V8-Version": "14.5.40.9",
     *  "WebKit-Version": "537.36 (@f4c49d5241f148220b99eb7f045ac370a1694a15)",
     *  "webSocketDebuggerUrl": "ws://localhost:10900/devtools/browser/7039e1b9-f75d-44eb-8583-7279c107bb18"
     * }
     */
    info?: CDPVersionResponse;

    /**
     * Web view details as returned by /json/list CDP endpoint
     * @example // TODO: change example to not include Spotify / use mock data
     * [ {
     *    "description": "",
     *    "devtoolsFrontendUrl": "https://chrome-devtools-frontend.appspot.com/serve_rev/@80be69ef794ba862ff256b0b23f051cbbc32e1ed/inspector.html?ws=localhost:9222/devtools/page/21C6035BC3E0A67D0BB6AE10F4A66D4A",
     *    "faviconUrl": "https://xpui.app.spotify.com/favicon.ico",
     *    "id": "21C6035BC3E0A67D0BB6AE10F4A66D4A",
     *    "title": "Spotify - Web Player: Music for everyone",
     *    "type": "page",
     *    "url": "https://xpui.app.spotify.com/index.html",
     *    "webSocketDebuggerUrl": "ws://localhost:9222/devtools/page/21C6035BC3E0A67D0BB6AE10F4A66D4A"
     * }, {
     *    "description": "",
     *    "devtoolsFrontendUrl": "https://chrome-devtools-frontend.appspot.com/serve_rev/@80be69ef794ba862ff256b0b23f051cbbc32e1ed/inspector.html?ws=localhost:9222/devtools/page/7E7008B3C464CD91224ADF976115101F",
     *    "id": "7E7008B3C464CD91224ADF976115101F",
     *    "title": "",
     *    "type": "worker",
     *    "url": "",
     *    "webSocketDebuggerUrl": "ws://localhost:10900/devtools/page/7E7008B3C464CD91224ADF976115101F"
     * } ]
     */
    pages?: CDPListResponse;
}

interface CDPVersionResponse {
    'Browser': string,
    'Protocol-Version': string,
    'User-Agent': string,
    'V8-Version': string,
    'WebKit-Version': string,
    'webSocketDebuggerUrl': string,
}

interface CDPListResponseEntry {
    'description': string,
    'devtoolsFrontendUrl': string,
    'faviconUrl': string,
    'id': string,
    'title': string,
    'type': string,
    'url': string,
    'webSocketDebuggerUrl': string,
}

type CDPListResponse = CDPListResponseEntry[];

export async function getWebViewDetails(this: NovaWindowsDriver, waitForWebviewMs?: number): Promise<WebViewDetails> {
    if (!this.caps.enableWebView) {
        throw new errors.InvalidArgumentError('WebView support is not enabled. Please set the "enableWebView" capability to true and try again.');
    }

    this.log.debug(`Getting a list of available webviews`);

    const waitMs = waitForWebviewMs ? Number(waitForWebviewMs) : 0;
    if (waitMs) {
        await sleep(waitMs);
    }

    const host = 'localhost';

    if ((this.caps.app === 'none' || this.caps.app === 'root' || this.caps.appTopLevelWindow != null) && this.caps.webviewDevtoolsPort == null) {
        throw new errors.InvalidArgumentError(`Capability "webviewDevtoolsPort" must be set when using "none", "root", or "appTopLevelWindow" with "enableWebView"`);
    }

    const port = this.webviewDevtoolsPort ??= this.caps.webviewDevtoolsPort ?? null;

    const webViewDetails: WebViewDetails = {
        info: await cdpRequest<CDPVersionResponse>({ host, port, endpoint: '/json/version', timeout: 10000 }),
        pages: await cdpRequest<CDPListResponse>({ host, port, endpoint: '/json/list', timeout: 10000 }),
    };

    return webViewDetails;
}

async function getDriverExecutable(this: NovaWindowsDriver, browserType: 'Edge' | 'Chrome', browserVersion: `${number}.${number}.${number}.${number}`): Promise<string> {
    let driverType: string;

    if (browserType === 'Chrome') {
        driverType = 'chromedriver';
    } else {
        driverType = 'edgedriver';
    }

    const root = node.getModuleRootSync(MODULE_NAME, __filename);
    if (!root) {
        throw new errors.InvalidArgumentError(`Cannot find the root folder of the ${MODULE_NAME} Node.js module`);
    }

    const driverDir = path.join(root, driverType);

    if (!(await fs.exists(driverDir))) {
        await fs.mkdir(driverDir);
    }

    let downloadUrl = '';
    const fileName = browserType === 'Edge' ? 'msedgedriver.exe' : 'chromedriver.exe';
    const finalPath = path.join(driverDir, browserVersion, fileName);

    if (await fs.exists(finalPath)) {
        return finalPath;
    };

    const arch = await system.arch();
    const zipFilename = `${driverType}${browserType === 'Edge' ? '_' : '-'}win${arch}.zip`;

    if (browserType === 'Chrome') {
        downloadUrl = `https://storage.googleapis.com/chrome-for-testing-public/${browserVersion}/win${arch}/${zipFilename}`;
    } else if (browserType === 'Edge') {
        downloadUrl = `https://msedgedriver.microsoft.com/${browserVersion}/${zipFilename}`;
    }

    this.log.debug(`Downloading ${browserType} driver version ${browserVersion}...`);
    const tmpRoot = await tempDir.openDir();
    await downloadFile(downloadUrl, tmpRoot);
    try {
        await zip.extractAllTo(path.join(tmpRoot, zipFilename), tmpRoot);
        const driverPath = await fs.walkDir(
            tmpRoot,
            true,
            (itemPath, isDirectory) => !isDirectory && path.parse(itemPath).base.toLowerCase() === fileName);

        if (!driverPath) {
            throw new errors.UnknownError(`The archive was unzipped properly, but did not find any ${driverType} executable.`);
        }
        this.log.debug(`Moving the extracted '${fileName}' to '${finalPath}'`);
        await fs.mv(driverPath, finalPath, { mkdirp: true });
    } finally {
        await fs.rimraf(tmpRoot);
    }
    return finalPath;
}

async function cdpRequest<T = unknown>({ host, port, endpoint, timeout }): Promise<T> {
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

async function downloadFile(url: string, destPath: string, timeout = 30000): Promise<void> {
    const protocol = url.startsWith('https') ? https : http;
    const fileName = path.basename(new URL(url).pathname);

    const fullFilePath = path.join(destPath, fileName);

    return new Promise<void>((resolve, reject) => {
        const req = protocol.get(url, async (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Download failed: ${res.statusCode}`));
            }

            try {
                const fileStream = fs.createWriteStream(fullFilePath);
                await pipeline(res, fileStream);
                resolve();
            } catch (err) {
                await fs.unlink(fullFilePath).catch(() => { });
                reject(err);
            }
        });

        req.on('error', reject);
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error(`Timeout downloading from ${url}`));
        });
    });
}
