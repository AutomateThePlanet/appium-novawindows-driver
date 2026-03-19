import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'webdriverio';
import { createCalculatorSession, quitSession } from './helpers/session.js';

// pushFile / pullFile / pullFolder use assertFeatureEnabled(MODIFY_FS_FEATURE).
// The Appium server must be started with --allow-insecure modify_fs.

describe('pushFile / pullFile / pullFolder', () => {
    let driver: Browser;

    beforeAll(async () => {
        driver = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    // ─── pushFile ────────────────────────────────────────────────────────────

    describe('pushFile', () => {
        let cleanup: string = '';

        afterEach(() => {
            if (cleanup && existsSync(cleanup)) {
                try { rmSync(cleanup, { recursive: true, force: true }); } catch { /* noop */ }
            }
            cleanup = '';
        });

        it('writes a base64-encoded text file to disk', async () => {
            cleanup = join(tmpdir(), `nova-push-${Date.now()}.txt`);
            await driver.pushFile(cleanup, Buffer.from('Hello, NovaWindows!').toString('base64'));
            expect(existsSync(cleanup)).toBe(true);
        });

        it('round-trips text content via pushFile → pullFile', async () => {
            cleanup = join(tmpdir(), `nova-roundtrip-${Date.now()}.txt`);
            const content = 'round-trip test content';
            await driver.pushFile(cleanup, Buffer.from(content, 'utf8').toString('base64'));
            const pulled = await driver.pullFile(cleanup);
            expect(Buffer.from(pulled, 'base64').toString('utf8')).toBe(content);
        });

        it('round-trips binary data without corruption', async () => {
            cleanup = join(tmpdir(), `nova-binary-${Date.now()}.bin`);
            const bytes = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
            await driver.pushFile(cleanup, bytes.toString('base64'));
            const pulled = await driver.pullFile(cleanup);
            expect(Buffer.from(pulled, 'base64')).toEqual(bytes);
        });

        it('creates missing parent directories automatically', async () => {
            const parentDir = join(tmpdir(), `nova-nested-${Date.now()}`);
            const filePath = join(parentDir, 'sub', 'dir', 'file.txt');
            cleanup = parentDir;
            await driver.pushFile(filePath, Buffer.from('nested').toString('base64'));
            expect(existsSync(filePath)).toBe(true);
        });

        it('overwrites an existing file', async () => {
            cleanup = join(tmpdir(), `nova-overwrite-${Date.now()}.txt`);
            writeFileSync(cleanup, 'old content', 'utf8');
            await driver.pushFile(cleanup, Buffer.from('new content').toString('base64'));
            const pulled = await driver.pullFile(cleanup);
            expect(Buffer.from(pulled, 'base64').toString('utf8')).toBe('new content');
        });
    });

    // ─── pullFile ────────────────────────────────────────────────────────────

    describe('pullFile', () => {
        let cleanup: string = '';

        afterEach(() => {
            if (cleanup && existsSync(cleanup)) {
                try { rmSync(cleanup); } catch { /* noop */ }
            }
            cleanup = '';
        });

        it('returns the base64-encoded content of an existing file', async () => {
            cleanup = join(tmpdir(), `nova-pull-${Date.now()}.txt`);
            const content = 'pull this!';
            writeFileSync(cleanup, content, 'utf8');
            const result = await driver.pullFile(cleanup);
            expect(Buffer.from(result, 'base64').toString('utf8')).toBe(content);
        });

        it('result is a valid base64 string', async () => {
            cleanup = join(tmpdir(), `nova-b64-${Date.now()}.txt`);
            writeFileSync(cleanup, 'base64 check', 'utf8');
            const result = await driver.pullFile(cleanup);
            expect(() => Buffer.from(result, 'base64')).not.toThrow();
        });

        it('throws when the file does not exist', async () => {
            const missing = join(tmpdir(), `nova-missing-${Date.now()}.txt`);
            await expect(driver.pullFile(missing)).rejects.toThrow();
        });
    });

    // ─── pullFolder ──────────────────────────────────────────────────────────

    describe('pullFolder', () => {
        let cleanup: string = '';

        afterEach(() => {
            if (cleanup && existsSync(cleanup)) {
                try { rmSync(cleanup, { recursive: true }); } catch { /* noop */ }
            }
            cleanup = '';
        });

        it('returns a base64-encoded ZIP with valid PK header', async () => {
            cleanup = join(tmpdir(), `nova-folder-${Date.now()}`);
            mkdirSync(cleanup);
            writeFileSync(join(cleanup, 'a.txt'), 'file a');
            writeFileSync(join(cleanup, 'b.txt'), 'file b');

            const result = await driver.pullFolder(cleanup);
            const bytes = Buffer.from(result, 'base64');

            // ZIP local file header: PK\x03\x04
            expect(bytes[0]).toBe(0x50); // P
            expect(bytes[1]).toBe(0x4B); // K
            expect(bytes[2]).toBe(0x03);
            expect(bytes[3]).toBe(0x04);
        });

        it('ZIP is larger when folder has more content', async () => {
            const smallDir = join(tmpdir(), `nova-small-${Date.now()}`);
            const largeDir = join(tmpdir(), `nova-large-${Date.now()}`);
            cleanup = smallDir; // afterEach cleans one; we clean largeDir here manually

            mkdirSync(smallDir);
            writeFileSync(join(smallDir, 'tiny.txt'), 'x');

            mkdirSync(largeDir);
            writeFileSync(join(largeDir, 'big.txt'), 'x'.repeat(10_000));

            const smallZip = await driver.pullFolder(smallDir);
            const largeZip = await driver.pullFolder(largeDir);

            expect(Buffer.from(largeZip, 'base64').length).toBeGreaterThan(
                Buffer.from(smallZip, 'base64').length
            );

            rmSync(largeDir, { recursive: true, force: true });
        });

        it('throws when the directory does not exist', async () => {
            const missing = join(tmpdir(), `nova-missing-dir-${Date.now()}`);
            await expect(driver.pullFolder(missing)).rejects.toThrow();
        });
    });
});
