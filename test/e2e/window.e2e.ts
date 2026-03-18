import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'webdriverio';
import { closeAllTestApps, createCalculatorSession, createRootSession, quitSession } from './helpers/session.js';

describe('Window and app management commands', () => {
    let calc: Browser;
    let calcAllHandles: Browser;
    let root: Browser;

    beforeAll(async () => {
        calc = await createCalculatorSession();
        calcAllHandles = await createCalculatorSession({ 'appium:returnAllWindowHandles': true });
        root = await createRootSession();
    });

    afterAll(async () => {
        await quitSession(calc);
        await quitSession(calcAllHandles);
        await quitSession(root);
        closeAllTestApps();
    });

    describe('getWindowHandle', () => {
        it('returns a hex window handle string matching 0x format', async () => {
            const handle = await calc.getWindowHandle();
            expect(handle).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('returns the same handle on repeated calls', async () => {
            const first = await calc.getWindowHandle();
            const second = await calc.getWindowHandle();
            expect(first).toBe(second);
        });
    });

    describe('getWindowHandles', () => {
        it('(app session, default) returns only the app windows — not all desktop windows', async () => {
            const appHandles = await calc.getWindowHandles();
            const allHandles = await root.getWindowHandles();
            expect(appHandles.length).toBeGreaterThanOrEqual(1);
            expect(appHandles.length).toBeLessThan(allHandles.length);
        });

        it('(app session, default) includes the current window handle', async () => {
            const current = await calc.getWindowHandle();
            const handles = await calc.getWindowHandles();
            expect(handles).toContain(current);
        });

        it('(app session, default) all returned handles match the 0x hex format', async () => {
            const handles = await calc.getWindowHandles();
            for (const h of handles) {
                expect(h).toMatch(/^0x[0-9a-fA-F]{8}$/);
            }
        });

        it('(returnAllWindowHandles=true) returns all desktop windows, same count as root session', async () => {
            const appAllHandles = await calcAllHandles.getWindowHandles();
            const rootHandles = await root.getWindowHandles();
            expect(appAllHandles.length).toBe(rootHandles.length);
        });

        it('(returnAllWindowHandles=true) includes the current app window handle', async () => {
            const current = await calc.getWindowHandle();
            const appAllHandles = await calcAllHandles.getWindowHandles();
            expect(appAllHandles).toContain(current);
        });

        it('(root session) returns an array of at least one window handle', async () => {
            const handles = await root.getWindowHandles();
            expect(Array.isArray(handles)).toBe(true);
            expect(handles.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getWindowRect', () => {
        it('returns a rect with positive width and height', async () => {
            const rect = await calc.getWindowRect();
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
        });

        it('returns numeric x and y coordinates', async () => {
            const rect = await calc.getWindowRect();
            expect(typeof rect.x).toBe('number');
            expect(typeof rect.y).toBe('number');
        });
    });

    describe('setWindow', () => {
        it('switches to a window by handle and getWindowHandle reflects it', async () => {
            const calcHandle = await calc.getWindowHandle();
            await calc.switchToWindow(calcHandle);
            const current = await calc.getWindowHandle();
            expect(current).toBe(calcHandle);
        });

        it('throws NoSuchWindowError for an unknown handle', async () => {
            await expect(calc.switchToWindow('0xDEADBEEF')).rejects.toThrow();
        });
    });

    describe('getPageSource', () => {
        it('returns a non-empty XML string', async () => {
            const source = await calc.getPageSource();
            expect(typeof source).toBe('string');
            expect(source.length).toBeGreaterThan(0);
        });

        it('XML contains Button elements for the Calculator', async () => {
            const source = await calc.getPageSource();
            expect(source).toContain('Button');
        });

        it('XML contains CalculatorResults AutomationId', async () => {
            const source = await calc.getPageSource();
            expect(source).toContain('CalculatorResults');
        });
    });

    describe('getScreenshot', () => {
        it('returns a non-empty base64 string', async () => {
            const screenshot = await calc.takeScreenshot();
            expect(typeof screenshot).toBe('string');
            expect(screenshot.length).toBeGreaterThan(0);
        });

        it('decoded bytes start with PNG magic bytes', async () => {
            const screenshot = await calc.takeScreenshot();
            const buffer = Buffer.from(screenshot, 'base64');
            // PNG magic: 89 50 4E 47
            expect(buffer[0]).toBe(0x89);
            expect(buffer[1]).toBe(0x50); // P
            expect(buffer[2]).toBe(0x4e); // N
            expect(buffer[3]).toBe(0x47); // G
        });
    });
});
