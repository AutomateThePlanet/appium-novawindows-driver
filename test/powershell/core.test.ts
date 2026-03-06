/**
 * Unit tests for lib/powershell/core.ts (pwsh and pwsh$ tagged template literals)
 */
import { describe, it, expect } from 'vitest';
import { pwsh, pwsh$ } from '../../lib/powershell/core';

describe('pwsh', () => {
    it('wraps command in Invoke-Expression with base64 encoding', () => {
        const result = pwsh`Get-Process`;
        expect(result).toContain('Invoke-Expression');
        expect(result).toContain('FromBase64String');
        // Verify the base64-encoded content decodes to the command
        const base64Match = result.match(/FromBase64String\('([^']+)'\)/);
        expect(base64Match).not.toBeNull();
        const decoded = Buffer.from(base64Match![1], 'base64').toString('utf8');
        expect(decoded).toBe('Get-Process');
    });

    it('handles multi-line commands', () => {
        const result = pwsh`
            $a = 1
            $b = 2
        `;
        const base64Match = result.match(/FromBase64String\('([^']+)'\)/);
        expect(base64Match).not.toBeNull();
        const decoded = Buffer.from(base64Match![1], 'base64').toString('utf8');
        expect(decoded).toContain('$a = 1');
        expect(decoded).toContain('$b = 2');
    });

    it('interpolates string values', () => {
        const varName = '$rootElement';
        const result = pwsh`Write-Output ${varName}`;
        const base64Match = result.match(/FromBase64String\('([^']+)'\)/);
        const decoded = Buffer.from(base64Match![1], 'base64').toString('utf8');
        expect(decoded).toContain('$rootElement');
    });
});

describe('pwsh$', () => {
    it('returns a DeferredStringTemplate with base64 encoding on format', () => {
        const tpl = pwsh$`Write-Output ${0}`;
        const result = tpl.format('hello');
        expect(result).toContain('Invoke-Expression');
        expect(result).toContain('FromBase64String');
        const base64Match = result.match(/FromBase64String\('([^']+)'\)/);
        expect(base64Match).not.toBeNull();
        const decoded = Buffer.from(base64Match![1], 'base64').toString('utf8');
        expect(decoded).toContain('hello');
    });

    it('substitutes multiple positional arguments', () => {
        const tpl = pwsh$`${0}.Method(${1})`;
        const result = tpl.format('$element', '$condition');
        const base64Match = result.match(/FromBase64String\('([^']+)'\)/);
        const decoded = Buffer.from(base64Match![1], 'base64').toString('utf8');
        expect(decoded).toBe('$element.Method($condition)');
    });
});
