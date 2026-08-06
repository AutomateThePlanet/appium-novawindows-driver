import {resolve} from 'node:path';

import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup/mocks.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'lib'),
    },
  },
});
