/**
 * Global mocks for extension command tests.
 * Applied via vitest.config.ts setupFiles.
 */
import {vi} from 'vitest';

import type * as UtilModule from '../../lib/util';

vi.mock('../../lib/util', async (importOriginal) => {
  const actual = await importOriginal<typeof UtilModule>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('node:path', () => ({
  normalize: (p: string) => p,
}));
