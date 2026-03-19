// @ts-check

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import appiumConfig from '@appium/eslint-config-appium-ts';


export default defineConfig(
  eslint.configs.recommended,
  ...appiumConfig,
  {
    files: ['test/e2e/**/*.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
