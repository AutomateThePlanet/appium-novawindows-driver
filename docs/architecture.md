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
│   (TypeScript)       │  ◄──────────────────────────  │  (C# / .NET 10)          │
│                      │         stdout (NDJSON)       │                          │
└──────────────────────┘                               └──────────────────────────┘
        │                                                       │
        │ koffi FFI                                             │ Hand-written [ComImport]
        ▼                                                       ▼
   user32.dll                                          IUIAutomation (UIA3 COM)
   (mouse/keyboard)                                    via UIAutomationCore.dll
```

### Components

**Node.js Driver (`lib/`)** — TypeScript, runs inside Appium. Handles:
- Appium protocol (WebDriver commands)
- W3C Actions API (pointer/key/wheel via koffi FFI to user32.dll)
- XPath parsing and evaluation
- Session lifecycle
- Communication with the C# server via `NovaUIAutomationClient`

**C# Server (`csharp/NovaUIAutomationServer/`)** — Compiled .NET executable. Handles:
- All UIAutomation API calls (FindFirst, FindAll, GetProperty, patterns) through the **UIA3 COM API** (`IUIAutomation`)
- Element table management (RuntimeId → `IUIAutomationElement` mapping)
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

When the driver opens an application (`changeRootElement` in `lib/commands/app.ts`), it must bridge from a process launch to a UIAutomation element. This involves multiple polling stages — there is no blind sleep; the driver attaches as soon as the window appears:

```
changeRootElement
│
├─ startProcess          Launch the app (explorer.exe for UWP, direct for classic)
│                        For classic apps, optionally waits for the process to
│                        become input-idle via WaitForInputIdle (C# server-side)
│                        if ms:waitForAppLaunch is set.
│
└─ outer retry loop      Poll every 200ms (up to 10 attempts for UWP, 30 for
   │                     classic, or until ms:waitForAppLaunch deadline)
   │
   ├─ getProcessIds      Get OS process IDs for the app
   │                     (skip iteration if no processes found yet)
   │
   └─ attachToApplicationWindow
      │
      ├─ waitForNewWindow        Poll EnumWindows for a visible Win32 window
      │                          belonging to the process (200ms interval,
      │                          up to ms:waitForAppLaunch timeout or deadline)
      │
      └─ findElement loop        Poll UIAutomation tree for the element
                                 (200ms interval, up to deadline or 30 attempts)
```

### Timeout capabilities

Two capabilities control how long the driver waits for an app to launch:

| Capability | Unit | Scope | Default |
|-----------|------|-------|---------|
| `ms:waitForAppLaunch` | seconds (values > 120 treated as ms) | Overall deadline for the entire `changeRootElement` flow — all retry loops including `waitForNewWindow` and the UIAutomation tree findElement loop. Also passed to C# `WaitForInputIdle` for classic apps. | No deadline (fixed attempt counts) |

Both are poll-based — the driver checks every 200ms and attaches immediately when the app is ready. Neither causes a blind sleep.

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

The outer loop in `changeRootElement` exists because `getProcessIds` can return stale data — the OS may not have registered the new process yet. For UWP apps this loop is kept short (10 attempts) because `attachToApplicationWindow` already has its own 30-attempt inner retry loop for the UIAutomation tree lookup. For classic apps the outer loop runs up to 30 attempts to also cover slow process startup. When `ms:waitForAppLaunch` is set, the fixed attempt counts are replaced by a time-based deadline — loops continue as long as time remains.

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

## UIA3 COM Interop (hand-written)

The server talks to the UIAutomation framework through the **UIA3 COM API** (`IUIAutomation`, defined in `UIAutomationCore.dll`) rather than the managed `System.Windows.Automation` wrapper (UIA1) that ships with .NET Framework. The previous incarnation of this driver shelled out to PowerShell and went through UIA1 internally; the C# server briefly did the same before migrating to UIA3 COM.

### Why UIA3 instead of the UIA1 managed wrapper?

1. **No 60-second COM hang.** The UIA1 managed wrapper (`System.Windows.Automation` / `UIAutomationClient.dll`) occasionally blocks for **up to 60 s** on a single call when WPF providers rebuild their automation peer tree under load (a large `ContextMenu` opening is the most reliable repro). The COM RPC timeout on the managed side is hard-coded and the wrapper offers no hook to shorten it. Switching to UIA3 eliminated the hang in the test suites that originally exposed it.
2. **Less marshaling overhead on the hot path.** UIA1 wraps every COM call in a managed proxy; UIA3 via `[ComImport]` interfaces calls `IUIAutomationElement` methods directly, which materially shortens property reads and tree walks — the two things Appium drivers do thousands of times per session.
3. **Broader pattern and property surface.** UIA3 exposes patterns and properties that UIA1 doesn't — `TextEdit`, `CustomNavigation`, `Selection2`, `Annotation`, modern `Window` / `Transform` v2 members, additional accessibility landmarks. The current driver doesn't use every one of them, but the ones it does need (e.g. the `ClickablePoint` property-value fallback used when the live `GetClickablePoint` call returns `FALSE`) only exist as first-class access on UIA3.
4. **It's the supported API going forward.** UIA1's managed wrapper is part of the .NET Framework reference-assembly set and is essentially in maintenance mode. UIA3 (`UIAutomationCore.dll`) is the API Microsoft ships with Windows itself, receives updates with each Windows release, and is what FlaUI and Accessibility Insights standardize on.
5. **No .NET Framework dependency.** The UIA1 managed wrapper is part of .NET Framework's reference set; reaching it from a modern .NET SDK project means taking a dependency on the Windows Desktop framework profile and shipping a reference-assembly shim. UIA3 comes from `UIAutomationCore.dll`, which is present on every Windows install since XP SP3 — nothing to ship, nothing to reference except the Windows SDK type library.

### Why not `<COMReference>` / tlbimp?

### Why not `<COMReference>` / tlbimp?

The `ResolveComReference` MSBuild task is only available in the **.NET Framework** MSBuild, not in the .NET SDK (`dotnet build` emits `MSB4803` and refuses). The options were:

1. Pin a third-party dependency (e.g. `Interop.UIAutomationClient` NuGet).
2. Hand-write the `[ComImport]` interface declarations.

We chose (2) to keep the project dependency-free and avoid checking a generated interop assembly into the repo. The declarations live in **`csharp/NovaUIAutomationServer/Uia3/UIA.cs`** and cover the subset of the UIA3 API we actually use (`IUIAutomation`, `IUIAutomationElement`, `IUIAutomationTreeWalker`, the patterns, cache request, etc.).

### Interop gotchas worth knowing

- **STA thread is mandatory.** UIA3 COM objects must be marshaled on a Single-Threaded Apartment. `Program.cs` creates a dedicated STA thread and runs the whole request loop on it synchronously — no `await`, so no continuation ever lands on an MTA thread-pool thread.
- **Return-value marshaling follows the IDL exactly.** `HRESULT GetClickablePoint([out] POINT*, [out, retval] BOOL*)` translates to `int GetClickablePoint(out tagPOINT pt)` — the `BOOL` retval becomes the managed return, not the `POINT`. Swapping the two (we did in an early draft) gets past the compiler but produces garbage coordinates at runtime.
- **Property values come back as `object`** from `GetCurrentPropertyValue(int)`. Typed properties surface as the expected CLR type:
  - `bool` properties → `bool`
  - `int` properties → `int`
  - `double` properties → `double` (with `double.PositiveInfinity` used by UIA to mean "unbounded" — we clamp to `int.MaxValue` for JSON serialization)
  - `int[]` (runtime id) → `int[]`
  - coordinate properties (e.g. `ClickablePointPropertyId`) → `double[2]` (SAFEARRAY of VT_R8)
  - everything else is stringified via `ToString()`

## Click Reliability

`lib/commands/element.ts` `click()` has **two paths**, picked by the `ControlType` of the target:

- **Fast path (default, all non-menu controls)** — teleport + `mouseDown` + `mouseUp`. Matches the original pre-UIA3 behavior and is what fast benchmarks rely on (a 4-click Calculator smoke run was ~28 % slower when every click paid the menu-path cost).
- **Reliable path (`MenuItem` / `Menu` / `MenuBar`)** — teleport + 100 ms pre-click hover drain + adaptive re-read of `ClickablePoint` (compensates for popup animation, see below) + `mouseDown` + `mouseUp` + 100 ms post-click drain.

### Shared steps (both paths)

1. **Detect `MenuItem` / `Menu` / `MenuBar`** up front via a `getProperty('ControlType')` call. If menu, **skip** the usual "`setFocus` on the nearest focusable `Pane` / `Window` ancestor" step — focusing an ancestor closes the open popup, stale `ClickablePoint` coordinates are then used for the click, and the mouse lands on empty space. Non-menu controls still run the focus step because many WPF surfaces want their owning window focused before a click lands.
2. **Resolve the click target** via a 3-tier `ClickablePoint` fallback (client side: native property → `getRect` centre; server side inside the native property call: `IUIAutomationElement.GetClickablePoint` → `GetCurrentPropertyValue(UIA_ClickablePointPropertyId)` → throw). WPF providers sometimes return `BOOL=FALSE` from the live call under contention even when the cached property is still present; the property-value fallback catches that case without falling all the way back to the bounding-rect centre. Mirrors `FlaUI.UIA3/UIA3FrameworkAutomationElement.cs:147-176`.
3. **Move the cursor to the click target via teleport** (`mouseMoveAbsolute(x, y, 0)` — single `SendInput`). Teleport is used even on the reliable path because an interpolated move inside an already-open `ContextMenu` popup crosses sibling menu items on the way to the target, and WPF's `MouseEnter` tracking is sensitive enough that a single intermediate frame (≥ 16 ms at 60 Hz) can hover-open the wrong submenu and steal the click (observed targeting "Time Clock" while passing over "About ▶" — the About submenu opened and the button-down landed on its popup background). Teleport never crosses other items.
4. **Post-click settle** — default 50 ms, overridable via the `delayAfterClick` capability — gives menu/navigation animations a chance to finish before the next `findElement` runs.

### Reliable-path-only steps

5. **Pre-click hover drain** — `await sleep(100)` between the teleport and `mouseDown()`. Lets Windows process the `WM_MOUSEMOVE` so WPF marks the target as `IsMouseOver`. Without this gap the click is routed to the popup background and the popup dismisses silently.
6. **Adaptive popup-animation compensation** — re-read `ClickablePoint` after the drain. WPF `ContextMenu` popups can still be laying out when the first read happens (we observed a 14 px y-drift between back-to-back reads of the same menu item). If the refreshed coord has moved by more than 2 px, re-teleport to the final position and drain again. Happy path: no change detected, no cost paid. Race path: the log line `popup settled: (old) → (new) — re-teleporting` appears and the click lands correctly.
7. **Post-click input-queue drain** — `await sleep(100)` after `mouseUp()`. Mirrors FlaUI's `Wait.UntilInputIsProcessed` (`FlaUI.Core/Input/Wait.cs:19-25`, Raymond Chen / *The Old New Thing*). Lets Windows finish dispatching the button events before the next UIA call runs.
8. **Cursor-position verification (diagnostic)** — between the drain and `mouseDown`, `GetCursorPos` is logged and compared against the target coord. `cursor confirmed at (x, y)` on success; `cursor drift: wanted (…), got (…)` if `SetCursorPos` didn't take. Kept because it surfaced the original animation-race bug and costs one syscall per menu click.

### Cursor movement primitive: `SetCursorPos`

Absolute cursor positioning uses **`SetCursorPos`** (raw physical pixels) rather than `SendInput(MOUSEEVENTF_ABSOLUTE)`. This is a *general-correctness* choice — it was not the fix for the RMH POS menu regression (that was an animation race; see the next section). `SetCursorPos` is preferred because it sidesteps three classes of coordinate bug:

- `SendInput`'s absolute mode normalizes into `[0, 65535]`. Without `MOUSEEVENTF_VIRTUALDESK` it maps onto the primary monitor only, clipping any target on a secondary display.
- Even with `MOUSEEVENTF_VIRTUALDESK`, legacy-DPI-aware processes hit rounding / mapping edge cases when monitors have mixed scale factors.
- `SetCursorPos` takes raw pixel coordinates across the virtual screen, so multi-monitor and DPI scaling just work without any normalization math. Same primitive FlaUI uses (`FlaUI.Core/Input/Mouse.cs` `Position` setter).

There is one known Windows quirk worth mentioning: on a multi-monitor setup with mixed sizes / DPIs, the first `SetCursorPos` call *after the cursor crosses from one monitor to another* can land at `x = 0` on the target monitor instead of the requested coord. The `setCursorAbsolute` helper in `lib/winapi/user32.ts` works around it — call `SetCursorPos`, verify via `GetCursorPos`, retry once on mismatch (see https://stackoverflow.com/questions/58753372).

`SendInput` is still used for **mouse buttons** (`MOUSEEVENTF_LEFTDOWN` / `LEFTUP` etc.) and the wheel — those don't take coordinates, so the normalization issue doesn't apply.

### Popup-animation race (the RMH POS regression)

The actual cause of the "wrong menu item" failure on RMH POS was **not** a coordinate bug; it was a *timing* bug. After `Operations` is clicked the WPF `ContextMenu` still takes a frame or two to finish laying out. If the next click lands in that window, the `ClickablePoint` we read for `Time Clock` is its **mid-animation** position — 10–20 px off from where the item ends up when `mouseDown` finally arrives, enough to slip onto the sibling (`About`) instead.

The fix lives in `lib/commands/element.ts` `click()`: for `MenuItem`/`Menu`/`MenuBar` targets, after the teleport + 100 ms hover drain, we **re-read `ClickablePoint`**. If it has moved by more than 2 px since the first read, the popup was still settling — the driver re-teleports to the final position and drains again. It's adaptive: zero cost when the popup was already stable, automatic correction when it wasn't. The driver log emits `popup settled: (old) → (new) — re-teleporting` whenever the compensation kicks in.

A `getCursorPos()` verification is logged right before `mouseDown`: `cursor confirmed at (x, y)` on the happy path, `cursor drift: wanted (…), got (…)` if `SetCursorPos` didn't place the cursor where we asked. This was the diagnostic that surfaced the animation race in the first place — keeping it in gives us the same signal on the next unfamiliar failure.

### Capabilities that tune the click

| Capability | What it changes | Default |
|-----------|-----------------|---------|
| `delayBeforeClick` | Duration of the cursor move **for non-menu controls**. Pass a positive value to opt into an interpolated path with easing (useful for hover-sensitive custom controls). Ignored on the menu path — menu clicks always teleport to avoid crossing siblings. | `0` (teleport) |
| `delayAfterClick` | Sleep after `mouseUp` before returning. | `50 ms` |
| `smoothPointerMove` | CSS-like easing curve applied to the interpolated path (`linear`, `ease-in-out`, `cubic-bezier(...)` etc.). Only has an effect when the move is interpolated (non-menu controls with `delayBeforeClick > 0`, or W3C Actions pointer moves). | `linear` |

## App Attach & Splash Screen Detection

`attachToApplicationWindow` in `lib/commands/app.ts` must bridge from a freshly launched process to a UIAutomation element that is stable enough to start finding child elements.

### UWP: iterate all HWNDs

For UWP/packaged apps, the process tree looks like:

```
ApplicationFrameHost.exe          ← owns the outer Win32 frame window
└── <the actual UWP process>      ← owns the inner XAML window + content
```

`EnumWindows` returns **both** frames, plus any splash or system dialogs that briefly belong to the same process. Picking `handles[handles.length - 1]` (the last window encountered) is unreliable — we've seen it pick the outer `ApplicationFrameHost` shell, an opaque splash bitmap, or a system "app is starting" placeholder.

The driver instead **iterates every matching HWND**, queries its UIA subtree, and picks the first one whose root element has **≥ 2 focusable descendants**. That threshold is a cheap proxy for "this is the real content window, not a splash screen" — splash bitmaps typically have 0 or 1 focusable descendants. The probe uses a short `TreeScope.Descendants` `findElement` with `IsKeyboardFocusable=true`.

### Classic / Win32: handle-first

For classic apps, the Win32 `HWND` from `EnumWindows` maps 1:1 to the UIA element returned by `IUIAutomation.ElementFromHandle`, so `NativeWindowHandle` is used as the primary match and `ProcessId` as the fallback. See "UWP vs Classic search order" above.

## FindElement: native + recursive-walk fallback

`FindCommands.cs` `FindFirstRecursively` / `FindAllRecursively` implements a two-tier strategy:

1. **Native `FindFirst(TreeScope.Descendants, condition)`** — fast path; runs entirely inside the UIA3 provider.
2. **Recursive walk fallback** (`WalkForFirst` / `WalkForAll`) — when the native call returns `null`, we walk the tree ourselves using `FindAll(TreeScope.Children, TrueCondition)` at each level and apply the condition in managed code.

The fallback exists because some WPF providers (notably certain 3rd-party control libraries and virtualized grids) occasionally miss descendants under load — the native descendant-search skips subtrees the provider hasn't fully populated yet. The walk is slower (~10× on a deep tree) but catches those elements. It runs **only when the native call misses**, so passing tests pay no cost.

## Version Stamping

Every session logs the driver and server versions up-front, so crash reports and log files can be tied back to a specific build:

- **Client banner** (first line the driver logs when a session is created):
  ```
  appium-novawindows-driver v1.4.0-dev.4 (session <uuid>)
  ```
  Source: `lib/version.ts` reads `version` from `package.json` via `path.resolve(__dirname, '..', '..', 'package.json')` so it works both from `lib/` in source and `build/lib/` after compilation. Driver entry point (`lib/driver.ts`) emits the banner in `createSession`.
- **Server banner** (first line the C# server writes to stderr):
  ```
  NovaUIAutomationServer v1.4.0-dev.4+<sha> (built <timestamp>) started. Waiting for commands...
  ```
  Source: `JsonRpcServer.Run` reads `AssemblyInformationalVersionAttribute` (populated from `<Version>` in `NovaUIAutomationServer.csproj`) and appends `File.GetLastWriteTime(Environment.ProcessPath)` as the build timestamp.

`package.json`'s `version` and the csproj's `<Version>` are kept in lock-step — bump both in the same commit.

## Driver Log Mirror (`appium:logFile`)

Appium's own log is controlled at the server level, but individual drivers can't easily turn it on per-session. `appium:logFile` mirrors the driver log to a file on disk for the lifetime of the session:

- `true` → `%LOCALAPPDATA%\novawindows-driver\session-<ISO-timestamp>.log`
- a path ending in `\` or `/` → timestamped file inside that directory
- any other string → exact file path

Implementation: `lib/log-file.ts` wraps the seven log levels Appium uses (`silly` / `verbose` / `debug` / `info` / `http` / `warn` / `error`) with a tee that writes to a `WriteStream` and then delegates to the original log function. The mirror is attached in `createSession` before anything else runs (so even the version banner lands in the file) and detached in `deleteSession`.

Parent directories are created with `mkdirSync({ recursive: true })`. Errors are serialized as their stack trace; non-string arguments are `JSON.stringify`'d.
