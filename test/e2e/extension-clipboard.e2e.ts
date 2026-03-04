import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import { createNotepadSession, getNotepadTextArea, quitSession, clearNotepad } from './helpers/session.js';

// Minimal 1×1 transparent PNG as base64
const TINY_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('windows: clipboard extension commands', () => {
    let notepad: Browser;

    beforeAll(async () => {
        notepad = await createNotepadSession();
    });

    afterAll(async () => {
        await quitSession(notepad);
    });

    beforeEach(async () => {
        await clearNotepad(notepad);
    });

    describe('setClipboard + getClipboard (plaintext)', () => {
        it('sets plaintext clipboard and getClipboard returns the same text (roundtrip)', async () => {
            const text = 'clipboard roundtrip test';
            const b64In = Buffer.from(text).toString('base64');
            await notepad.executeScript('windows: setClipboard', [{ contentType: 'plaintext', b64Content: b64In }]);
            const b64Out = await notepad.executeScript('windows: getClipboard', [{ contentType: 'plaintext' }]) as string;
            const textOut = Buffer.from(b64Out, 'base64').toString();
            expect(textOut).toContain(text);
        });

        it('sets clipboard with explicit contentType: plaintext', async () => {
            const b64 = Buffer.from('explicit type test').toString('base64');
            await expect(
                notepad.executeScript('windows: setClipboard', [{ contentType: 'plaintext', b64Content: b64 }])
            ).resolves.not.toThrow();
        });

        it('clipboard value survives between get calls (unchanged)', async () => {
            const text = 'stable clipboard value';
            const b64 = Buffer.from(text).toString('base64');
            await notepad.executeScript('windows: setClipboard', [{ contentType: 'plaintext', b64Content: b64 }]);
            const first = await notepad.executeScript('windows: getClipboard', [{ contentType: 'plaintext' }]) as string;
            const second = await notepad.executeScript('windows: getClipboard', [{ contentType: 'plaintext' }]) as string;
            expect(first).toBe(second);
        });
    });

    describe('setClipboard + getClipboard (image)', () => {
        it('sets an image clipboard and getClipboard with image type returns non-empty', async () => {
            await notepad.executeScript('windows: setClipboard', [{
                contentType: 'image',
                b64Content: TINY_PNG_BASE64,
            }]);
            const result = await notepad.executeScript('windows: getClipboard', [{ contentType: 'image' }]) as string;
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('clipboard integration with Notepad', () => {
        it('sets clipboard text, Ctrl+V pastes it into Notepad, getText shows pasted content', async () => {
            const pasteText = 'pasted from clipboard';
            const b64 = Buffer.from(pasteText).toString('base64');
            await notepad.executeScript('windows: setClipboard', [{ contentType: 'plaintext', b64Content: b64 }]);

            const textArea = await getNotepadTextArea(notepad);
            await textArea.click();
            // Ctrl+V to paste
            await notepad.keys(['Control', 'v']);

            const text = await textArea.getText();
            expect(text).toContain(pasteText);
        });
    });
});
