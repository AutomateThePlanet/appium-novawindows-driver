import * as actions from './actions';
import * as app from './app';
import * as contexts from './contexts';
import * as device from './device';
import * as element from './element';
import * as extension from './extension';
import * as powershell from './powershell';
import * as system from './system';

const commands = {
  ...actions,
  ...powershell,
  ...element,
  ...extension,
  ...system,
  ...device,
  ...app,
  ...contexts,
  // add the rest of the commands here
};

type Commands = {
  [key in keyof typeof commands]: (typeof commands)[key];
};

declare module '../driver' {
  interface NovaWindowsDriver extends Commands {}
}

export default commands;
