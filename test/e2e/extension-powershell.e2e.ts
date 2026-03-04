import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, quitSession } from './helpers/session.js';

describe('windows: powerShell and executePowerShellScript', () => {
    describe('powerShell script execution (isolatedScriptExecution: false)', () => {
        let driver: Browser;

        beforeAll(async () => {
            driver = await createCalculatorSession({ 'appium:isolatedScriptExecution': false });
        });

        afterAll(async () => {
            await quitSession(driver);
        });

        it('executes a simple Get-Date command and returns non-empty output', async () => {
            const result = await driver.executeScript('powerShell', [{ script: 'Get-Date' }]) as string;
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('executes a multi-line script and returns final output', async () => {
            const result = await driver.executeScript('powerShell', [{
                script: '$a = 1 + 1\n$a',
            }]) as string;
            expect(result.trim()).toBe('2');
        });

        it('variables persist between powerShell calls in the same session (non-isolated)', async () => {
            await driver.executeScript('powerShell', [{ script: '$testVar = "hello"' }]);
            const result = await driver.executeScript('powerShell', [{ script: '$testVar' }]) as string;
            expect(result.trim()).toBe('hello');
        });

        it('returns empty string for a script with no output', async () => {
            const result = await driver.executeScript('powerShell', [{ script: '$null | Out-Null' }]) as string;
            expect(result.trim()).toBe('');
        });

        it('accepts an object with a script property', async () => {
            const result = await driver.executeScript('powerShell', [{ script: '"script-prop-test"' }]) as string;
            expect(result.trim()).toBe('script-prop-test');
        });

        it('accepts an object with a command property', async () => {
            const result = await driver.executeScript('powerShell', [{ command: '"command-prop-test"' }]) as string;
            expect(result.trim()).toBe('command-prop-test');
        });

        it('executes powerShell alias', async () => {
            const result = await driver.executeScript('powerShell', [{
                script: '"alias-test"',
            }]) as string;
            expect(result.trim()).toBe('alias-test');
        });
    });

    describe('powerShell script execution (isolatedScriptExecution: true)', () => {
        let driver: Browser;

        beforeAll(async () => {
            driver = await createCalculatorSession({ 'appium:isolatedScriptExecution': true });
        });

        afterAll(async () => {
            await quitSession(driver);
        });

        it('executes a script in isolated mode and returns output', async () => {
            const result = await driver.executeScript('powerShell', [{ script: 'Get-Process | Select-Object -First 1 | Select-Object -ExpandProperty Name' }]) as string;
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('variables do NOT persist between isolated powerShell calls', async () => {
            await driver.executeScript('powerShell', [{ script: '$isolatedVar = "should-not-persist"' }]);
            const result = await driver.executeScript('powerShell', [{ script: '$isolatedVar' }]) as string;
            // In isolated mode each execution is fresh — variable is not defined
            expect(result.trim()).toBe('');
        });
    });
});
