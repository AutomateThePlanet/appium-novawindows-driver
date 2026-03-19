import { normalize } from 'node:path';
import { errors } from '@appium/base-driver';
import { NovaWindowsDriver } from '../driver';
import { PSString, pwsh, pwsh$ } from '../powershell';
import { MODIFY_FS_FEATURE } from '../constants';
import { isUwpAppId, sleep } from '../util';

const TERMINATE_POLL_INTERVAL_MS = 200;
const TERMINATE_TIMEOUT_MS = 10_000;

const GET_SYSTEM_TIME_COMMAND = pwsh$ /* ps1 */ `(Get-Date).ToString(${0})`;
const ISO_8061_FORMAT = 'yyyy-MM-ddTHH:mm:sszzz';

export async function getDeviceTime(this: NovaWindowsDriver, _sessionId?: string, format?: string): Promise<string> {
    const fmt = format ? new PSString(format).toString() : `'${ISO_8061_FORMAT}'`;
    return await this.sendPowerShellCommand(GET_SYSTEM_TIME_COMMAND.format(fmt));
}

// ─── File operations ─────────────────────────────────────────────────────────

const PUSH_FILE_COMMAND = pwsh$ /* ps1 */ `
    $path = ${0}
    $parentDir = [IO.Path]::GetDirectoryName($path)
    if ($parentDir) { [IO.Directory]::CreateDirectory($parentDir) | Out-Null }
    [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String(${1}))
`;

export async function pushFile(this: NovaWindowsDriver, path: string, data: string): Promise<void> {
    this.assertFeatureEnabled(MODIFY_FS_FEATURE);
    if (!path) {throw new errors.InvalidArgumentError("'path' must be provided.");}
    if (!data) {throw new errors.InvalidArgumentError("'data' must be provided.");}
    await this.sendPowerShellCommand(
        PUSH_FILE_COMMAND.format(new PSString(path).toString(), new PSString(data).toString())
    );
}

const PULL_FILE_COMMAND = pwsh$ /* ps1 */ `[Convert]::ToBase64String([IO.File]::ReadAllBytes(${0}))`;

export async function pullFile(this: NovaWindowsDriver, path: string): Promise<string> {
    this.assertFeatureEnabled(MODIFY_FS_FEATURE);
    if (!path) {throw new errors.InvalidArgumentError("'path' must be provided.");}
    return await this.sendPowerShellCommand(PULL_FILE_COMMAND.format(new PSString(path).toString()));
}

const PULL_FOLDER_COMMAND = pwsh$ /* ps1 */ `
    $srcPath = ${0}
    $tempZip = [IO.Path]::GetTempFileName() + '.zip'
    try {
        Compress-Archive -LiteralPath $srcPath -DestinationPath $tempZip -ErrorAction Stop
        [Convert]::ToBase64String([IO.File]::ReadAllBytes($tempZip))
    } finally {
        if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
    }
`;

export async function pullFolder(this: NovaWindowsDriver, path: string): Promise<string> {
    this.assertFeatureEnabled(MODIFY_FS_FEATURE);
    if (!path) {throw new errors.InvalidArgumentError("'path' must be provided.");}
    return await this.sendPowerShellCommand(PULL_FOLDER_COMMAND.format(new PSString(path).toString()));
}

// ─── Keyboard ────────────────────────────────────────────────────────────────

const HIDE_KEYBOARD_COMMAND = pwsh /* ps1 */ `
    $kb = Get-Process -Name 'TabTip','TextInputHost' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $kb) { return }
    $kbEl = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
            $kb.Id
        )
    )
    if ($null -ne $kbEl) {
        try {
            $kbEl.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()
        } catch {
            Stop-Process -Id $kb.Id -Force -ErrorAction SilentlyContinue
        }
    } else {
        Stop-Process -Id $kb.Id -Force -ErrorAction SilentlyContinue
    }
`;

export async function hideKeyboard(
    this: NovaWindowsDriver,
    _strategy?: string,
    _key?: string,
    _keyCode?: string,
    _keyName?: string
): Promise<void> {
    await this.sendPowerShellCommand(HIDE_KEYBOARD_COMMAND);
}

const IS_KEYBOARD_SHOWN_COMMAND = pwsh /* ps1 */ `
    $kb = Get-Process -Name 'TabTip','TextInputHost' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $kb) { Write-Output 'false'; return }
    $kbEl = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
            $kb.Id
        )
    )
    if ($null -eq $kbEl) { Write-Output 'false'; return }
    if ($kbEl.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::IsOffscreenProperty)) {
        Write-Output 'false'
    } else {
        Write-Output 'true'
    }
`;

export async function isKeyboardShown(this: NovaWindowsDriver): Promise<boolean> {
    const result = await this.sendPowerShellCommand(IS_KEYBOARD_SHOWN_COMMAND);
    return result.trim().toLowerCase() === 'true';
}

// ─── App management ──────────────────────────────────────────────────────────

