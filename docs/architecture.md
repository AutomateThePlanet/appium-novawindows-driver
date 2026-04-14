# Architecture: Native C# UIAutomation Server

## Overview

As of v2.0, NovaWindows Driver uses a **compiled C# server** (`NovaUIAutomationServer.exe`) instead of a PowerShell child process to interact with the Windows UIAutomation framework. This change eliminates antivirus false positives, improves performance, and provides structured debugging capabilities.

## Why the Change

The previous PowerShell-based architecture triggered antivirus heuristics (BitDefender, Windows Defender, etc.) because it used patterns common to malware:

- **Persistent `powershell.exe` process** reading commands from stdin (`-NoExit -Command -`)
- **Base64-encoded commands** executed via `Invoke-Expression` + `FromBase64String`
- **Dynamic assembly loading** via `Add-Type`

These are legitimate techniques for automation, but indistinguishable from command-and-control (C2) malware patterns at the behavioral level. No amount of AV exclusion rules could fully solve this.

## New Architecture

```
┌──────────────────────┐         stdin (NDJSON)        ┌──────────────────────────┐
│                      │  ──────────────────────────►  │                          │
│   Node.js Driver     │                               │  NovaUIAutomationServer  │
│   (TypeScript)       │  ◄──────────────────────────  │  (C# / .NET 10)         │
│                      │         stdout (NDJSON)       │                          │
└──────────────────────┘                               └──────────────────────────┘
        │                                                       │
        │ koffi FFI                                             │ Direct .NET API calls
        ▼                                                       ▼
   user32.dll                                          System.Windows.Automation
   (mouse/keyboard)                                    (UIAutomation framework)
```

### Components

**Node.js Driver (`lib/`)** — TypeScript, runs inside Appium. Handles:
- Appium protocol (WebDriver commands)
- W3C Actions API (pointer/key/wheel via koffi FFI to user32.dll)
- XPath parsing and evaluation
- Session lifecycle
- Communication with the C# server via `NovaUIAutomationClient`

**C# Server (`csharp/NovaUIAutomationServer/`)** — Compiled .NET executable. Handles:
- All UIAutomation API calls (FindFirst, FindAll, GetProperty, patterns)
- Element table management (RuntimeId → AutomationElement mapping)
- Page source generation (XML tree walk)
- Screenshots (GDI+ screen capture)
- Clipboard operations (WPF Clipboard API)
- Process management (start/stop/enumerate)
- File system operations (delete file/folder)
- PowerShell script execution (isolated one-shot processes for prerun/postrun)

### Communication Protocol

The driver and server communicate via **newline-delimited JSON (NDJSON)** over stdin/stdout:

**Request:**
```json
{"id": 1, "method": "findElement", "params": {"scope": "descendants", "condition": {"type": "property", "property": "AutomationId", "value": "btnOK"}, "contextElementId": null}}
```

**Success response:**
```json
{"id": 1, "result": "42.5705764.4.35", "duration_ms": 12}
```

**Error response:**
```json
{"id": 1, "error": {"code": "ElementNotFound", "message": "No element matching condition"}, "duration_ms": 5}
```

Server logs go to **stderr** (never stdout), ensuring clean protocol separation.

### Condition Schema

UIAutomation conditions are represented as recursive JSON objects:

```typescript
type Condition =
  | { type: "property"; property: string; value: string | number | boolean | number[] }
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "not"; condition: Condition }
  | { type: "true" }
  | { type: "false" };
```

This replaces the previous approach of building PowerShell condition strings.

## Server Commands

The server supports 40+ commands organized by category:

