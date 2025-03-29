import * as actions from './actions';
import * as powershell from './powershell';
import * as element from './element';
import * as extension from './extension';
import * as device from './device';
import * as system from './system';
import * as app from './app';

const commands = {
    ...actions,
    ...powershell,
    ...element,
    ...extension,
    ...system,
    ...device,
    ...app,
    // add the rest of the commands here
};

type Commands = {
    [key in keyof typeof commands]: typeof commands[key];
};

declare module '../driver' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface NovaWindowsDriver extends Commands {}
}

export default commands;