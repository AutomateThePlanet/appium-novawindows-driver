import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, quitSession } from './helpers/session.js';

describe('Device and system commands', () => {
    let driver: Browser;

    beforeAll(async () => {
        driver = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    describe('getDeviceTime', () => {
        it('returns an ISO 8601 timestamp string', async () => {
            const time = await driver.getDeviceTime();
            // yyyy-MM-ddTHH:mm:ss+HH:mm
            expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
        });

        it('windows: getDeviceTime with custom format returns formatted string', async () => {
            const year = await driver.executeScript('windows: getDeviceTime', [{ format: 'yyyy' }]) as string;
            expect(year).toMatch(/^\d{4}$/);
            expect(parseInt(year, 10)).toBeGreaterThanOrEqual(2020);
        });
    });

    describe('getOrientation', () => {
        it('returns LANDSCAPE or PORTRAIT', async () => {
            const orientation = await driver.getOrientation();
            expect(['LANDSCAPE', 'PORTRAIT']).toContain(orientation);
        });

        it('returns the same value on repeated calls', async () => {
            const first = await driver.getOrientation();
            const second = await driver.getOrientation();
            expect(first).toBe(second);
        });
    });
});