| Category | Commands |
|----------|----------|
| Session | `init`, `setRootElement`, `setRootElementNull`, `setRootElementFromHandle`, `setRootElementFromElementId`, `checkRootElementNotNull`, `dispose` |
| Find | `findElement`, `findElements`, `findElementFocused`, `saveRootElementToTable`, `lookupElement` |
| Element | `getProperty`, `getTagName`, `getText`, `getRect`, `getRootRect`, `setFocus`, `setElementValue`, `getElementValue`, `sendKeys` |
| Patterns | `invokeElement`, `expandElement`, `collapseElement`, `toggleElement`, `getToggleState`, `setElementRangeValue`, `scrollElementIntoView`, `selectElement`, `addToSelection`, `removeFromSelection`, `isElementSelected`, `isMultipleSelect`, `getSelectedElements` |
| Window | `maximizeWindow`, `minimizeWindow`, `restoreWindow`, `closeWindow`, `moveWindow`, `resizeWindow` |
| System | `getPageSource`, `getScreenshot`, `getElementScreenshot` |
| Clipboard | `getClipboardText`, `setClipboardText`, `getClipboardImage`, `setClipboardImage` |
| Process | `startProcess`, `getProcessIds`, `stopProcess` |
| FileSystem | `deleteFile`, `deleteFolder` |
| Script | `executePowerShellScript` (isolated one-shot) |
| Cache | `setCacheRequestTreeFilter`, `setCacheRequestTreeScope`, `setCacheRequestAutomationElementMode` |
| Debug | `debug:ping`, `debug:inspectElementTable` |

## Debugging Features

### Structured Logging

Every command is logged to stderr with timestamps and duration:
```
[22:03:16.031] [1] -> debug:ping
[22:03:16.031] [1] <- debug:ping (45ms)
```

Commands taking >500ms are logged with a `SLOW` warning.

### Session Recording

Pass `--record <path>` to the server to write all request/response pairs to an NDJSON file. Users can send this file for issue reproduction.

### Element Table Inspection

The `debug:inspectElementTable` command returns all cached elements with their name, control type, and alive status:
```json
[{"runtimeId": "42.23.1", "name": "OK", "controlType": "Button", "isAlive": true}]
```

### Debug Ping

The `debug:ping` command returns server health:
```json
{"status": "pong", "uptimeSeconds": 120, "elementCount": 15, "hasRootElement": true}
```

## Build

### Prerequisites

