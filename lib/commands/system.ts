import { Orientation } from '@appium/types';
import { NovaWindowsDriver } from '../driver';
import { getDisplayOrientation } from '../winapi/user32';

export function getOrientation(this: NovaWindowsDriver): Orientation {
    return getDisplayOrientation();
}
