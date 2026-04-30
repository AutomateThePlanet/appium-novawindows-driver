/**
 * Unit tests for lib/commands/device.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeviceTime } from '../../lib/commands/device';
import { createMockDriver } from '../fixtures/driver';

describe('getDeviceTime', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns formatted date string from sendCommand', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        const result = await getDeviceTime.call(driver);
        expect(result).toBe('2026-02-25T10:30:00+00:00');
        expect(driver.sendCommand).toHaveBeenCalledTimes(1);
    });

    it('uses ISO 8061 format by default when no format provided', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('2026-02-25T10:30:00+00:00');
        await getDeviceTime.call(driver);
        expect(driver.sendCommand).toHaveBeenCalledWith('executePowerShellScript', expect.objectContaining({
            script: expect.stringContaining('yyyy-MM-ddTHH:mm:sszzz'),
        }));
    });

    it('uses custom format when provided as second argument', async () => {
        const driver = createMockDriver() as any;
        driver.sendCommand.mockResolvedValue('25/02/2026');
        const result = await getDeviceTime.call(driver, undefined, 'dd/MM/yyyy');
        expect(result).toBe('25/02/2026');
        expect(driver.sendCommand).toHaveBeenCalledWith('executePowerShellScript', expect.objectContaining({
            script: expect.stringContaining('dd/MM/yyyy'),
        }));
    });
});
