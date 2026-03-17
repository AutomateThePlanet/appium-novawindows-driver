# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile TypeScript to build/
npm run watch          # Watch mode compilation
npm run lint           # ESLint validation
npm run test           # Unit tests (Vitest)
npm run test:e2e       # E2E tests (requires Windows + Appium setup)
npm run mcp:start      # Launch MCP server
```

Run a single test file:
```bash
npx vitest run test/path/to/file.test.ts
```

## Architecture

This is an **Appium driver** for Windows desktop UI automation. It exposes two interfaces:

1. **Appium WebDriver API** — used by test frameworks (Selenium-style)
2. **MCP Server** (`lib/mcp/`) — exposes 30+ tools over Model Context Protocol for AI agent use

### Core driver flow

`lib/driver.ts` — `NovaWindowsDriver` extends `BaseDriver`. On `createSession()`, it starts a persistent PowerShell process that remains open for the session lifetime. All UI Automation operations are executed by sending PowerShell commands through this process and reading stdout.

### Element finding

Element searches go through `lib/powershell/` which builds PowerShell scripts using Windows UI Automation APIs. The driver converts Appium locator strategies (XPath, accessibility id, class name, etc.) into `UIA3` conditions via `lib/powershell/conditions.ts` and `converter.ts`. XPath is evaluated in `lib/xpath/` against the live UI Automation tree.

### Input simulation

Low-level mouse and keyboard events use native Windows API bindings in `lib/winapi/user32.ts` via the `koffi` FFI library. Higher-level action sequences (W3C Actions) are handled in `lib/commands/actions.ts` which translates WebDriver action chains into `user32` calls with optional easing/delay curves.

### Commands

All driver commands live in `lib/commands/` and are mixed into the driver class via `lib/commands/index.ts`. Key files:
- `actions.ts` — mouse, keyboard, wheel via W3C ActionSequence
- `element.ts` — element finding and attribute retrieval
- `app.ts` — app launch/close/window management
- `extension.ts` — `executeScript()` platform-specific commands
- `powershell.ts` — raw PowerShell execution
- `screen-recorder.ts` — FFmpeg-based recording

### MCP server

`lib/mcp/` is an independent MCP server binary (`novawindows-mcp`). It auto-starts and manages an Appium server process, creates WebdriverIO sessions, and exposes tools grouped by domain in `lib/mcp/tools/`. The server communicates via stdio using the `@modelcontextprotocol/sdk`.

### TypeScript paths

`@/` resolves to `lib/` (configured in both `tsconfig.json` and Vitest configs).

## Key capabilities

- `platformName`: `"Windows"`, `automationName`: `"DesktopDriver"`
- Supported locator strategies: `xpath`, `accessibility id`, `id`, `name`, `class name`, `tag name`, `-windows uiautomation`
- Custom `executeScript()` commands listed in README.md
- Prerun/postrun PowerShell scripts via session capabilities
