import { errors } from '@appium/base-driver';

const MAGIC_UNICODE_REPLACEMENT_CHAR = '\uF000';
const BEGIN_OF_STATEMENT_REGEX = '(?<![.:-])';

export class RegexItem {
    private value: string;

    constructor(value: string) {
        this.value = value;
    }

    build(): string {
        if (this.value.includes(MAGIC_UNICODE_REPLACEMENT_CHAR)) {
            throw new Error(`There are missing parameters in the regex.`);
        }

        return this.value;
    }

    toRegex(flags?: string): RegExp {
        return RegExp(this.build(), flags);
    }
}

export class VarArgsRegexMatcher extends RegexItem {
    constructor(value: RegexItem) {
        super(`((?:${value.build()})(?:\\s*,\\s*${value.build()})*)`);
    }
}

export class ConstructorRegexMatcher extends RegexItem {
    constructor(fullyQualifiedName: string, ...params: RegexItem[]) {
        assertCorrectNamespace(fullyQualifiedName);

        const sections = fullyQualifiedName.toLowerCase().split('.');
        const mainClass = sections.pop() ?? '';
        const parentClass = sections.pop() ?? '';
        sections.reverse(); // mutates the actual array

        let regexString = BEGIN_OF_STATEMENT_REGEX +
            `(?:(?:(?:(?:\\bnew\\s*)?)(?:(?:\\b${MAGIC_UNICODE_REPLACEMENT_CHAR}${parentClass}\\.)?(?:${mainClass})))` +
            `|(?:(?:(?:\\bnew-object\\s*)?)(?:\\[(?:${MAGIC_UNICODE_REPLACEMENT_CHAR}${parentClass}\\]::)?(?:${mainClass})))` +
            `|(?:(?:(?:\\[(?:(?:${MAGIC_UNICODE_REPLACEMENT_CHAR}${parentClass}\\.)?${mainClass}\\]::new)))))`;

        sections.forEach((section) => regexString = regexString.replaceAll(MAGIC_UNICODE_REPLACEMENT_CHAR, `(?:${MAGIC_UNICODE_REPLACEMENT_CHAR}${section}\\.)?`));

        super(`${regexString.replaceAll(MAGIC_UNICODE_REPLACEMENT_CHAR, '')}\\(\\s*${params.map((param) => param.build()).join('\\s*,\\s*')}\\s*\\)`);
    }
}

export class PropertyRegexMatcher extends RegexItem {
    constructor(namespace: string, ...properties: string[]) {
        assertCorrectNamespace(namespace);

        const sections = namespace.toLowerCase().split('.');
        const mainClass = sections.pop() ?? '';
        sections.reverse(); // mutates the actual array

        let regexString = `${BEGIN_OF_STATEMENT_REGEX}(?:\\b(?:(?:(?:${MAGIC_UNICODE_REPLACEMENT_CHAR}${mainClass}\\.)))|(?:(?:\\[${MAGIC_UNICODE_REPLACEMENT_CHAR}${mainClass}\\]::)))?`;
        sections.forEach((section) => regexString = regexString.replaceAll(MAGIC_UNICODE_REPLACEMENT_CHAR, `(?:${MAGIC_UNICODE_REPLACEMENT_CHAR}${section}\\.)?`));

        super(`${regexString.replaceAll(MAGIC_UNICODE_REPLACEMENT_CHAR, '')}(${properties.length > 0 ? `(?<![a-z-.])(?:(?:${properties.join(')|(?:')}))(?![a-z-.])` : '(?:\\b[a-z]+)'}(?![.-]))`.toLowerCase());
    }
}

export class StringRegexMatcher extends RegexItem {
    constructor() {
        super(`('(?:[^']*(?:''[^']*)?)*')`);
    }
}

function assertCorrectNamespace(namespace: string): void {
    if (!/[a-z.()?:]*/i.test(namespace)) {
        throw new errors.InvalidArgumentError('namespace parameter should consist of only alphabetical latin letters and dots.');
    }
}