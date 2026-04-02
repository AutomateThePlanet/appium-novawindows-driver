import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import {
    createCalculatorSession,
    createNotepadSession,
    getNotepadTextArea,
    quitSession,
    resetCalculator,
    clearNotepad,
} from './helpers/session.js';

// VirtualKeyCode for Delete
const VK_DELETE = 0x2e;
// VirtualKeyCode for Shift
const VK_SHIFT = 0x10;

describe('windows: keys, click, hover, scroll, clickAndDrag extension commands', () => {
    let calc: Browser;
    let notepad: Browser;

    beforeAll(async () => {
        calc = await createCalculatorSession();
        notepad = await createNotepadSession();
    });

    afterAll(async () => {
        await quitSession(calc);
        await quitSession(notepad);
    });

    beforeEach(async () => {
        await resetCalculator(calc);
    });

    describe('windows: keys — text input', () => {
        it('types "123" via text action into Calculator and display shows 123', async () => {
            await calc.executeScript('windows: keys', [{ actions: [{ text: '123' }] }]);
            const display = await calc.$('~CalculatorResults');
            const text = await display.getText();
            expect(text).toContain('123');
        });

        it('types multi-character text into Notepad and getText returns it', async () => {
            await clearNotepad(notepad);
            const textArea = await getNotepadTextArea(notepad);
            await textArea.click();
            await notepad.executeScript('windows: keys', [{ actions: [{ text: 'hello world' }, { pause: 100 }] }]);
            const text = await textArea.getText();
            expect(text).toContain('hello world');
        });

        it('types text with forceUnicode: true into Notepad', async () => {
            await clearNotepad(notepad);
            const textArea = await getNotepadTextArea(notepad);
            await textArea.click();
            await notepad.executeScript('windows: keys', [{
                actions: [{ text: 'unicodetest' }, { pause: 100 }],
                forceUnicode: true,
            }]);
            const text = await textArea.getText();
            expect(text).toContain('unicodetest');
        });

        it('sends virtualKeyCode for Delete key to clear Notepad input', async () => {
            await clearNotepad(notepad);
            const textArea = await getNotepadTextArea(notepad);
            await textArea.click();
            await notepad.executeScript('windows: keys', [{ actions: [{ text: 'abc' }] }]);
            // Select all then delete
            await notepad.executeScript('windows: keys', [{ actions: [
                { virtualKeyCode: 0x11, down: true }, // Ctrl down
                { pause: 100 },
                { text: 'a' },
                { pause: 100 },
                { virtualKeyCode: 0x11, down: false }, // Ctrl up
                { pause: 100 },
                { virtualKeyCode: VK_DELETE }, // Delete
            ] }]);
            const text = await textArea.getText();
            expect(text.trim()).toBe('');
        });

        it('uses pause action to introduce delay between key inputs', async () => {
            await expect(
                calc.executeScript('windows: keys', [{
                    actions: [
                        { text: '1' },
                        { pause: 200 },
                        { text: '2' },
                    ],
                }])
            ).resolves.not.toThrow();
            const display = await calc.$('~CalculatorResults');
            const text = await display.getText();
            expect(text).toContain('12');
        });

        it('sends modifier hold to produce uppercase in Notepad', async () => {
            await clearNotepad(notepad);
            const textArea = await getNotepadTextArea(notepad);
            await textArea.click();
            await notepad.executeScript('windows: keys', [{
                actions: [
                    { virtualKeyCode: VK_SHIFT, down: true },
                    { text: 'a' },
                    { virtualKeyCode: VK_SHIFT, down: false },
                ],
            }]);
            const text = await textArea.getText();
            expect(text).toContain('A');
        });
    });

    describe('windows: click', () => {
        it('clicks on the Five button by element reference and shows 5 in result', async () => {
            const btn = await calc.$('~num5Button');
            await calc.executeScript('windows: click', [{ elementId: await btn.elementId }]);
            const display = await calc.$('~CalculatorResults');
            expect(await display.getText()).toContain('5');
        });

        it('clicks by absolute x/y coordinates on the Nine button', async () => {
            const btn = await calc.$('~num9Button');
            const location = await btn.getLocation();
            const size = await btn.getSize();
            const windowRect = await calc.getWindowRect();
            const x = Math.round(windowRect.x + location.x + size.width / 2);
            const y = Math.round(windowRect.y + location.y + size.height / 2);
            await calc.executeScript('windows: click', [{ x, y }]);
            const display = await calc.$('~CalculatorResults');
            expect(await display.getText()).toContain('9');
        });

        it('clicks with button: right performs right-click without error', async () => {
            const btn = await calc.$('~num1Button');
            await expect(
                calc.executeScript('windows: click', [{
                    elementId: await btn.elementId,
                    button: 'right',
                }])
            ).resolves.not.toThrow();
        });

        it('clicks with times: 3 on digit One shows 111', async () => {
            const btn = await calc.$('~num1Button');
            await calc.executeScript('windows: click', [{
                elementId: await btn.elementId,
                times: 3,
                interClickDelayMs: 50,
            }]);
            const display = await calc.$('~CalculatorResults');
            expect(await display.getText()).toContain('111');
        });

        it('clicks with durationMs: 200 as a long-press click', async () => {
            const btn = await calc.$('~num2Button');
            await expect(
                calc.executeScript('windows: click', [{
                    elementId: await btn.elementId,
                    durationMs: 200,
                }])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: hover', () => {
        it('hovers from one button to another without error', async () => {
            const startBtn = await calc.$('~num1Button');
            const endBtn = await calc.$('~num2Button');
            await expect(
                calc.executeScript('windows: hover', [{
                    startElementId: await startBtn.elementId,
                    endElementId: await endBtn.elementId,
                }])
            ).resolves.not.toThrow();
        });

        it('hovers with absolute startX/startY and endX/endY coordinates', async () => {
            const btn = await calc.$('~num3Button');
            const loc = await btn.getLocation();
            const size = await btn.getSize();
            const cx = Math.round(loc.x + size.width / 2);
            const cy = Math.round(loc.y + size.height / 2);
            await expect(
                calc.executeScript('windows: hover', [{
                    startX: cx - 20,
                    startY: cy,
                    endX: cx,
                    endY: cy,
                }])
            ).resolves.not.toThrow();
        });

        it('hovers with a custom durationMs', async () => {
            const btn = await calc.$('~num4Button');
            const endBtn = await calc.$('~num5Button');
            await expect(
                calc.executeScript('windows: hover', [{
                    startElementId: await btn.elementId,
                    endElementId: await endBtn.elementId,
                    durationMs: 500,
                }])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: scroll', () => {
        it('scrolls at element center with deltaY: 3 without error', async () => {
            const btn = await calc.$('~num1Button');
            await expect(
                calc.executeScript('windows: scroll', [{
                    elementId: await btn.elementId,
                    deltaY: 3,
                }])
            ).resolves.not.toThrow();
        });

        it('scrolls at absolute coordinates', async () => {
            const btn = await calc.$('~num1Button');
            const loc = await btn.getLocation();
            await expect(
                calc.executeScript('windows: scroll', [{
                    x: loc.x,
                    y: loc.y,
                    deltaX: 2,
                }])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: clickAndDrag', () => {
        it('drags from one position to another by coordinates without error', async () => {
            const btn1 = await calc.$('~num1Button');
            const btn2 = await calc.$('~num2Button');
            const loc1 = await btn1.getLocation();
            const size1 = await btn1.getSize();
            const loc2 = await btn2.getLocation();
            const size2 = await btn2.getSize();
            await expect(
                calc.executeScript('windows: clickAndDrag', [{
                    startX: Math.round(loc1.x + size1.width / 2),
                    startY: Math.round(loc1.y + size1.height / 2),
                    endX: Math.round(loc2.x + size2.width / 2),
                    endY: Math.round(loc2.y + size2.height / 2),
                    durationMs: 300,
                }])
            ).resolves.not.toThrow();
        });

        it('drags from startElementId to endElementId center', async () => {
            const startBtn = await calc.$('~num3Button');
            const endBtn = await calc.$('~num4Button');
            await expect(
                calc.executeScript('windows: clickAndDrag', [{
                    startElementId: await startBtn.elementId,
                    endElementId: await endBtn.elementId,
                    durationMs: 200,
                }])
            ).resolves.not.toThrow();
        });
    });
});
