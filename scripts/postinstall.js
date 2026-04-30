/**
 * Postinstall hook for appium-novawindows-driver.
 *
 * When end users install the published npm package, the prebuilt
 * `native/win-x64/NovaUIAutomationServer.exe` is already bundled —
 * no native build is needed, and users do not need the .NET SDK.
 *
 * When developers install from a git checkout (no prebuilt exe),
 * this script invokes `npm run build:native` to produce the exe,
 * which requires the .NET 10 SDK.
 */

const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const prebuiltExe = join(__dirname, '..', 'native', 'win-x64', 'NovaUIAutomationServer.exe');

if (existsSync(prebuiltExe)) {
    console.log('[postinstall] Prebuilt NovaUIAutomationServer.exe found — skipping native build.');
    process.exit(0);
}

if (process.platform !== 'win32') {
    // The driver only runs on Windows. If installed on another platform
    // (e.g., a CI lint job on Ubuntu), don't try to build the exe —
    // just let the install complete.
    console.log('[postinstall] Non-Windows platform detected — skipping native build.');
    process.exit(0);
}

console.log('[postinstall] No prebuilt exe found — building native server (requires .NET 10 SDK)...');

try {
    execSync('npm run build:native', { stdio: 'inherit' });
} catch (err) {
    console.error('[postinstall] Native build failed. Install the .NET 10 SDK and run `npm run build:native` manually.');
    process.exit(1);
}
