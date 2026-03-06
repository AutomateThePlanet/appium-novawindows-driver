import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, createRootSession, quitSession } from './helpers/session.js';

describe('Window and app management commands', () => {
    let calc: Browser;
    let root: Browser;

    beforeAll(async () => {
        calc = await createCalculatorSession();
        root = await createRootSession();
    });

    afterAll(async () => {
        await quitSession(calc);
        await quitSession(root);
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
        it('returns an array from the Root session', async () => {
            const handles = await root.getWindowHandles();
            expect(Array.isArray(handles)).toBe(true);
        });

        it('returns at least one window handle from the desktop', async () => {
            const handles = await root.getWindowHandles();
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
