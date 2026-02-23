/**
 * Unit tests for pushCacheRequest (cacheRequest) extension command.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushCacheRequest } from '../../../lib/commands/extension';
import { createMockDriver } from '../../fixtures/driver';

describe('pushCacheRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when all properties are undefined', async () => {
        const driver = createMockDriver();
        await expect(
            pushCacheRequest.call(driver, {})
        ).rejects.toThrow('At least one property of the cache request must be set.');
        await expect(
            pushCacheRequest.call(driver, { treeScope: undefined, treeFilter: undefined, automationElementMode: undefined })
        ).rejects.toThrow('At least one property of the cache request must be set.');
        expect(driver.sendPowerShellCommand).not.toHaveBeenCalled();
    });

    it('sends treeFilter command when treeFilter is set', async () => {
        const driver = createMockDriver();
        await pushCacheRequest.call(driver, { treeFilter: 'TrueCondition' });
        expect(driver.sendPowerShellCommand).toHaveBeenCalledTimes(1);
        expect(driver.sendPowerShellCommand).toHaveBeenCalledWith(
            expect.stringContaining('TreeFilter')
        );
    });

    it('throws for invalid treeScope value', async () => {
        const driver = createMockDriver();
        await expect(
            pushCacheRequest.call(driver, { treeScope: 'InvalidScope' })
        ).rejects.toThrow('Invalid value');
    });

    it('throws for invalid automationElementMode value', async () => {
        const driver = createMockDriver();
        await expect(
            pushCacheRequest.call(driver, { automationElementMode: 'InvalidMode' })
        ).rejects.toThrow('Invalid value');
    });
});
