/**
 * Unit tests for getClipboardBase64 and setClipboardFromBase64 extension commands.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClipboardBase64, setClipboardFromBase64 } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('getClipboardBase64', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns plaintext clipboard by default', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('aGVsbG8=');
        const result = await getClipboardBase64.call(driver);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Get-Clipboard')
        );
        expect(result).toBe('aGVsbG8=');
    });

    it('accepts contentType as plaintext', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('dGVzdA==');
        const result = await getClipboardBase64.call(driver, 'plaintext');
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Get-Clipboard')
        );
        expect(result).toBe('dGVzdA==');
    });

    it('accepts contentType as image', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('iVBORw0KGgo=');
        const result = await getClipboardBase64.call(driver, 'image');
        const callArg = driver.sendPowerShellCommand.mock.calls[0][0];
        const base64Match = callArg.match(/FromBase64String\('([^']+)'\)/);
        const decoded = base64Match ? Buffer.from(base64Match[1], 'base64').toString() : '';
        expect(decoded).toContain('GetImage');
        expect(result).toBe('iVBORw0KGgo=');
    });

    it('accepts contentType as object with contentType property', async () => {
        const driver = createMockDriver();
        driver.sendPowerShellCommand.mockResolvedValue('YmFzZTY0');
        const result = await getClipboardBase64.call(driver, { contentType: 'plaintext' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Get-Clipboard')
        );
        expect(result).toBe('YmFzZTY0');
    });

    it('throws for unsupported content type', async () => {
        const driver = createMockDriver();
        await expect(
            getClipboardBase64.call(driver, 'unsupported' as any)
        ).rejects.toThrow("Unsupported content type 'unsupported'");
    });
});

describe('setClipboardFromBase64', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when b64Content is missing', async () => {
        const driver = createMockDriver();
        await expect(
            setClipboardFromBase64.call(driver, {} as any)
        ).rejects.toThrow("'b64Content' must be provided.");
        await expect(
            setClipboardFromBase64.call(driver, { contentType: 'plaintext' } as any)
        ).rejects.toThrow("'b64Content' must be provided.");
    });

    it('sets plaintext clipboard by default', async () => {
        const driver = createMockDriver();
        await setClipboardFromBase64.call(driver, { b64Content: 'aGVsbG8=' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('FromBase64String')
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('Set-Clipboard')
        );
    });

    it('sets plaintext clipboard with explicit contentType', async () => {
        const driver = createMockDriver();
        await setClipboardFromBase64.call(driver, { b64Content: 'dGVzdA==', contentType: 'plaintext' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('FromBase64String')
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('dGVzdA==')
        );
    });

    it('sets image clipboard', async () => {
        const driver = createMockDriver();
        await setClipboardFromBase64.call(driver, { b64Content: 'iVBORw0KGgo=', contentType: 'image' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('FromBase64String')
        );
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('SetImage')
        );
    });

    it('throws for unsupported content type', async () => {
        const driver = createMockDriver();
        await expect(
            setClipboardFromBase64.call(driver, { b64Content: 'abc', contentType: 'unsupported' as any })
        ).rejects.toThrow("Unsupported content type 'unsupported'");
    });
});
