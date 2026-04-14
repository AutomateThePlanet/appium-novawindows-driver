# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Appium driver for Windows UI automation (UWP, WinForms, WPF, Win32). Uses a compiled C# server (`NovaUIAutomationServer.exe`) per session to interact with the UIAutomation framework via NDJSON protocol over stdin/stdout, plus koffi FFI bindings to user32.dll for mouse/keyboard input.

## Commands

```bash
npm run build          # TypeScript compile (output: build/lib/)
npm run build:native   # Build C# server (output: native/win-x64/)
npm run build:all      # Build both C# server and TypeScript
npm run watch          # TypeScript watch mode
npm run lint           # ESLint (Appium TS config)
npm run test           # Unit tests (Vitest)
npm run test:e2e       # E2E tests (Windows only, requires real apps)

# Run a single test file
npx vitest run test/commands/element.test.ts

# Run tests matching a pattern
npx vitest run -t "pattern"
```

## Architecture

### Driver Entry Point

`lib/driver.ts` — `NovaWindowsDriver` extends `@appium/base-driver`. All commands from `lib/commands/` are bound to the driver instance in the constructor, giving each session its own C# server process and state. The driver communicates with the server via `this.sendCommand(method, params)`.

### C# UIAutomation Server

The driver spawns a compiled `NovaUIAutomationServer.exe` process per session. Commands are sent as NDJSON via stdin, responses read from stdout. Key details:

- `csharp/NovaUIAutomationServer/` — C# .NET 10 project, published as self-contained single-file exe
- `lib/server/client.ts` — `NovaUIAutomationClient` manages the server process lifecycle and NDJSON protocol
- `lib/server/protocol.ts` — TypeScript types for request/response/condition DTOs
- `lib/server/conditions.ts` — Builder functions for creating condition JSON objects
- `lib/server/converter-bridge.ts` — Bridges existing `-windows uiautomation` condition parser to JSON DTOs

See `docs/architecture.md` for the full architecture documentation.

### Command Modules

`lib/commands/` — organized by concern:
- `server-session.ts` — server lifecycle (`startServerSession`, `terminateServerSession`)
- `actions.ts` — W3C Actions API (pointer/key/wheel with Bezier easing)
- `element.ts` — element properties, text, value, focus
- `extension.ts` — custom `windows:` platform commands (UIAutomation patterns, clipboard, recording, etc.)
- `app.ts` — application launch/close, page source, screenshots, window management
- `screen-recorder.ts` — FFmpeg-based video capture

### Windows API Layer

`lib/winapi/user32.ts` — FFI via koffi to user32.dll for mouse movement, keyboard events, DPI awareness. Handles smooth pointer movement with Bezier easing curves.

### XPath

`lib/xpath/` — converts XPath 1.0 expressions to UIAutomation conditions (JSON DTOs) and executes them via the C# server. Uses `xpath-analyzer` for parsing.

### Element Location

- `lib/server/conditions.ts` — Builder functions (`propertyCondition`, `andCondition`, etc.) for creating JSON condition DTOs used by the C# server
- `lib/powershell/converter.ts` — Parses `-windows uiautomation` locator strings (PowerShell/C# syntax) into condition objects
- `lib/server/converter-bridge.ts` — Converts parsed conditions to JSON DTOs via a WeakMap registry

### Legacy PowerShell Support

The `lib/powershell/` directory is retained for:
- `converter.ts` — parsing `-windows uiautomation` condition strings (complex regex-based parser with extensive test coverage)
- `conditions.ts` — condition classes used by the converter and XPath engine (now also register JSON DTOs via converter-bridge)
- `types.ts` — UIAutomation property/control type enums (shared across the codebase)
- `common.ts` — PS type wrappers used by the converter for validation

The old `powershell.ts` (session management) and `functions.ts` (PS function definitions) have been removed.

## Testing

- **Unit tests** (`test/`) — Vitest with mocked sleep and path functions (`test/setup/mocks.ts`). Path alias `@` maps to `lib/`. Mock driver uses `sendCommand` (not `sendPowerShellCommand`).
- **E2E tests** (`test/e2e/`) — run on Windows with real C# server, single-forked (sequential). 30s test timeout, 60s hook timeout.

## Conventions

- Commit messages follow Angular/Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- Insecure features (`power_shell`, `modify_fs`) gate dangerous operations behind explicit capability flags
- CI runs lint+build on Ubuntu, unit tests on Windows (Node 24.x)
- Release workflow runs on Windows: builds the native exe, bundles it into the npm tarball, and publishes via `semantic-release`. End users do **not** need the .NET SDK. See `docs/release.md`.
- `scripts/postinstall.js` skips the native build when the prebuilt exe is present (published package) or on non-Windows platforms (CI lint jobs). It only runs `build:native` for developers cloning from git.
- The C# server requires .NET 10 SDK to build; the published exe is self-contained (no runtime needed on target machines)
