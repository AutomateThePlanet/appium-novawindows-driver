# Why NovaWindows Driver

This page is a fresh look at the benefits of NovaWindows Driver given the work that has happened since the original announcement ([Reviving Windows App Automation: NovaWindows Driver for Appium](https://www.automatetheplanet.com/reviving-windows-app-automation-novawindows-driver-for-appium-2/)).

Two things are worth stating up front:

1. **Every benefit from the original article is still valid** — usually with the *same or stronger* guarantee than before.
2. **The underlying architecture has since changed.** The first release spoke to UIAutomation through a persistent PowerShell child process. That backend has been replaced by a hand-written C# server (`NovaUIAutomationServer.exe`) that talks to the UIA3 COM API directly. The rest of this document walks through what that means for each published benefit.

## Benefit-by-benefit status

| Original article claim | Status | Notes |
|---|---|---|
| **Clicks are faster than WinAppDriver** (2.8 s vs 8.5 s on the stated benchmark) | **Still true, now tighter** | Click rewrite (teleport for non-menu targets, adaptive re-read for menus) removes all hardcoded delays by default; you can still dial them up with `delayBeforeClick` / `delayAfterClick`. |
| **Typing is faster than WinAppDriver** (4.0 s vs 9.5 s) | **Still true** | Text input goes through the C# server's `SendKeys` path; modifier keys and Selenium key codes still work. No persistent PowerShell process to warm up. |
| **Configurable click/type delays** (`delayBeforeClick`, `delayAfterClick`, `smoothPointerMove`) | **Still true** | All three capabilities remain; see `docs/architecture.md#click-reliability` for how the click path consumes them. |
| **Optimized XPath — translated to native UIA search steps** | **Still true** | `lib/xpath/` still compiles XPath 1.0 to JSON condition DTOs (`lib/server/conditions.ts`) which the C# server runs against `IUIAutomation::FindFirst` / `FindAll`. |
| **Locating relative elements without sacrificing performance** | **Still true** | The condition builder exposes `ancestors-or-self`, `descendants`, `siblings`, etc. as scopes — the C# server walks them natively. |
| **Exposes `RawView` elements that WinAppDriver doesn't** | **Still true** | `windows: pushCacheRequest` with `treeFilter: RawView` is still the entry point. Cache requests continue to drive which elements are visible to subsequent queries. |
| **Three-tier element access (ContentView / ControlView / RawView)** | **Still true** | All three tree-filter modes remain, selectable through the same extension command. |
| **Direct UIA pattern commands** (`windows: invoke`, `expand`, `collapse`, `toggle`, `scrollIntoView`, `select`, `setValue`, `getValue`, `setFocus`, `maximize`/`minimize`/`restore`/`close`) | **Still true** | All of these are still registered extension commands (see the README table) and now run against UIA3 patterns instead of UIA1, so they're free of the 60-second COM hangs the UIA1 managed wrapper occasionally produced on WPF. |
| **Clipboard, recording, file-system commands** (`getClipboard`, `setClipboard`, `startRecordingScreen`, `stopRecordingScreen`, `deleteFile`, `deleteFolder`, `pushFile`, `pullFile`) | **Still true** | Clipboard + recording live in the C# server now (STA thread, `System.Windows.Forms.Clipboard` / bundled FFmpeg). `pushFile` / `pullFile` remain gated behind the `modify_fs` insecure flag. |
| **"The only thing needed is PowerShell, which comes preinstalled"** | **Superseded — actually simpler now** | The driver no longer runs PowerShell at all for UIAutomation. The native server is a **self-contained .NET 10 single-file executable** bundled in the npm package (`native/win-x64/NovaUIAutomationServer.exe`). End-users don't need PowerShell, don't need .NET installed, don't need to configure an execution policy — nothing. `appium driver install --source=npm appium-novawindows-driver` and you're done. (Optional `prerun` / `postrun` PowerShell scripts still work, but they're invoked as isolated one-shot processes behind the `power_shell` insecure flag.) |
| **No additional setup on a new machine** | **Still true, reinforced** | Same as above — prebuilt exe inside the npm tarball, no runtime dependency. |

## What the rewrite added on top of the original benefits

The rewrite wasn't cosmetic. It solved concrete problems the PowerShell backend couldn't.

### 1. No more antivirus false positives

The original PowerShell backend looked like malware to heuristic scanners: a persistent `powershell.exe -NoExit -Command -` reading base64-encoded commands from stdin, feeding them into `Invoke-Expression`, dynamically loading assemblies via `Add-Type`. No amount of exclusion-rule tuning reliably got past BitDefender / Defender / etc. — those are textbook command-and-control malware patterns. The C# server is a plain single-file executable; no scanner flags it.

### 2. UIA3 COM instead of the UIA1 managed wrapper

This is the single biggest behaviour change in the rewrite, so it deserves its own breakdown. Three generations of backend have existed:

1. **PowerShell → UIA1 managed wrapper** — the original release. `powershell.exe` hosted, `Add-Type` loaded `System.Windows.Automation` into the session, commands were base64-encoded scripts.
2. **C# server → UIA1 managed wrapper** — first pass of the rewrite. Got rid of PowerShell but kept the UIA1 managed types inside a .NET process.
3. **C# server → UIA3 COM (current)** — hand-written `[ComImport]` interfaces in `csharp/NovaUIAutomationServer/Uia3/UIA.cs` talk to `IUIAutomation` / `IUIAutomationElement` directly.

Why generation 3 beats generation 2:

- **No 60-second COM hangs.** The UIA1 managed wrapper occasionally blocks up to **60 s** on a single call when WPF rebuilds its automation peer tree (typical trigger: a large `ContextMenu` opening). The wrapper's COM RPC timeout is hard-coded; there is no hook to shorten it. The 60-second hang was the single most common reason tests would spuriously fail on the previous architecture. UIA3 via direct `[ComImport]` interop does not exhibit the hang in the same scenarios.
- **Less marshaling overhead on the hot path.** UIA1 wraps every COM call in a managed proxy. UIA3 via `[ComImport]` calls `IUIAutomationElement` methods directly, which materially shortens property reads and tree walks — exactly the two operations an Appium driver performs thousands of times per session.
- **Broader pattern and property surface.** UIA3 exposes patterns and properties UIA1 doesn't — `TextEdit`, `CustomNavigation`, `Selection2`, `Annotation`, `Window`/`Transform` v2 additions, extended accessibility landmarks. We don't use all of them today, but the fallbacks that exist for real-world UI quirks (e.g. the cached-`ClickablePoint` property lookup used when the live `GetClickablePoint` call returns `FALSE` under contention) are first-class on UIA3.
- **It's the supported API going forward.** UIA1's managed wrapper is part of .NET Framework's reference-assembly set and is effectively in maintenance mode. UIA3 (`UIAutomationCore.dll`) is the API Windows ships *itself*, receives updates with each Windows release, and is what FlaUI and Accessibility Insights standardize on.
- **No .NET Framework dependency.** UIA1's managed wrapper pulls in the .NET Framework Desktop profile's reference assemblies. UIA3 comes from the Windows SDK type library (`UIAutomationCore.dll`, shipped on every Windows install since XP SP3) — nothing extra to reference, nothing extra to ship.

Two things to note for fairness:

- The UIA3 migration doesn't change *user-visible* behaviour — every Appium command still works the same way; the win is latency and resilience.
- Some of the 60-second-hang repros can also be worked around on UIA1 by aggressive cache requests. If you have a UIA1 suite that's already tuned that way and performs well, switching to UIA3 isn't urgent — but it remains the recommended path for new code.

### 3. Structured protocol + error codes

Commands travel as NDJSON (`{"id":1,"method":"findElement","params":{…}}` → `{"id":1,"result":…,"duration_ms":12}`) instead of PowerShell script strings that had to be parsed back out of stdout. Error responses carry a machine-readable `code` (`ElementNotFound`, `PatternNotSupported`, `InvalidArgument`, …) so the driver can translate them to the right `Error` subclass without regex-matching PowerShell exception text.

### 4. Better debuggability

Features the PowerShell backend couldn't offer:

- **Startup banner with version + build timestamp** (`NovaUIAutomationServer v1.4.0-dev.N+<sha> (built <timestamp>)`) so a log file uniquely identifies the binary that produced it.
- **Per-command timing and `SLOW` warnings** (`[N] -> findElement` … `[N] <- findElement (12ms)`, or `SLOW (1419ms)` when something is off).
- **`debug:ping` / `debug:inspectElementTable`** commands for live inspection.
- **`--record <path>`** dumps every request/response pair to NDJSON so a user can attach a session trace to a bug report.
- **Driver log mirror** (`appium:logFile` capability) mirrors Appium's per-session log to a file on disk, which has been the key input for diagnosing every click-reliability regression since the rewrite.

### 5. Multi-monitor + DPI-agnostic input (correctness-by-construction)

Cursor positioning uses `SetCursorPos` (raw virtual-screen pixels) with FlaUI's documented `GetCursorPos`-verify retry for the cross-monitor edge case. `SendInput` is used only for the parts that don't take coordinates (button events, wheel). This is a *general-correctness* property — not a fix for a specific bug we hit. The earlier `SendInput(MOUSEEVENTF_ABSOLUTE)` path would have clipped to the primary monitor whenever the app was maximized on a secondary display; the current path doesn't care about monitor count or DPI scale factors.

### 6. Menu-click reliability

Non-menu clicks are a fast-path teleport + click. Menu clicks (`MenuItem` / `Menu` / `MenuBar`) get:

- Skip of the usual `setFocus` on an ancestor `Pane` / `Window` (focusing an ancestor closes open popups).
- 100 ms pre-click hover drain so WPF can mark the target as `IsMouseOver` before the button-down arrives.
- Adaptive re-read of `ClickablePoint` to catch popups that are still animating into place (observed 14 px y-drift between consecutive reads; without compensation the stale coord slides onto the sibling menu item).
- 100 ms post-click drain (matches FlaUI's `Wait.UntilInputIsProcessed`).
- 3-tier `ClickablePoint` fallback on the server (native call → cached property → `getRect` centre) so providers that return `BOOL=FALSE` under contention still produce a usable coord.

### 7. UWP attach and splash-screen detection

For UWP apps `EnumWindows` returns both the outer `ApplicationFrameHost` frame and any short-lived splash window. The attach path iterates every matching HWND and picks the one whose UIA subtree has ≥ 2 focusable descendants — a cheap proxy for "this is the real content window, not a splash bitmap". `ms:waitForAppLaunch` gates the whole retry loop.

### 8. Find-element resilience

`FindCommands.cs` runs native `FindFirst(TreeScope.Descendants)` first and falls back to a managed recursive walk (`FindAll(TreeScope.Children, TrueCondition)` level-by-level) when the native call returns `null`. Some WPF providers (virtualized grids, certain third-party control libraries) miss descendants under load — the walk catches them. Only pays the cost on misses.

## What the driver does *not* offer vs WinAppDriver

Being balanced: WinAppDriver is the official, broadly-tested reference driver with a multi-year track record on thousands of CI matrices. NovaWindows is newer and narrower. If your suite runs fine on WinAppDriver today, no one is asking you to migrate for its own sake. The cases where NovaWindows genuinely shines are:

- Suites paying the WinAppDriver click/type latency tax on every step.
- Suites blocked by missing `RawView` elements.
- Suites hitting the UIA1 60-second COM hang on complex WPF menus.
- Suites whose CI boxes keep quarantining the driver binary (AV false positives on PowerShell).
- Environments with no administrator / no "Developer Mode" to install WinAppDriver.

## Summary

Every performance, ergonomic, and setup claim from the original article remains correct, and in several cases is now *stricter*:

- **Faster** because the click path no longer pays a fixed pre-click sleep on non-menu clicks.
- **Simpler to install** because PowerShell is no longer on the critical path.
- **More reliable** because the UIA1 60-second hang is gone, menu clicks survive WPF animation races, and multi-monitor cursor math is no longer a concern.
- **More debuggable** because every run has a version-stamped banner, a per-command timing trail, and an optional log-mirror file.

If you run into a case where NovaWindows does something worse than WinAppDriver, file an issue with the log from `appium:logFile` attached — that's exactly the input the driver is designed around.
