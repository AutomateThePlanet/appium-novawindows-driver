import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, quitSession, resetCalculator } from './helpers/session.js';

describe('windows: screen recording', () => {
    let driver: Browser;

    beforeEach(async () => {
        driver = await createCalculatorSession();
    });

    afterEach(async () => {
        // Ensure recording is stopped if a test left it running
        try {
            await driver.executeScript('windows: stopRecordingScreen', [{}]);
        } catch {
            // noop
        }
        await quitSession(driver);
    });

    describe('startRecordingScreen', () => {
        it('starts screen recording without options and does not throw', async () => {
            await expect(
                driver.executeScript('windows: startRecordingScreen', [{}])
            ).resolves.not.toThrow();
            // Stop to clean up
            await driver.executeScript('windows: stopRecordingScreen', [{}]);
        });

        it('starts recording with fps: 15 and timeLimit: 10', async () => {
            await expect(
                driver.executeScript('windows: startRecordingScreen', [{
                    videoFps: 15,
                    timeLimit: 10,
                }])
            ).resolves.not.toThrow();
            await driver.executeScript('windows: stopRecordingScreen', [{}]);
        });

        it('calling startRecordingScreen twice with forceRestart: true restarts recording', async () => {
            await driver.executeScript('windows: startRecordingScreen', [{}]);
            await expect(
                driver.executeScript('windows: startRecordingScreen', [{ forceRestart: true }])
            ).resolves.not.toThrow();
            await driver.executeScript('windows: stopRecordingScreen', [{}]);
        });

        it('calling startRecordingScreen twice with forceRestart: false is a no-op', async () => {
            await driver.executeScript('windows: startRecordingScreen', [{}]);
            await expect(
                driver.executeScript('windows: startRecordingScreen', [{ forceRestart: false }])
            ).resolves.not.toThrow();
            await driver.executeScript('windows: stopRecordingScreen', [{}]);
        });
    });

    describe('stopRecordingScreen', () => {
        it('stops recording and returns a non-empty base64 string', async () => {
            await driver.executeScript('windows: startRecordingScreen', [{}]);
            // Interact briefly to generate some frames
            await resetCalculator(driver);
            const result = await driver.executeScript('windows: stopRecordingScreen', [{}]) as string;
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('decoded video data starts with MP4/video file magic bytes (ftyp box)', async () => {
            await driver.executeScript('windows: startRecordingScreen', [{}]);
            await resetCalculator(driver);
            const result = await driver.executeScript('windows: stopRecordingScreen', [{}]) as string;
            const buffer = Buffer.from(result, 'base64');
            // MP4 files contain "ftyp" at bytes 4-8
            const marker = buffer.slice(4, 8).toString('ascii');
            expect(marker).toBe('ftyp');
        });

        it('stopRecordingScreen when no recording was started returns empty string', async () => {
            // No recording started
            const result = await driver.executeScript('windows: stopRecordingScreen', [{}]) as string;
            expect(result).toBe('');
        });

        it('full cycle: start, interact with Calculator, stop, returns valid video data', async () => {
            await driver.executeScript('windows: startRecordingScreen', [{ videoFps: 10 }]);

            // Perform some interactions
            await (await driver.$('~num1Button')).click();
            await (await driver.$('~plusButton')).click();
            await (await driver.$('~num2Button')).click();
            await (await driver.$('~equalButton')).click();

            const result = await driver.executeScript('windows: stopRecordingScreen', [{}]) as string;
            expect(result.length).toBeGreaterThan(100);
        });
    });
});
