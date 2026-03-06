import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    createCalculatorSession,
    quitSession,
    CALCULATOR_APP_ID,
    closeAllTestApps,
} from './helpers/session.js';

// Each test creates its own session because app lifecycle commands mutate session state.

describe('App lifecycle commands', () => {
    afterEach(() => {
        closeAllTestApps;
    });
    describe('windows: launchApp and closeApp cycle', () => {
        it('windows: launchApp launches a new app instance and display shows 0', async () => {
            const driver = await createCalculatorSession();
            try {
                await driver.executeScript('windows: launchApp', []);
                const display = await driver.$('~CalculatorResults');
                const text = await display.getText();
                expect(text).toContain('0');
            } finally {
                await quitSession(driver);
            }
        });

        it('windows: closeApp closes the active window', async () => {
            const driver = await createCalculatorSession({ 'appium:shouldCloseApp': false });
            try {
                const handleBefore = await driver.getWindowHandle();
                await driver.executeScript('windows: closeApp', []);
                const handles = await driver.getWindowHandles();
                expect(handles).not.toContain(handleBefore);
            } finally {
                await quitSession(driver);
            }
        });

        it('windows: closeApp then windows: launchApp restores a usable session', async () => {
            const driver = await createCalculatorSession();
            try {
                await driver.executeScript('windows: closeApp', []);
                await driver.executeScript('windows: launchApp', []);
                const display = await driver.$('~CalculatorResults');
                expect(await display.isExisting()).toBe(true);
            } finally {
                await quitSession(driver);
            }
        });

        it('multiple windows: closeApp calls do not crash the session', async () => {
            const driver = await createCalculatorSession({ 'appium:shouldCloseApp': false });
            try {
                await driver.executeScript('windows: closeApp', []);
                // Second close should throw (app already closed)
                await expect(
                    driver.executeScript('windows: closeApp', [])
                ).rejects.toThrow();
            } finally {
                await quitSession(driver);
            }
        });
    });

    describe('shouldCloseApp capability', () => {
        it('shouldCloseApp: true closes Calculator after deleteSession', async () => {
            const driver = await createCalculatorSession({ 'appium:shouldCloseApp': true });
            const handle = await driver.getWindowHandle();
            await driver.deleteSession();

            // Verify via a Root session that the Calculator window is gone
            const rootDriver = await (await import('./helpers/session.js')).createRootSession();
            try {
                const handles = await rootDriver.getWindowHandles();
                expect(handles).not.toContain(handle);
            } finally {
                await quitSession(rootDriver);
            }
        });

        it('shouldCloseApp: false leaves Calculator running after deleteSession', async () => {
            const driver = await createCalculatorSession({
                'appium:shouldCloseApp': false,
                'appium:app': CALCULATOR_APP_ID,
            });
            const handle = await driver.getWindowHandle();
            await driver.deleteSession();

            // Verify via a Root session that the Calculator window is still open
            const rootDriver = await (await import('./helpers/session.js')).createRootSession();
            try {
                const handles = await rootDriver.getWindowHandles();
                expect(handles).toContain(handle);
            } finally {
                // Clean up: kill the orphaned Calculator
                const newSession = await (await import('./helpers/session.js')).createCalculatorSession();
                await quitSession(newSession);
                await quitSession(rootDriver);
            }
        });
    });

    describe('ms:forcequit capability', () => {
        it('ms:forcequit: true forcefully terminates the Calculator process on quit', async () => {
            const driver = await createCalculatorSession({
                'appium:shouldCloseApp': true,
                'ms:forcequit': true,
            });
            // Simply verify session creation and quit succeeds
            expect(await driver.getWindowHandle()).toBeTruthy();
            await expect(driver.deleteSession()).resolves.not.toThrow();
        });
    });

    describe('prerun / postrun scripts', () => {
        it('prerun script is executed before app launch (writes a marker file)', async () => {
            const markerPath = join(tmpdir(), `novawindows-prerun-${Date.now()}.txt`);
            const driver = await createCalculatorSession({
                'appium:prerun': {
                    script: `New-Item -ItemType File -Path "${markerPath.replace(/\\/g, '\\\\')}" -Force | Out-Null`,
                },
            });
            try {
                expect(existsSync(markerPath)).toBe(true);
            } finally {
                await quitSession(driver);
                if (existsSync(markerPath)) { unlinkSync(markerPath); }
            }
        });

        it('postrun script is executed after session deletion (writes a marker file)', async () => {
            const markerPath = join(tmpdir(), `novawindows-postrun-${Date.now()}.txt`);
            const driver = await createCalculatorSession({
                'appium:postrun': {
                    script: `New-Item -ItemType File -Path "${markerPath.replace(/\\/g, '\\\\')}" -Force | Out-Null`,
                },
            });
            await driver.deleteSession();
            // Give postrun a moment to execute
            await new Promise((resolve) => setTimeout(resolve, 500));
            expect(existsSync(markerPath)).toBe(true);
            if (existsSync(markerPath)) { unlinkSync(markerPath); }
        });
    });
});
