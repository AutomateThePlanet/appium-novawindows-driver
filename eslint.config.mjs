// @ts-check

import eslint from '@eslint/js';
import { config, configs } from 'typescript-eslint';
import appiumConfig from '@appium/eslint-config-appium-ts';


export default config(
  ...appiumConfig,
  eslint.configs.recommended,
  configs.recommended,
);
