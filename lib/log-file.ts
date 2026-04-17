import { createWriteStream, mkdirSync, WriteStream } from 'node:fs';
import { dirname, join } from 'node:path';

type LogLike = {
    [level: string]: unknown;
};

type LogFn = (...args: unknown[]) => void;

export type LogFileMirror = {
    path: string;
    detach: () => void;
};

const DEFAULT_SUBDIR = 'novawindows-driver';
const MIRRORED_LEVELS = ['silly', 'verbose', 'debug', 'info', 'http', 'warn', 'error'] as const;

function resolveLogPath(value: unknown): string {
    let dir: string | undefined;
    if (typeof value === 'string' && value.length > 0) {
        if (value.endsWith('\\') || value.endsWith('/')) {
            dir = value;
        } else {
            return value;
        }
    }
    if (!dir) {
        const base = process.env.LOCALAPPDATA
            ?? join(process.env.USERPROFILE ?? process.env.HOME ?? '.', 'AppData', 'Local');
        dir = join(base, DEFAULT_SUBDIR);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return join(dir, `session-${timestamp}.log`);
}

function formatArg(arg: unknown): string {
    if (arg instanceof Error) {
        return arg.stack ?? `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'string') {
        return arg;
    }
    try {
        return JSON.stringify(arg);
    } catch {
        return String(arg);
    }
}

function writeLine(stream: WriteStream, level: string, args: unknown[]): void {
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${args.map(formatArg).join(' ')}\n`;
    stream.write(line);
}

export function attachLogFileMirror(log: LogLike, value: unknown): LogFileMirror {
    const path = resolveLogPath(value);
    mkdirSync(dirname(path), { recursive: true });
    const stream = createWriteStream(path, { encoding: 'utf8', flags: 'a' });

    const restorers: Array<() => void> = [];
    for (const level of MIRRORED_LEVELS) {
        const original = log[level];
        if (typeof original !== 'function') continue;
        const originalFn = original as LogFn;
        const hadOwn = Object.prototype.hasOwnProperty.call(log, level);
        const wrapped: LogFn = (...args: unknown[]) => {
            writeLine(stream, level, args);
            return originalFn.apply(log, args);
        };
        log[level] = wrapped;
        restorers.push(() => {
            if (hadOwn) {
                log[level] = originalFn;
            } else {
                delete log[level];
            }
        });
    }

    writeLine(stream, 'info', [`NovaWindows driver log mirror attached at ${path}`]);

    let detached = false;
    return {
        path,
        detach: () => {
            if (detached) return;
            detached = true;
            for (const restore of restorers) restore();
            stream.end();
        },
    };
}
