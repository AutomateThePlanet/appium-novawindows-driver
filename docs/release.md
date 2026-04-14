# Release & Publishing

This document describes how `appium-novawindows-driver` is packaged and published to npm, and what you need to know as a maintainer.

## Overview

The driver ships **two compiled artifacts** to npm:

1. **TypeScript → JavaScript** — the Node.js driver (`build/lib/`)
2. **C# → native win-x64 exe** — the UIAutomation server (`native/win-x64/NovaUIAutomationServer.exe`)

The native exe is a **self-contained .NET 10 single-file executable** (~165 MB). Because it is bundled in the published package, end users do **not** need the .NET SDK to install the driver — they only need Node.js and Windows.

## Package layout (what ships to npm)

The `files` field in `package.json` whitelists exactly what gets published:

```json
"files": [
  "build/lib/**/*",
  "native/win-x64/NovaUIAutomationServer.exe",
  "scripts/postinstall.js",
  "LICENSE",
  "README.md",
  "CHANGELOG.md"
]
```

Everything else (`csharp/` source, `test/`, `docs/`, `examples/`, `lib/` TS sources, config files, etc.) is excluded.

**Approximate size:** 67 MB compressed, 165 MB unpacked.

## Postinstall behavior

`scripts/postinstall.js` runs after `npm install` and decides whether to rebuild the native exe:

| Scenario | Action |
|---|---|
| End user installs the published package | Prebuilt exe is present → **skip build** |
| Install on non-Windows (e.g., Linux CI lint job) | Driver only runs on Windows → **skip build** |
| Developer clones the repo and runs `npm install` | No prebuilt exe → **run `npm run build:native`** (requires .NET 10 SDK) |

This means `appium driver install novawindows` works out of the box on any Windows machine, while contributors can still iterate on the C# server locally.

## GitHub Actions workflows

Three workflows live in `.github/workflows/`:

| Workflow | Trigger | Runner | Purpose |
|---|---|---|---|
| `lint-build.yml` | PR to `main` / `develop` | `ubuntu-latest` | Lint + TypeScript build |
| `unit-test.yml` | PR to `main` / `develop` | `windows-latest` | Builds native + runs Vitest unit tests |
| `release.yml` | Push to `main` / `develop`, or manual dispatch | `windows-latest` | Builds native, publishes via semantic-release |

### Why `release.yml` runs on Windows

The C# server is published as a **win-x64 self-contained** executable (targeting `win-x64` RID with `PublishSingleFile=true`). Building it on Linux would require cross-compilation setup and produces a Windows binary either way — so we just run the whole pipeline on `windows-latest`. This also lets us `npm run build:native` directly with `actions/setup-dotnet@v4`.

### Release workflow steps

1. **Checkout** + **setup Node.js 24.x** + **setup .NET 10.x**
2. **`npm install --ignore-scripts`** — install deps without triggering `postinstall` (we build native explicitly next)
3. **`npm run build:native`** — produces `native/win-x64/NovaUIAutomationServer.exe`
4. **`npm run build`** — compiles TypeScript to `build/lib/`
5. **`npm run lint`** — ESLint check
6. **Prune dev/peer deps** + **`npm shrinkwrap`** — creates a locked dependency manifest for the published package
7. **`npx semantic-release`** — analyzes commits, determines version bump, updates `CHANGELOG.md`, publishes to npm, creates a GitHub release

The `--ignore-scripts` flag on every `npm install` prevents the postinstall hook from firing a second time (the native exe is already built in step 3).

## Required secrets

Set these in the GitHub repo's **Settings → Environments → Release**:

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | npm publish auth (generate from npmjs.com → Access Tokens → Automation) |
| `GITHUB_TOKEN` | Auto-provided by Actions — no setup needed |

## Versioning (semantic-release)

Configured in `.releaserc`. Uses Conventional Commits with the Angular preset:

| Commit type | Release bump |
|---|---|
| `feat:` | minor (1.x.0) |
| `fix:` | patch (1.0.x) |
| `perf:` | patch |
| `chore:` | patch (custom rule — see `.releaserc`) |
| `BREAKING CHANGE:` in body | major (x.0.0) |

`docs:`, `test:`, `style:`, `build:`, `ci:`, `refactor:` are tracked in the changelog but do not trigger a release on their own.

### Branches

- **`main`** → stable releases (`1.4.0`, `1.4.1`, etc.)
- **`develop`** → prerelease channel (`1.5.0-preview.1`, etc.) — published with the `preview` npm dist-tag

## Local release dry-run

To verify what would be published without actually publishing:

```bash
npm run build:all          # Build native + TypeScript
npm pack --dry-run         # Preview tarball contents (no file created)
npm pack                   # Create the .tgz for inspection
```

To test an install from the tarball on a fresh machine:

```bash
appium driver install --source=local /path/to/repo
# or, after npm pack:
appium driver install --source=npm /path/to/appium-novawindows-driver-x.y.z.tgz
```

## Troubleshooting

**`npm install` fails on a fresh Windows machine** — check that the prebuilt exe is present in `native/win-x64/`. If you cloned from git (where it's gitignored), you need .NET 10 SDK to run `npm run build:native`.

**Package is much smaller than ~67 MB** — the native exe was not included. Check that `files` in `package.json` lists `native/win-x64/NovaUIAutomationServer.exe` and that the file actually exists at pack time.

**`semantic-release` says "no release needed"** — no commits since the last release match a release-triggering type. Add a `feat:`, `fix:`, or `chore:` commit, or dispatch manually.

**Native exe won't start on the end user's machine** — the exe is self-contained (no .NET runtime needed), but requires Windows 10/11 x64. ARM64 and 32-bit Windows are not supported by the current publish target.
