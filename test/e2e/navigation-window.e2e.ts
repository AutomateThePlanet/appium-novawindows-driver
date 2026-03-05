import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'webdriverio';
import {
    createCalculatorSession,
    createNotepadSession,
    quitSession,
} from './helpers/session.js';

describe('back and forward', () => {
    let notepad: Browser;

    beforeAll(async () => {
        notepad = await createNotepadSession();
    });

    afterAll(async () => {
        await quitSession(notepad);
    });

    it('back() completes without error on an active window', async () => {
        await expect(notepad.back()).resolves.toBeNull();
    });

    it('forward() completes without error on an active window', async () => {
        await expect(notepad.forward()).resolves.toBeNull();
    });

    it('back() followed by forward() does not throw', async () => {
        await notepad.back();
        await notepad.forward();
    });
});

describe('getTitle', () => {
    let notepad: Browser;
    let calc: Browser;

    beforeAll(async () => {
        notepad = await createNotepadSession();
        calc = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(notepad);
        await quitSession(calc);
    });

    it('returns a string for the Notepad window', async () => {
        const title = await notepad.getTitle();
        expect(typeof title).toBe('string');
        expect(title.length).toBeGreaterThan(0);
    });

    it('Notepad title contains "Notepad"', async () => {
        const title = await notepad.getTitle();
        expect(title).toContain('Notepad');
    });

    it('Calculator title contains "Calculator"', async () => {
        const title = await calc.getTitle();
        expect(title).toContain('Calculator');
    });

    it('returns the same title on repeated calls', async () => {
        const first = await notepad.getTitle();
        const second = await notepad.getTitle();
        expect(first).toBe(second);
    });
});

describe('setWindowRect', () => {
    let calc: Browser;
    let originalRect: { x: number; y: number; width: number; height: number };

    beforeAll(async () => {
        calc = await createCalculatorSession();
        originalRect = await calc.getWindowRect();
    });

    afterAll(async () => {
        try {
            await calc.setWindowRect(
                originalRect.x,
                originalRect.y,
                originalRect.width,
                originalRect.height,
            );
        } catch {
            // noop — restore best-effort
        }
        await quitSession(calc);
    });

    it('returns a Rect object with numeric x, y, width, height', async () => {
        const rect = await calc.setWindowRect(100, 100, 800, 600);
        expect(typeof rect.x).toBe('number');
        expect(typeof rect.y).toBe('number');
        expect(typeof rect.width).toBe('number');
        expect(typeof rect.height).toBe('number');
    });

    it('moves the window to the requested position', async () => {
        const rect = await calc.setWindowRect(150, 150, 800, 600);
        expect(rect.x).toBe(150);
        expect(rect.y).toBe(150);
    });

    it('resizes only (preserves position) when x and y are null', async () => {
        await calc.setWindowRect(200, 200, 800, 600);
        const rect = await calc.setWindowRect(null, null, 900, 700);
        expect(rect.x).toBe(200);
        expect(rect.y).toBe(200);
    });

    it('moves only (preserves size) when width and height are null', async () => {
        await calc.setWindowRect(100, 100, 800, 600);
        const rect = await calc.setWindowRect(250, 250, null, null);
        expect(rect.x).toBe(250);
        expect(rect.y).toBe(250);
        expect(rect.width).toBe(800);
        expect(rect.height).toBe(600);
    });
});

describe('getElementScreenshot', () => {
    let calc: Browser;

    beforeAll(async () => {
        calc = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(calc);
    });

    it('returns a non-empty base64 string for an element', async () => {
        const btn = await calc.$('~num1Button');
        const screenshot = await calc.takeElementScreenshot(await btn.elementId);
        expect(typeof screenshot).toBe('string');
        expect(screenshot.length).toBeGreaterThan(0);
    });

    it('decoded bytes start with PNG magic bytes (89 50 4E 47)', async () => {
        const btn = await calc.$('~num1Button');
        const screenshot = await calc.takeElementScreenshot(await btn.elementId);
        const buffer = Buffer.from(screenshot, 'base64');
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50); // P
        expect(buffer[2]).toBe(0x4e); // N
        expect(buffer[3]).toBe(0x47); // G
    });

    it('screenshot dimensions are non-zero', async () => {
        const btn = await calc.$('~num1Button');
        const screenshot = await calc.takeElementScreenshot(await btn.elementId);
        const buffer = Buffer.from(screenshot, 'base64');
        // PNG IHDR chunk starts at byte 16; width at 16-19, height at 20-23
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
    });
});
