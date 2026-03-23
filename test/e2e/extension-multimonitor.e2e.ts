import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import type { Browser } from 'webdriverio';
import {
    createCalculatorSession,
    quitSession,
    resetCalculator,
} from './helpers/session.js';

describe('windows: getMonitors extension command', () => {
    let calc: Browser;

    beforeAll(async () => {
        calc = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(calc);
    });

    beforeEach(async () => {
        await resetCalculator(calc);
    });

    describe('getMonitors — response shape', () => {
        it('returns a non-empty array', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            expect(Array.isArray(monitors)).toBe(true);
            expect(monitors.length).toBeGreaterThanOrEqual(1);
        });

        it('each monitor has required numeric index and non-empty deviceName', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            for (const monitor of monitors) {
                expect(typeof monitor.index).toBe('number');
                expect(typeof monitor.deviceName).toBe('string');
                expect(monitor.deviceName.length).toBeGreaterThan(0);
            }
        });

        it('each monitor has a boolean primary field', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            for (const monitor of monitors) {
                expect(typeof monitor.primary).toBe('boolean');
            }
        });

        it('exactly one monitor is marked as primary', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            const primaries = monitors.filter((m: any) => m.primary);
            expect(primaries).toHaveLength(1);
        });

        it('each monitor has bounds with positive width and height', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            for (const monitor of monitors) {
                expect(typeof monitor.bounds.x).toBe('number');
                expect(typeof monitor.bounds.y).toBe('number');
                expect(monitor.bounds.width).toBeGreaterThan(0);
                expect(monitor.bounds.height).toBeGreaterThan(0);
            }
        });

        it('each monitor has workingArea with positive width and height', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            for (const monitor of monitors) {
                expect(typeof monitor.workingArea.x).toBe('number');
                expect(typeof monitor.workingArea.y).toBe('number');
                expect(monitor.workingArea.width).toBeGreaterThan(0);
                expect(monitor.workingArea.height).toBeGreaterThan(0);
            }
        });

        it('workingArea is contained within bounds for each monitor', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            for (const monitor of monitors) {
                expect(monitor.workingArea.x).toBeGreaterThanOrEqual(monitor.bounds.x);
                expect(monitor.workingArea.y).toBeGreaterThanOrEqual(monitor.bounds.y);
                expect(monitor.workingArea.width).toBeLessThanOrEqual(monitor.bounds.width);
                expect(monitor.workingArea.height).toBeLessThanOrEqual(monitor.bounds.height);
            }
        });

        it('monitor indices are sequential starting from 0', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            const indices = monitors.map((m: any) => m.index).sort((a: number, b: number) => a - b);
            for (let i = 0; i < indices.length; i++) {
                expect(indices[i]).toBe(i);
            }
        });

        it('primary monitor bounds origin is at the Windows virtual origin (0, 0)', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            const primary = monitors.find((m: any) => m.primary);
            expect(primary.bounds.x).toBe(0);
            expect(primary.bounds.y).toBe(0);
        });
    });

    describe('virtual-screen absolute click regression', () => {
        it('clicking Calculator "9" button by absolute screen coordinates shows 9 in display', async () => {
            const btn = await calc.$('~num9Button');
            const loc = await btn.getLocation();
            const size = await btn.getSize();
            const windowRect = await calc.getWindowRect();

            const x = Math.round(windowRect.x + loc.x + size.width / 2);
            const y = Math.round(windowRect.y + loc.y + size.height / 2);

            await calc.executeScript('windows: click', [{ x, y }]);

            const display = await calc.$('~CalculatorResults');
            expect(await display.getText()).toContain('9');
        });

        it('clicking Calculator "5" button by absolute screen coordinates shows 5 in display', async () => {
            const btn = await calc.$('~num5Button');
            const loc = await btn.getLocation();
            const size = await btn.getSize();
            const windowRect = await calc.getWindowRect();

            const x = Math.round(windowRect.x + loc.x + size.width / 2);
            const y = Math.round(windowRect.y + loc.y + size.height / 2);

            await calc.executeScript('windows: click', [{ x, y }]);

            const display = await calc.$('~CalculatorResults');
            expect(await display.getText()).toContain('5');
        });

        it('absolute coordinates derived from getMonitors primary bounds contain the Calculator window', async () => {
            const monitors = await calc.executeScript('windows: getMonitors', []) as any[];
            const primary = monitors.find((m: any) => m.primary);
            const windowRect = await calc.getWindowRect();

            // Calculator window should fall within primary monitor bounds
            // (it was launched without any monitor preference, so it opens on primary)
            expect(windowRect.x).toBeGreaterThanOrEqual(primary.bounds.x);
            expect(windowRect.y).toBeGreaterThanOrEqual(primary.bounds.y);
            expect(windowRect.x + windowRect.width).toBeLessThanOrEqual(primary.bounds.x + primary.bounds.width);
            expect(windowRect.y + windowRect.height).toBeLessThanOrEqual(primary.bounds.y + primary.bounds.height);
        });
    });
});
