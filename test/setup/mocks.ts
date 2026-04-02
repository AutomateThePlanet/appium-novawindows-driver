/**
 * Global mocks for extension command tests.
 * Applied via vitest.config.ts setupFiles.
 */
import { vi } from 'vitest';

vi.mock('../../lib/util', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/util')>();
    return {
        ...actual,
        sleep: vi.fn().mockResolvedValue(undefined),
    };
});

vi.mock('node:path', () => ({
    normalize: (p: string) => p,
}));
