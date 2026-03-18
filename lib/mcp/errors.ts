export function formatError(err: unknown): string {
    if (err instanceof Error) {return `${err.constructor.name}: ${err.message}`;}
    return String(err);
}
