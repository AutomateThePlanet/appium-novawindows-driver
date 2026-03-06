import { describe, it, expect } from 'vitest';
import { createCalculatorSession, quitSession } from './helpers/session.js';

// Each test creates its own session because cacheRequest modifies global PowerShell session state.

describe('windows: cacheRequest', () => {
    it('pushes a cacheRequest with treeScope: SubTree without error', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{ treeScope: 'SubTree' }])
            ).resolves.not.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('pushes a cacheRequest with treeFilter: RawView without error', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{ treeFilter: 'RawView' }])
            ).resolves.not.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('pushes a cacheRequest with automationElementMode: Full without error', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{ automationElementMode: 'Full' }])
            ).resolves.not.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('pushes a cacheRequest with all three properties set', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{
                    treeScope: 'SubTree',
                    treeFilter: 'RawView',
                    automationElementMode: 'Full',
                }])
            ).resolves.not.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('throws InvalidArgumentError when no property is provided', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{}])
            ).rejects.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('throws InvalidArgumentError for an invalid treeScope value', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{ treeScope: 'InvalidScope' }])
            ).rejects.toThrow();
        } finally {
            await quitSession(driver);
        }
    });

    it('throws InvalidArgumentError for an invalid automationElementMode value', async () => {
        const driver = await createCalculatorSession();
        try {
            await expect(
                driver.executeScript('windows: cacheRequest', [{ automationElementMode: 'InvalidMode' }])
            ).rejects.toThrow();
        } finally {
            await quitSession(driver);
        }
    });
});
