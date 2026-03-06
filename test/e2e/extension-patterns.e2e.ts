import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import {
    createCalculatorSession,
    createNotepadSession,
    createTodoSession,
    getNotepadTextArea,
    quitSession,
    resetCalculator,
    clearNotepad,
    createTodoTask,
    deleteTasks,
} from './helpers/session.js';

describe('windows: pattern extension commands', () => {
    let calc: Browser;
    let notepad: Browser;
    let todo: Browser;

    // beforeAll(async () => {
    //     calc = await createCalculatorSession();
    //     notepad = await createNotepadSession();
    // });

    // afterAll(async () => {
    //     await quitSession(calc);
    //     await quitSession(notepad);
    // });

    describe('windows: invoke', () => {

        beforeAll(async () => {
            calc = await createCalculatorSession();
        });

        afterAll(async () => {
            await quitSession(calc);
        });

        afterEach(async () => {
            await resetCalculator(calc);
        });

        it('invokes the One button and result display shows 1', async () => {
            const oneBtn = await calc.$('~num1Button');
            await calc.executeScript('windows: invoke', [oneBtn]);
            const display = await calc.$('~CalculatorResults');
            const text = await display.getText();
            expect(text).toContain('1');
        });

        it('invokes the Equals button without error', async () => {
            await (calc.$('~num2Button')).click();
            const equalsBtn = await calc.$('~equalButton');
            await expect(
                calc.executeScript('windows: invoke', [equalsBtn])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: maximize / minimize / restore', () => {
        beforeAll(async () => {
            calc = await createCalculatorSession();
        });

        afterAll(async () => {
            await quitSession(calc);
        });

        afterEach(async function restoreWindow() {
            // Always restore to a known state
            try {
                await resetCalculator(calc);
                const windowEl = await calc.executeScript('windows: getWindowElement', []);
                await calc.executeScript('windows: restore', [windowEl]);
            } catch {
                // noop
            }
        });

        it('maximizes the Calculator window without error', async () => {
            const windowEl = await calc.executeScript('windows: getWindowElement', []);
            await expect(
                calc.executeScript('windows: maximize', [windowEl])
            ).resolves.not.toThrow();
        });

        it('minimizes then restores the Calculator window', async () => {
            const windowEl = await calc.executeScript('windows: getWindowElement', []);
            await calc.executeScript('windows: minimize', [windowEl]);
            await calc.executeScript('windows: restore', [windowEl]);
            // Window should be accessible again
            const display = await calc.$('~CalculatorResults');
            expect(await display.isExisting()).toBe(true);
        });

        it('restore on an already-normal window does not throw', async () => {
            const windowEl = await calc.executeScript('windows: getWindowElement', []);
            await expect(
                calc.executeScript('windows: restore', [windowEl])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: setFocus', () => {
        beforeAll(async () => {
            calc = await createCalculatorSession();
        });

        afterAll(async () => {
            await quitSession(calc);
        });

        afterEach(async () => {
            await resetCalculator(calc);
        });

        it('sets focus on the result display element without error', async () => {
            const display = await calc.$('~CalculatorResults');
            await expect(
                calc.executeScript('windows: setFocus', [display])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: scrollIntoView', () => {
        beforeAll(async () => {
            calc = await createCalculatorSession();
        });

        afterAll(async () => {
            await quitSession(calc);
        });

        afterEach(async () => {
            await resetCalculator(calc);
        });

        it('scrolls a visible element into view without error', async () => {
            const btn = await calc.$('~num1Button');
            await expect(
                calc.executeScript('windows: scrollIntoView', [btn])
            ).resolves.not.toThrow();
        });
    });

    describe('windows: setValue / getValue (ValuePattern)', () => {
        beforeAll(async () => {
            notepad = await createNotepadSession();
            await clearNotepad(notepad);
        });

        afterAll(async () => {
            await quitSession(notepad);
        });

        it('sets a value using ValuePattern and getValue returns it', async () => {
            const textArea = await getNotepadTextArea(notepad);
            await notepad.executeScript('windows: setValue', [textArea, 'pattern value test']);
            const result = await notepad.executeScript('windows: getValue', [textArea]);
            expect(result).toContain('pattern value test');
        });
    });

    describe('windows: select / allSelectedItems / isMultiple / toggle', () => {
        beforeAll(async () => {
            todo = await createTodoSession();
            await createTodoTask(todo, 'First task');
            await createTodoTask(todo, 'Second task');
        });

        afterAll(async () => {
            await deleteTasks(todo);
            await quitSession(todo);
        });

        it('toggles a task checkbox in To-Do', async () => {
            const checkbox = await todo.$('~CompleteTodoCheckBox');
            await expect(
                todo.executeScript('windows: toggle', [checkbox])
            ).resolves.not.toThrow();
        });

        it('select selects a task item in the To-Do list', async () => {
            const item = await todo.$('//Custom/Group/List/ListItem[1]');
            await expect(
                todo.executeScript('windows: select', [item])
            ).resolves.not.toThrow();
        });

        it('isMultiple returns a boolean for the To-Do task list container', async () => {
            const list = await todo.$('~TodosListView');
            const result = await todo.executeScript('windows: isMultiple', [list]);
            expect(typeof result).toBe('boolean');
        });

        it('allSelectedItems returns an array for the To-Do task list container', async () => {
            const list = await todo.$('~TodosListView');
            const result = await todo.executeScript('windows: allSelectedItems', [list]);
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
