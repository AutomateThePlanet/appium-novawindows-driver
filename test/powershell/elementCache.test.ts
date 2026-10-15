import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { AutomationElement, FoundAutomationElement } from '../../lib/powershell/elements';

const executable = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const available = !spawnSync(executable, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0']).error;

// Exercise the actual generated command with native PowerShell dictionary/pipeline semantics.
// The stand-in exposes only the UIA properties used here, so no interactive desktop is needed.
const setup = `
$ErrorActionPreference = 'Stop'
class AutomationElement {
    static [string] $RuntimeIdProperty = 'runtimeid'
    static [string] $NameProperty = 'name'
}
function New-TestElement([int[]]$id, [string]$name) {
    $element = [pscustomobject]@{ Id = $id; Name = $name; Unavailable = $false }
    $element | Add-Member ScriptMethod GetCurrentPropertyValue {
        param($property)
        if ($property -eq 'runtimeid') { return $this.Id }
        if ($this.Unavailable) { throw 'ElementNotAvailableException' }
        return $this.Name
    }
    return $element
}
$elementTable = New-Object 'System.Collections.Generic.Dictionary[string,object]'
`;

function run(script: string): unknown {
    const encoded = Buffer.from(setup + script, 'utf16le').toString('base64');
    const result = spawnSync(executable, [
        '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded,
    ], { encoding: 'utf8' });
    if (result.error) { throw result.error; }
    if (result.status !== 0) { throw new Error(result.stderr || `PowerShell exited with status ${result.status}`); }
    return JSON.parse(result.stdout.trim());
}

describe.skipIf(!available)('discovered element cache', () => {
    it('replaces an unavailable object when a later lookup reuses its RuntimeId', () => {
        const discover = AutomationElement.automationRoot.buildCommand();
        const readExistingHandle = new FoundAutomationElement('42.66384.4.6.1.4').buildGetPropertyCommand('name');
        expect(run(`
$rootElement = New-TestElement @(42,66384,4,6,1,4) 'retired'
$first = ${discover}
$rootElement.Unavailable = $true
$rootElement = New-TestElement @(42,66384,4,6,1,4) 'current'
$second = ${discover}
@{ ids = @($first, $second); name = (${readExistingHandle}); count = $elementTable.Count } | ConvertTo-Json -Compress
`)).toEqual({ ids: ['42.66384.4.6.1.4', '42.66384.4.6.1.4'], name: 'current', count: 1 });
    });

    it('replaces every rediscovered object while preserving other handles, null filtering and result order', () => {
        const discover = new AutomationElement('@($null, $first, $second, $null)').buildCommand();
        const read = (id: string) => new FoundAutomationElement(id).buildGetPropertyCommand('name');
        expect(run(`
$first = New-TestElement @(42,1) 'old-first'
$second = New-TestElement @(42,2) 'old-second'
$unrelated = New-TestElement @(42,3) 'untouched'
$elementTable.Add('42.3', $unrelated)
$initial = @(${discover})
$first.Unavailable = $true
$second.Unavailable = $true
$first = New-TestElement @(42,1) 'new-first'
$second = New-TestElement @(42,2) 'new-second'
$ids = @(${discover})
@{ ids = $ids; names = @((${read('42.1')}), (${read('42.2')}), (${read('42.3')})); count = $elementTable.Count } | ConvertTo-Json -Compress
`)).toEqual({ ids: ['42.1', '42.2'], names: ['new-first', 'new-second', 'untouched'], count: 3 });
    });
});
