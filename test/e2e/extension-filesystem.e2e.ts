import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, quitSession } from './helpers/session.js';

describe('windows: deleteFile and deleteFolder', () => {
    let driver: Browser;

    beforeAll(async () => {
        driver = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    describe('windows: deleteFile', () => {
        let testFilePath: string;

        beforeEach(() => {
            testFilePath = join(tmpdir(), `novawindows-test-${Date.now()}.txt`);
            writeFileSync(testFilePath, 'test content');
        });

        afterEach(() => {
            if (existsSync(testFilePath)) {
                // Clean up if test didn't delete it
                try {
                    rmdirSync(testFilePath);
                } catch {
                    // file not a dir
                }
            }
        });

        it('deletes an existing temp file and the file no longer exists', async () => {
            expect(existsSync(testFilePath)).toBe(true);
            await driver.executeScript('windows: deleteFile', [{ path: testFilePath }]);
            expect(existsSync(testFilePath)).toBe(false);
        });

        it('throws when the file does not exist', async () => {
            const nonExistent = join(tmpdir(), 'novawindows-nonexistent-xyz.txt');
            await expect(
                driver.executeScript('windows: deleteFile', [{ path: nonExistent }])
            ).rejects.toThrow();
        });

        it('throws when path is not provided', async () => {
            await expect(
                driver.executeScript('windows: deleteFile', [{}])
            ).rejects.toThrow();
        });
    });

    describe('windows: deleteFolder', () => {
        let testDirPath: string;

        beforeEach(() => {
            testDirPath = join(tmpdir(), `novawindows-dir-${Date.now()}`);
        });

        afterEach(() => {
            // Best-effort cleanup in case test failed
            if (existsSync(testDirPath)) {
                try {
                    rmdirSync(testDirPath, { recursive: true });
                } catch {
                    // noop
                }
            }
        });

        it('deletes an existing empty temp directory', async () => {
            mkdirSync(testDirPath);
            expect(existsSync(testDirPath)).toBe(true);
            await driver.executeScript('windows: deleteFolder', [{ path: testDirPath }]);
            expect(existsSync(testDirPath)).toBe(false);
        });

        it('deletes a directory with files recursively (recursive: true, default)', async () => {
            mkdirSync(testDirPath);
            writeFileSync(join(testDirPath, 'file1.txt'), 'content');
            writeFileSync(join(testDirPath, 'file2.txt'), 'content');
            await driver.executeScript('windows: deleteFolder', [{ path: testDirPath, recursive: true }]);
            expect(existsSync(testDirPath)).toBe(false);
        });

        it('throws when the folder does not exist', async () => {
            const nonExistent = join(tmpdir(), 'novawindows-nonexistent-dir-xyz');
            await expect(
                driver.executeScript('windows: deleteFolder', [{ path: nonExistent }])
            ).rejects.toThrow();
        });

        it('throws when path is not provided', async () => {
            await expect(
                driver.executeScript('windows: deleteFolder', [{}])
            ).rejects.toThrow();
        });
    });
});
