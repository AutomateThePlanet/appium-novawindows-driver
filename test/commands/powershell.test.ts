/**
 * Unit tests for lib/commands/powershell.ts
 */
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errors } from '@appium/base-driver';
import { startPowerShellSession, sendPowerShellCommand, sendIsolatedPowerShellCommand } from '../../lib/commands/powershell';
import { createMockDriver } from '../fixtures/driver';

vi.mock('node:child_process', () => ({
    spawn: vi.fn(() => createFakePowerShell()),
}));

function createFakePowerShell() {
    const stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
    const stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
    const stdin = { write: vi.fn() };
    return Object.assign(new EventEmitter(), {
        stdout,
        stderr,
        stdin,
        killed: false,
        exitCode: null as number | null,
        kill: vi.fn(function (this: { killed: boolean }) { this.killed = true; return true; }),
    });
}

describe('startPowerShellSession', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sets UTF-8 encoding before Set-Location and awaits Set-Location', async () => {
        const driver = createMockDriver() as any;
        driver.log.warn = vi.fn();
        driver.caps = { appWorkingDir: 'C:\\Program Files\\App', app: 'none' };

        const calls: string[] = [];
        let pending = 0;
        driver.sendPowerShellCommand.mockImplementation(async (command: string) => {
            expect(pending).toBe(0); // the previous command must have been awaited
            pending++;
            calls.push(command);
            await Promise.resolve();
            pending--;
            return 'true';
        });

        await startPowerShellSession.call(driver);

        expect(calls[0]).toContain('[Text.Encoding]::UTF8');
        expect(calls[1]).toBe(`Set-Location -Path 'C:\\Program Files\\App'`);
    });

    it('escapes single quotes in appWorkingDir', async () => {
        const driver = createMockDriver() as any;
        driver.log.warn = vi.fn();
        driver.caps = { appWorkingDir: `C:\\Users\\O'Brien\\App`, app: 'none' };
        driver.sendPowerShellCommand.mockResolvedValue('true');

        await startPowerShellSession.call(driver);

        expect(driver.sendPowerShellCommand.mock.calls[1][0]).toBe(`Set-Location -Path 'C:\\Users\\O''Brien\\App'`);
    });

    it('passes a timeout to the initialization commands', async () => {
        const driver = createMockDriver() as any;
        driver.log.warn = vi.fn();
        driver.caps = { app: 'none' };
        driver.sendPowerShellCommand.mockResolvedValue('true');

        await startPowerShellSession.call(driver);

        for (const [, timeoutMs] of driver.sendPowerShellCommand.mock.calls) {
            expect(timeoutMs).toBeGreaterThan(0);
        }
    });
});

describe('sendIsolatedPowerShellCommand', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sets UTF-8 encoding first and escapes single quotes in appWorkingDir', async () => {
        const driver = createMockDriver() as any;
        driver.log.warn = vi.fn();
        driver.caps = { appWorkingDir: `C:\\Users\\O'Brien\\App` };

        const result = sendIsolatedPowerShellCommand.call(driver, '(Get-Location).Path');
        const powerShell = vi.mocked(spawn).mock.results[0].value;
        powerShell.stdout.emit('data', 'C:\\Users\\O\'Brien\\App\r\n\uF2EE\r\n');
        await result;

        const writes = powerShell.stdin.write.mock.calls.map(([line]: [string]) => line);
        expect(writes[0]).toContain('[Text.Encoding]::UTF8');
        expect(writes[1]).toBe(`Set-Location -Path 'C:\\Users\\O''Brien\\App'\n`);
    });
});

describe('sendPowerShellCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => vi.useRealTimers());

    function createDriver() {
        const driver = createMockDriver() as any;
        driver.log.warn = vi.fn();
        driver.powerShell = createFakePowerShell();
        driver.powerShellStdOut = '';
        driver.powerShellStdErr = '';
        // mirror the session's stdout collector from startPowerShellSession
        driver.powerShell.stdout.on('data', (chunk: string) => { driver.powerShellStdOut += chunk; });
        return driver;
    }

    it('resolves with the output once the end marker arrives', async () => {
        const driver = createDriver();
        const result = sendPowerShellCommand.call(driver, '(Get-Location).Path', 1000);
        driver.powerShell.stdout.emit('data', 'C:\\Windows\r\n\uF2EE\r\n');
        await expect(result).resolves.toBe('C:\\Windows');
        vi.advanceTimersByTime(5000);
        expect(driver.powerShell.kill).not.toHaveBeenCalled();
    });

    it('rejects and kills the session when the end marker is lost', async () => {
        const driver = createDriver();
        const result = sendPowerShellCommand.call(driver, 'Set-Location -Path C:\\', 1000);
        driver.powerShell.stdout.emit('data', '?\r\n');
        vi.advanceTimersByTime(1000);
        await expect(result).rejects.toBeInstanceOf(errors.TimeoutError);
        expect(driver.powerShell.kill).toHaveBeenCalled();
        expect(driver.powerShell.stdout.listenerCount('data')).toBe(1);
    });

    it('waits indefinitely when no timeout is given', async () => {
        const driver = createDriver();
        const result = sendPowerShellCommand.call(driver, 'Start-Sleep 600');
        vi.advanceTimersByTime(10 * 60 * 1000);
        const outcome = await Promise.race([result, Promise.resolve('pending')]);
        expect(outcome).toBe('pending');
        expect(driver.powerShell.kill).not.toHaveBeenCalled();
    });

    it('rejects without writing to stdin when the session was killed', async () => {
        const driver = createDriver();
        driver.powerShell.killed = true;
        await expect(sendPowerShellCommand.call(driver, '1')).rejects.toBeInstanceOf(errors.UnknownError);
        expect(driver.powerShell.stdin.write).not.toHaveBeenCalled();
    });
});