- .NET 10 SDK (for building the C# server)
- Node.js 24.x (for the TypeScript driver)

### Commands

```bash
npm run build:native   # Build C# server → native/win-x64/NovaUIAutomationServer.exe
npm run build          # Build TypeScript → build/lib/
npm run build:all      # Build both
npm run test           # Unit tests (Vitest)
```

The C# server is published as a self-contained single-file executable (~165MB). No .NET runtime is required on the target machine.

For details on how the driver is packaged and published to npm (GitHub Actions workflow, postinstall behavior, required secrets, semantic-release configuration), see [release.md](release.md).

### Project Structure

```
csharp/NovaUIAutomationServer/
├── Program.cs                    # Entry point (STA thread for COM/UIAutomation)
├── Protocol/
│   ├── Message.cs                # Request/Response JSON types
│   └── ErrorCodes.cs             # Machine-readable error codes
├── Server/
│   ├── JsonRpcServer.cs          # stdin/stdout message loop
│   ├── CommandDispatcher.cs      # Method name → handler routing
│   └── ConditionBuilder.cs       # JSON condition → UIAutomation Condition
├── State/
│   └── SessionState.cs           # ElementTable, RootElement, CacheRequest
├── Commands/
│   ├── SessionCommands.cs        # init, setRootElement, dispose
│   ├── FindCommands.cs           # findElement/findElements (all tree scopes)
│   ├── ElementCommands.cs        # getProperty, getText, getRect, setFocus
│   ├── PatternCommands.cs        # invoke, toggle, expand, window patterns
│   ├── PageSourceCommands.cs     # XML tree walk
│   ├── ScreenshotCommands.cs     # GDI+ screen capture
│   ├── ClipboardCommands.cs      # WPF Clipboard (STA thread)
│   ├── ProcessCommands.cs        # start/stop/enumerate processes
│   ├── FileSystemCommands.cs     # delete file/folder
│   └── DiagnosticCommands.cs     # ping, inspectElementTable
└── Logging/
    └── SessionRecorder.cs        # NDJSON session recording
```

## App Launch Flow

When the driver opens an application (`changeRootElement` in `lib/commands/app.ts`), it must bridge from a process launch to a UIAutomation element. This involves multiple stages that each poll for state changes:

```
changeRootElement
│
├─ startProcess          Launch the app (explorer.exe for UWP, direct for classic)
├─ sleep                 Initial wait for the process to register (200ms default,
│                        or `ms:waitForAppLaunch` seconds if set)
│
└─ outer retry loop      (10 attempts for UWP, 30 for classic)
   │
   ├─ getProcessIds      Get OS process IDs for the app
   │
   └─ attachToApplicationWindow
      │
      ├─ waitForNewWindow        Poll EnumWindows for a visible Win32 window
      │                          belonging to the process (200ms interval)
      │
      └─ findElement loop        Poll UIAutomation tree for the element
                                 (30 attempts × 200ms = ~6s max)
```

### Why 200ms polling

The original 500ms interval caused 10-15 second launch delays for UWP apps like Calculator, because failures at each stage compounded: 10 failed polls × 500ms = 5 seconds per stage, and the stages run sequentially. At 200ms the same 10 failures cost only 2 seconds, reducing typical UWP launch latency to ~3-5 seconds.

### UWP vs Classic search order

The `attachToApplicationWindow` function searches for the app window in the UIAutomation tree using two strategies, executed in different order depending on app type:

| App type | 1st strategy | 2nd strategy (fallback) | Why |
|----------|-------------|------------------------|-----|
| Classic (Win32) | `NativeWindowHandle` | `ProcessId` | Win32 handles map 1:1 to UIA elements — fast exact match |
| UWP / packaged | `ProcessId` | `NativeWindowHandle` | UWP windows live inside `ApplicationFrameHost`; the Win32 handle from `EnumWindows` is the outer frame, but UIA reports the inner XAML handle — so `NativeWindowHandle` almost never matches |

For UWP apps, searching by `NativeWindowHandle` first was a wasted round-trip on every retry. By trying `ProcessId` first, the driver finds the window on the first attempt in most cases.

### Outer retry loop

The outer loop in `changeRootElement` exists because `getProcessIds` can return stale data — the OS may not have registered the new process yet. For UWP apps this loop is kept short (10 attempts) because `attachToApplicationWindow` already has its own 30-attempt inner retry loop for the UIAutomation tree lookup. For classic apps the outer loop runs up to 30 attempts to also cover slow process startup.

## Key Design Decisions

### STA Thread

UIAutomation COM objects require Single-Threaded Apartment (STA) threading. The server creates a dedicated STA thread in `Program.cs` rather than using `[STAThread]` on `async Main` (which doesn't reliably set the apartment state in .NET).

### InvokePattern Delay

After `InvokePattern.Invoke()`, the server waits 50ms to let the target application process the automation event. Without this, rapid back-to-back invocations (e.g., pressing calculator buttons) can outpace the app's UI thread because the C# server processes commands ~10x faster than the old PowerShell backend.

### UWP App Window Matching

For UWP apps, the Win32 window handle from `EnumWindows` refers to the outer `ApplicationFrameHost` frame, while UIAutomation reports the inner XAML window handle via `NativeWindowHandle`. These almost never match. The driver therefore searches by `ProcessId` first for UWP apps (and falls back to `NativeWindowHandle` as a safety net). For classic Win32 apps the order is reversed — `NativeWindowHandle` first — since the handles match directly. See "App Launch Flow" above for details.

### Backward Compatibility

- The `-windows uiautomation` locator strategy still accepts PowerShell-style condition strings (parsed by the existing converter, then translated to JSON conditions)
- The `executePowerShellScript` command still works for `prerun`/`postrun` scripts and the `powerShell` execute feature, but uses isolated one-shot PowerShell processes instead of a persistent session
- All Appium protocol commands remain unchanged — existing test suites work without modification
