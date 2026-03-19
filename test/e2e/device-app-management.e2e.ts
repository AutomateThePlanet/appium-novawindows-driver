import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import {
    createCalculatorSession,
    createNotepadSession,
    createRootSession,
    quitSession,
    closeAllTestApps,
    CALCULATOR_APP_ID,
    NOTEPAD_APP_PATH,
} from './helpers/session.js';

// ─── isAppInstalled ───────────────────────────────────────────────────────────
// Uses a shared Root session — these checks are read-only and don't affect app state.

describe('isAppInstalled', () => {
    let driver: Browser;

    beforeAll(async () => {
        driver = await createRootSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    it('returns true for Notepad by full path', async () => {
        expect(await driver.isAppInstalled(NOTEPAD_APP_PATH)).toBe(true);
    });

    it('returns true for Calculator UWP app by bundle ID', async () => {
        expect(await driver.isAppInstalled(CALCULATOR_APP_ID)).toBe(true);
    });

    it('returns false for a non-existent full path', async () => {
        expect(await driver.isAppInstalled('C:\\nonexistent\\definitely-fake.exe')).toBe(false);
    });

    it('returns true for bare executable name "notepad.exe" (Get-Command lookup)', async () => {
        expect(await driver.isAppInstalled('notepad.exe')).toBe(true);
    });

    it('returns false for a non-existent bare name', async () => {
        expect(await driver.isAppInstalled('definitelyfakeapp12345.exe')).toBe(false);
    });
});

// ─── terminateApp ────────────────────────────────────────────────────────────
// Each test manages its own session — terminateApp mutates running process state.

describe('terminateApp', () => {
    afterEach(() => closeAllTestApps());

    it('returns false when Notepad is not already running', async () => {
        closeAllTestApps(); // ensure it is not running before test
        const driver = await createRootSession();
        try {
            const result = await driver.terminateApp(NOTEPAD_APP_PATH);
            expect(result).toBe(false);
        } finally {
            await quitSession(driver);
        }
    });

    it('returns true and kills Notepad when it is running', async () => {
        const notepadDriver = await createNotepadSession();
        const rootDriver = await createRootSession();
        try {
            const result = await rootDriver.terminateApp(NOTEPAD_APP_PATH);
            expect(result).toBe(true);
        } finally {
            await quitSession(rootDriver);
            await quitSession(notepadDriver);
        }
    });

    it('returns false on a second call after app has already been terminated', async () => {
        const notepadDriver = await createNotepadSession();
        const rootDriver = await createRootSession();
        try {
            await rootDriver.terminateApp(NOTEPAD_APP_PATH); // first kill
            const result = await rootDriver.terminateApp(NOTEPAD_APP_PATH); // already gone
            expect(result).toBe(false);
        } finally {
            await quitSession(rootDriver);
            await quitSession(notepadDriver);
        }
    });

    it('returns true and kills Calculator UWP when it is running', async () => {
        const calcDriver = await createCalculatorSession();
        const rootDriver = await createRootSession();
        try {
            const result = await rootDriver.terminateApp(CALCULATOR_APP_ID);
            expect(result).toBe(true);
        } finally {
            await quitSession(rootDriver);
            await quitSession(calcDriver);
        }
    });
});

// ─── activateApp ─────────────────────────────────────────────────────────────
// Each test manages its own session — activateApp mutates $rootElement.

describe('activateApp', () => {
    afterEach(() => closeAllTestApps());

    it('launches Notepad when it is not already running and sets it as root', async () => {
        closeAllTestApps();
        const driver = await createRootSession();
        try {
            await driver.activateApp(NOTEPAD_APP_PATH);
            const titleText = await driver.getTitle();
            expect(titleText).toMatch(/notepad/i);
        } finally {
            await quitSession(driver);
        }
    });

    it('focuses an already-running Notepad instance without launching a second one', async () => {
        const notepadDriver = await createNotepadSession();
        const rootDriver = await createRootSession();
        try {
            await rootDriver.activateApp(NOTEPAD_APP_PATH);
            const titleText = await rootDriver.getTitle();
            expect(titleText).toMatch(/notepad/i);
        } finally {
            await quitSession(rootDriver);
            await quitSession(notepadDriver);
        }
    });

    it('launches and attaches to Calculator UWP app', async () => {
        closeAllTestApps();
        const driver = await createRootSession();
        try {
            await driver.activateApp(CALCULATOR_APP_ID);
            const titleText = await driver.getTitle();
            expect(titleText).toMatch(/calc/i);
        } finally {
            await quitSession(driver);
        }
    });
});

// ─── hideKeyboard / isKeyboardShown ──────────────────────────────────────────
// The Windows touch keyboard (TabTip / TextInputHost) is typically not visible on
// a non-touch development machine, so we verify command semantics rather than
// asserting a specific visibility state.

describe('hideKeyboard / isKeyboardShown', () => {
    let driver: Browser;

    beforeAll(async () => {
        driver = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    it('isKeyboardShown returns a boolean', async () => {
        const result = await driver.isKeyboardShown();
        expect(typeof result).toBe('boolean');
    });

    it('hideKeyboard does not throw when keyboard is not visible', async () => {
        await expect(driver.hideKeyboard()).resolves.not.toThrow();
    });

    it('isKeyboardShown returns false on a standard desktop (no touch keyboard)', async () => {
        // On a headless / non-touch machine TabTip and TextInputHost are not running.
        // If this fails on a touch device, remove the assertion and keep only the type check above.
        const result = await driver.isKeyboardShown();
        expect(result).toBe(false);
    });
});
