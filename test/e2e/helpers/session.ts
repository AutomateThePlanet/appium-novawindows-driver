import { execSync } from 'node:child_process';
import type { Browser } from 'webdriverio';
import { remote } from 'webdriverio';

export const APPIUM_SERVER = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
};

export const CALCULATOR_APP_ID = 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App';
export const NOTEPAD_APP_PATH = 'C:\\Windows\\notepad.exe';
export const TODO_APP_ID = 'Microsoft.Todos_8wekyb3d8bbwe!App';

type Caps = WebdriverIO.Capabilities;

export async function createCalculatorSession(extraCaps?: Record<string, unknown>): Promise<Browser> {
    const driver = await remote({
        ...APPIUM_SERVER,
        capabilities: {
            platformName: 'Windows',
            'appium:automationName': 'DesktopDriver',
            'appium:app': CALCULATOR_APP_ID,
            ...extraCaps,
        } as Caps,
    });
    await driver.setTimeout({ implicit: 1500 });
    return driver;
}

export async function createNotepadSession(extraCaps?: Record<string, unknown>): Promise<Browser> {
    const driver = await remote({
        ...APPIUM_SERVER,
        capabilities: {
            platformName: 'Windows',
            'appium:automationName': 'DesktopDriver',
            'appium:app': NOTEPAD_APP_PATH,
            ...extraCaps,
        } as Caps,
    });
    await driver.setTimeout({ implicit: 1500 });
    return driver;
}

export async function createTodoSession(extraCaps?: Record<string, unknown>): Promise<Browser> {
    const driver = await remote({
        ...APPIUM_SERVER,
        capabilities: {
            platformName: 'Windows',
            'appium:automationName': 'DesktopDriver',
            'appium:app': TODO_APP_ID,
            ...extraCaps,
        } as Caps,
    });
    await driver.setTimeout({ implicit: 1500 });
    return driver;
}

export async function createRootSession(extraCaps?: Record<string, unknown>): Promise<Browser> {
    const driver = await remote({
        ...APPIUM_SERVER,
        capabilities: {
            platformName: 'Windows',
            'appium:automationName': 'DesktopDriver',
            'appium:app': 'Root',
            ...extraCaps,
        } as Caps,
    });
    await driver.setTimeout({ implicit: 1500 });
    return driver;
}

/** Kill any Calculator, Notepad or To-Do processes left open by a previous test. */
export function closeAllTestApps(): void {
    for (const name of ['Calculator.exe', 'CalculatorApp.exe', 'notepad.exe', 'Microsoft.Todos.exe']) {
        try {
            execSync(`taskkill /F /IM "${name}"`, { stdio: 'ignore' });
        } catch {
            // process not running — ok
        }
    }
}

export async function quitSession(driver: Browser | null): Promise<void> {
    try {
        await driver?.deleteSession();
    } catch {
        // noop — session may already be terminated
    }
}

/** Click the Calculator clear button to reset the display to 0 */
export async function resetCalculator(driver: Browser): Promise<void> {
    const clearBtn = await driver.$('~clearButton');
    await clearBtn.click();
}

/** Returns the Notepad text area element (modern Win11 uses Document, classic Win10 uses Edit). */
export async function getNotepadTextArea(driver: Browser) {
    const el = driver.$('//Document');
    if (await el.isExisting()) {
        return el;
    }
    return driver.$('//Edit');
}

/** Clear all text in Notepad via Ctrl+A + Delete */
export async function clearNotepad(driver: Browser): Promise<void> {
    const textArea = await getNotepadTextArea(driver);
    await textArea.click();
    await driver.keys(['Control', 'a']);
    await driver.keys(['Delete']);
}


export async function createTodoTask(driver: Browser, content: string): Promise<void> {
    const textArea = await driver.$('//Custom/Group/Edit');
    await textArea.setValue(content);
    await driver.keys(['Enter']);
}

export async function deleteTasks(driver: Browser): Promise<void> {
    const MAX_ITERATIONS = 10;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const tasks = await driver.$$('//Custom/Group/List/ListItem');
        if (await tasks.length === 0) {break;}

        const elementId: string = await tasks[0].elementId;

        // Right-click the first task to open the context menu
        driver.executeScript('windows: click', [{
            elementId,
            button: 'right',
        }]);

        // Click "Delete" in the context menu
        await driver.$('//MenuItem[@Name="Delete task"]').click();

        // Confirm the deletion in the popup dialog
        await driver.$('~PrimaryButton').click();
    }
}
