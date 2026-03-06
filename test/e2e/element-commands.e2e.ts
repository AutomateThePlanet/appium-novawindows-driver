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

describe('W3C element commands', () => {
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

    describe('getProperty / getAttribute', () => {
        it('gets the Name property of the result display element', async () => {
            const name = await calc.$('~CalculatorResults').getAttribute('Name');
            expect(name).toBeTruthy();
        });

        it('gets the AutomationId property of a button', async () => {
            const automationId = await calc.$('~num1Button').getAttribute('AutomationId');
            expect(automationId).toBe('num1Button');
        });

        it('gets the IsEnabled property of a button', async () => {
            const isEnabled = await calc.$('~equalButton').getAttribute('IsEnabled');
            expect(isEnabled).toBeTruthy();
        });

        it('gets the ControlType property of a button', async () => {
            const controlType = await calc.$('~num1Button').getAttribute('ControlType');
            expect(controlType).toBeTruthy();
        });
    });

    describe('getText', () => {
        it('returns text content of the result display after pressing a digit', async () => {
            await calc.$('~num5Button').click();
            const text = await calc.$('~CalculatorResults').getText();
            expect(text).toContain('5');
        });

        it('returns a string for an element', async () => {
            const text = await calc.$('~num1Button').getText();
            expect(typeof text).toBe('string');
        });
    });

    describe('getName', () => {
        it('returns the control type name for a Button element', async () => {
            const name = await calc.$('~num1Button').getTagName();
            expect(name).toBeTruthy();
        });
    });

    describe('getElementRect', () => {
        it('returns a rect with positive width and height for a visible button', async () => {
            const rect = await calc.$('~num1Button').getSize();
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
        });

        it('returns x and y coordinates', async () => {
            const location = await calc.$('~num1Button').getLocation();
            expect(typeof location.x).toBe('number');
            expect(typeof location.y).toBe('number');
        });
    });

    describe('elementDisplayed', () => {
        it('returns true for a visible button', async () => {
            expect(await calc.$('~num1Button').isDisplayed()).toBe(true);
        });
    });

    describe('elementEnabled', () => {
        it('returns true for an enabled button', async () => {
            expect(await calc.$('~equalButton').isEnabled()).toBe(true);
        });
    });

    describe('elementSelected', () => {
        it('returns true for the active navigation mode item (Standard)', async () => {
            await calc.$('~TogglePaneButton').click();
            try {
                expect(await calc.$('~Standard').isSelected()).toBe(true);
            } finally {
                await calc.$('~TogglePaneButton').click();
            }
        });
    });

    describe('active', () => {
        it('returns the currently focused element after clicking a button', async () => {
            await calc.$('~num3Button').click();
            const active = await calc.getActiveElement();
            expect(active).toBeDefined();
        });
    });

    describe('click', () => {
        it('clicking digit buttons produces the expected result in the display', async () => {
            await calc.$('~num7Button').click();
            const text = await calc.$('~CalculatorResults').getText();
            expect(text).toContain('7');
        });

        it('performs addition: 1 + 1 = 2', async () => {
            await calc.$('~num1Button').click();
            await calc.$('~plusButton').click();
            await calc.$('~num1Button').click();
            await calc.$('~equalButton').click();
            const text = await calc.$('~CalculatorResults').getText();
            expect(text).toContain('2');
        });
    });

    describe('setValue and clear', () => {
        beforeEach(async () => {
            await clearNotepad(notepad);
        });

        it('sets a value in Notepad text area and getText returns it', async () => {
            const textArea = await getNotepadTextArea(notepad);
            await textArea.setValue('Hello World');
            const text = await textArea.getText();
            expect(text).toContain('Hello World');
        });

        it('clear empties the Notepad text area', async () => {
            const textArea = await getNotepadTextArea(notepad);
            await textArea.setValue('some text');
            await textArea.clearValue();
            const text = await textArea.getText();
            expect(text.trim()).toBe('');
        });
    });
});