export async function activateApp(
    this: NovaWindowsDriver,
    appId: string,
    _options?: Record<string, unknown>
): Promise<void> {
    if (!appId) {throw new errors.InvalidArgumentError("'appId' or 'bundleId' must be provided.");}

    const isUwp = isUwpAppId(appId);
    if (isUwp) {
        await this.changeRootElement(appId);
        return;
    }

    const normalizedPath = normalize(appId);
    const parts = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
    const executable = parts[parts.length - 1];
    const processName = (executable.endsWith('.exe') ? executable.slice(0, -4) : executable).replace(/'/g, "''");

    const pidResult = await this.sendPowerShellCommand(
        /* ps1 */ `(Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1).Id`
    );
    const existingPid = Number(pidResult.trim());

    if (!isNaN(existingPid) && existingPid > 0) {
        const handleResult = await this.sendPowerShellCommand(
            /* ps1 */ `(Get-Process -Id ${existingPid} -ErrorAction SilentlyContinue).MainWindowHandle`
        );
        const handle = Number(handleResult.trim());
        if (!isNaN(handle) && handle > 0) {
            await this.changeRootElement(handle);
            return;
        }
        await this.attachToApplicationWindow([existingPid]);
        return;
    }

    await this.changeRootElement(appId);
}

export async function terminateApp(
    this: NovaWindowsDriver,
    appId: string,
    _options?: Record<string, unknown>
): Promise<boolean> {
    if (!appId) {throw new errors.InvalidArgumentError("'appId' or 'bundleId' must be provided.");}

    const isUwp = isUwpAppId(appId);

    let killed: boolean;
    if (isUwp) {
        const safeFamily = new PSString(appId.split('!')[0]).toString();
        const checkResult = await this.sendPowerShellCommand(
            /* ps1 */ `
            $pkg = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq ${safeFamily} }
            if ($null -eq $pkg) { Write-Output 'none'; return }
            $procs = Get-Process | Where-Object { $_.Path -like ($pkg.InstallLocation + '\\*') }
            if (@($procs).Count -eq 0) { Write-Output 'none' } else { ($procs | Select-Object -ExpandProperty Id) -join ',' }
            `
        );
        const pids = checkResult.trim();
        if (pids === 'none' || pids === '') {
            await this.sendPowerShellCommand(/* ps1 */ `$rootElement = $null`).catch(() => {});
            return false;
        }
        await this.sendPowerShellCommand(
            /* ps1 */ `Stop-Process -Id ${pids} -Force -ErrorAction SilentlyContinue`
        );

        const deadline = Date.now() + TERMINATE_TIMEOUT_MS;
        killed = false;
        while (Date.now() < deadline) {
            await sleep(TERMINATE_POLL_INTERVAL_MS);
            const stillRunning = await this.sendPowerShellCommand(
                /* ps1 */ `
                $pkg = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq ${safeFamily} }
                if ($null -eq $pkg) { 'false' } else { ($null -ne (Get-Process | Where-Object { $_.Path -like ($pkg.InstallLocation + '\\*') } | Select-Object -First 1)).ToString().ToLower() }
                `
            );
            if (stillRunning.trim().toLowerCase() !== 'true') {
                killed = true;
                break;
            }
        }
    } else {
        const normalizedPath = normalize(appId);
        const parts = normalizedPath.toLowerCase().split('\\').flatMap((x) => x.split('/'));
        const executable = parts[parts.length - 1];
        const processName = (executable.endsWith('.exe') ? executable.slice(0, -4) : executable).replace(/'/g, "''");

        const checkResult = await this.sendPowerShellCommand(
            /* ps1 */ `$procs = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue; if (@($procs).Count -eq 0) { Write-Output 'none' } else { ($procs | Select-Object -ExpandProperty Id) -join ',' }`
        );
        const pids = checkResult.trim();
        if (pids === 'none' || pids === '') {
            await this.sendPowerShellCommand(/* ps1 */ `$rootElement = $null`).catch(() => {});
            return false;
        }
        await this.sendPowerShellCommand(
            /* ps1 */ `Stop-Process -Id ${pids} -Force -ErrorAction SilentlyContinue`
        );

        const deadline = Date.now() + TERMINATE_TIMEOUT_MS;
        killed = false;
        while (Date.now() < deadline) {
            await sleep(TERMINATE_POLL_INTERVAL_MS);
            const stillRunning = await this.sendPowerShellCommand(
                /* ps1 */ `(Get-Process -Name '${processName}' -ErrorAction SilentlyContinue).Count -gt 0`
            );
            if (stillRunning.trim().toLowerCase() !== 'true') {
                killed = true;
                break;
            }
        }
    }

    await this.sendPowerShellCommand(/* ps1 */ `$rootElement = $null`).catch(() => {});
    return killed;
}

export async function isAppInstalled(this: NovaWindowsDriver, appId: string): Promise<boolean> {
    if (!appId) {throw new errors.InvalidArgumentError("'appId' or 'bundleId' must be provided.");}

    const isUwp = isUwpAppId(appId);
    if (isUwp) {
        const safeFamily = new PSString(appId.split('!')[0]).toString();
        const result = await this.sendPowerShellCommand(
            /* ps1 */ `if (@(Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq ${safeFamily} }).Count -gt 0) { 'true' } else { 'false' }`
        );
        return result.trim().toLowerCase() === 'true';
    }

    const hasPathSeparator = appId.includes('/') || appId.includes('\\');
    if (hasPathSeparator) {
        const safePath = new PSString(appId).toString();
        const result = await this.sendPowerShellCommand(
            /* ps1 */ `if (Test-Path -LiteralPath ${safePath}) { 'true' } else { 'false' }`
        );
        return result.trim().toLowerCase() === 'true';
    }

    // Bare process name — search PATH
    const safeName = new PSString(appId).toString();
    const result = await this.sendPowerShellCommand(
        /* ps1 */ `if (Get-Command -Name ${safeName} -ErrorAction SilentlyContinue) { 'true' } else { 'false' }`
    );
    return result.trim().toLowerCase() === 'true';
}

// command: 'installApp'
// payloadParams: { required: ['appPath'], optional: ['options'] }

// command: 'removeApp'
// payloadParams: { required: [['appId'], ['bundleId']], optional: ['options'] }
