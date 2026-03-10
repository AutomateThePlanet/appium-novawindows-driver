import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    CALCULATOR_APP_ID,
    closeAllTestApps,
    createCalculatorSession,
    createRootSession,
    quitSession,
} from './helpers/session.js';

// Each test creates and destroys its own session — session creation IS what is being tested.

describe('Session creation and capabilities', () => {
    beforeEach(() => closeAllTestApps());

    it('creates a session with app capability and returns a valid session ID', async () => {
        const driver = await createCalculatorSession();
        try {
            const sessionId = driver.sessionId;
            expect(typeof sessionId).toBe('string');
            expect(sessionId.length).toBeGreaterThan(0);
            // Display should be accessible
            const display = await driver.$('~CalculatorResults');
            expect(await display.isExisting()).toBe(true);
        } finally {
            await quitSession(driver);
        }
    });

    it('creates a session with shouldCloseApp: false and app stays open after quit', async () => {
        const driver = await createCalculatorSession({ 'appium:shouldCloseApp': false });
        const handle = await driver.getWindowHandle();

        await driver.deleteSession();

        // Verify via a Root session
        const root = await createRootSession();
        try {
            const handles = await root.getWindowHandles();
            expect(handles).toContain(handle);
        } finally {
            await quitSession(root);
        }
    });

    it('creates a session with ms:waitForAppLaunch capability without error', async () => {
        const driver = await createCalculatorSession({ 'ms:waitForAppLaunch': 2 });
        try {
            expect(driver.sessionId).toBeTruthy();
        } finally {
            await quitSession(driver);
        }
    });

    it('creates a session with ms:forcequit: true without error', async () => {
        const driver = await createCalculatorSession({
            'appium:shouldCloseApp': true,
            'ms:forcequit': true,
        });
        try {
            expect(driver.sessionId).toBeTruthy();
        } finally {
            await quitSession(driver);
        }
    });

    it('creates a session with isolatedScriptExecution: true without error', async () => {
        const driver = await createCalculatorSession({ 'appium:isolatedScriptExecution': true });
        try {
            expect(driver.sessionId).toBeTruthy();
        } finally {
            await quitSession(driver);
        }
    });

    it('creates a Root session (app: Root) for the desktop root element', async () => {
        const driver = await createRootSession();
        try {
            expect(driver.sessionId).toBeTruthy();
            const handles = await driver.getWindowHandles();
            expect(handles.length).toBeGreaterThanOrEqual(1);
        } finally {
            await quitSession(driver);
        }
    });

    it('creates a session with appTopLevelWindow by attaching to a running window handle', async () => {
        // Start Calculator and get its native handle
        const calcDriver = await createCalculatorSession({ 'appium:shouldCloseApp': false });
        const nativeHandle = await calcDriver.getWindowHandle();
        // The driver returns hex string like "0x000XXXXX"; convert to decimal for appTopLevelWindow
        const numericHandle = parseInt(nativeHandle, 16);
        await calcDriver.deleteSession();

        // Attach to the same window via appTopLevelWindow
        const attachedDriver = await createCalculatorSession({
            'appium:app': undefined,
            'appium:appTopLevelWindow': numericHandle.toString(),
        });
        try {
            expect(attachedDriver.sessionId).toBeTruthy();
            const display = await attachedDriver.$('~CalculatorResults');
            expect(await display.isExisting()).toBe(true);
        } finally {
            await quitSession(attachedDriver);
        }
    });

    it('creates a session with prerun script that executes before app launch', async () => {
        const markerPath = join(tmpdir(), `novawindows-session-prerun-${Date.now()}.txt`);
        const driver = await createCalculatorSession({
            'appium:prerun': {
                script: `New-Item -ItemType File -Path "${markerPath}" -Force | Out-Null`,
            },
        });
        try {
            expect(existsSync(markerPath)).toBe(true);
        } finally {
            await quitSession(driver);
            if (existsSync(markerPath)) { unlinkSync(markerPath); }
        }
    });

    it('creates a session with postrun script that executes after session deletion', async () => {
        const markerPath = join(tmpdir(), `novawindows-session-postrun-${Date.now()}.txt`);
        const driver = await createCalculatorSession({
            'appium:postrun': {
                script: `New-Item -ItemType File -Path "${markerPath}" -Force | Out-Null`,
            },
        });
        await driver.deleteSession();
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(existsSync(markerPath)).toBe(true);
        if (existsSync(markerPath)) { unlinkSync(markerPath); }
    });

    it('passes appEnvironment variables into the PowerShell session', async () => {
        const markerPath = join(tmpdir(), `novawindows-session-env-${Date.now()}.txt`);
        const driver = await createRootSession({
            'appium:appEnvironment': { NOVA_TEST_VAR: 'hello_from_env' },
            'appium:prerun': {
                script: `[System.IO.File]::WriteAllText('${markerPath}', $env:NOVA_TEST_VAR)`,
            },
        });
        try {
            expect(readFileSync(markerPath, 'utf8')).toBe('hello_from_env');
        } finally {
            await quitSession(driver);
            if (existsSync(markerPath)) { unlinkSync(markerPath); }
        }
    });

    it('throws when an unknown automationName is specified', async () => {
        const { remote } = await import('webdriverio');
        await expect(
            remote({
                hostname: '127.0.0.1',
                port: 4723,
                path: '/',
                capabilities: {
                    platformName: 'Windows',
                    'appium:automationName': 'NonExistentDriver',
                    'appium:app': CALCULATOR_APP_ID,
                },
            })
        ).rejects.toThrow();
    });
});
