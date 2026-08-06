import type {Orientation} from '@appium/types';

import type {NovaWindowsDriver} from '../driver';
import {getDisplayOrientation} from '../winapi/user32';

export function getOrientation(this: NovaWindowsDriver): Orientation {
  return getDisplayOrientation();
}
