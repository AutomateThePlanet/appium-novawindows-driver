/**
 * Unit tests for the W3C launchApp command (session-scoped).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { launchApp } from '../../../lib/commands/app';
import { createMockDriver } from '../../fixtures/driver';

describe('launchApp (W3C)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('re-launches the session app via changeRootElement', async () => {
        const driver = createMockDriver() as any;
        driver.caps = { app: 'C:\\Program Files\\notepad.exe' };
        driver.changeRootElement = vi.fn().mockResolvedValue(undefined);

        await launchApp.call(driver);

        expect(driver.changeRootElement).toHaveBeenCalledWith('C:\\Program Files\\notepad.exe');
        expect(driver.changeRootElement).toHaveBeenCalledTimes(1);
    });

    it('re-launches a UWP app via changeRootElement', async () => {
        const driver = createMockDriver() as any;
        driver.caps = { app: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App' };
        driver.changeRootElement = vi.fn().mockResolvedValue(undefined);

        await launchApp.call(driver);

        expect(driver.changeRootElement).toHaveBeenCalledWith('Microsoft.WindowsCalculator_8wekyb3d8bbwe!App');
    });

    it('throws InvalidArgumentError when app capability is not set', async () => {
        const driver = createMockDriver() as any;
        driver.caps = {};

        await expect(launchApp.call(driver)).rejects.toThrow('No app capability is set');
    });

    it('throws InvalidArgumentError when app is "root"', async () => {
        const driver = createMockDriver() as any;
        driver.caps = { app: 'root' };

        await expect(launchApp.call(driver)).rejects.toThrow('No app capability is set');
    });

    it('throws InvalidArgumentError when app is "none"', async () => {
        const driver = createMockDriver() as any;
        driver.caps = { app: 'none' };

        await expect(launchApp.call(driver)).rejects.toThrow('No app capability is set');
    });
});
