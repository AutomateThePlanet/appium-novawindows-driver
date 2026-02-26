/**
 * Unit tests for lib/commands/device.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeviceTime } from '../../lib/commands/device';
import { createMockDriver } from '../fixtures/driver';

/** Decode base64 Invoke-Expression wrappers to reveal the underlying PS command. */
function decodeCommand(cmd: string): string {
    const match = cmd.match(/FromBase64String\('([^']+)'\)/);
    if (!match) {return cmd;}
    return decodeCommand(Buffer.from(match[1], 'base64').toString('utf8'));
}

describe('getDeviceTime', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns formatted date string from PS command', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        const result = await getDeviceTime.call(driver);
        expect(result).toBe('2026-02-25T10:30:00+00:00');
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
    });

    it('uses ISO 8061 format by default when no format provided', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        await getDeviceTime.call(driver);
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-Date');
        expect(cmd).toContain('yyyy-MM-ddTHH:mm:sszzz');
    });

    it('uses custom format when provided', async () => {
        const driver = createMockDriver() as any;
        driver.sendPowerShellCommand.mockResolvedValue('25/02/2026');
        const result = await getDeviceTime.call(driver, 'dd/MM/yyyy');
        expect(result).toBe('25/02/2026');
        const cmd = decodeCommand(driver.sendPowerShellCommand.mock.calls[0][0]);
        expect(cmd).toContain('Get-Date');
        // The custom format is embedded as a PSString (unicode-escaped)
        expect(cmd).toContain('ToString');
    });
});
