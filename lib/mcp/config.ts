/** Infrastructure config — read from env vars at startup. */
export interface McpConfig {
    appiumHost: string;
    appiumPort: number;
}

export function loadConfig(): McpConfig {
    const appiumPort = parseInt(process.env.APPIUM_PORT ?? '4723', 10);
    if (isNaN(appiumPort) || appiumPort < 1 || appiumPort > 65535) {
        throw new Error(`APPIUM_PORT must be a valid port number (1-65535), got: '${process.env.APPIUM_PORT}'`);
    }

    return {
        appiumHost: process.env.APPIUM_HOST ?? '127.0.0.1',
        appiumPort,
    };
}
