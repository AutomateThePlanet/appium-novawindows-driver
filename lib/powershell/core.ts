import { $ } from '../util';

export class PSObject {
    private readonly command: string;

    constructor(command: string) {
        this.command = command;
    }

    toString(): string {
        return this.command;
    }
}

export function pwsh(strings: TemplateStringsArray, ...values: string[]): string {
    const command = strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ''), '');
    return /* ps1 */ `(Invoke-Expression -Command ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${btoa(command)}'))))`;
}

export function pwsh$(literals: TemplateStringsArray, ...substitutions: number[]) {
    const templateInstance = $(literals, ...substitutions);
    const defaultFormat = templateInstance.format.bind(templateInstance);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateInstance.format = (...args: any[]) => {
        const command = defaultFormat(...args);
        return /* ps1 */ `(Invoke-Expression -Command ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${btoa(command)}'))))`;
    };

    return templateInstance;
}