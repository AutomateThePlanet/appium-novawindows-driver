# Claude Review Guide — appium-desktop-driver

## Project Context

This is a **Windows desktop UI automation Appium driver** (`NovaWindows`). It bridges WebDriver protocol to Windows UI Automation (UIA3) via a persistent PowerShell process. An MCP server layered on top exposes tools for AI agent use.

Key stack: TypeScript, Node.js, Appium BaseDriver, PowerShell, koffi FFI (user32.dll), WebdriverIO (MCP client).

---

## Severity Format

Use this format for findings:

```
[BLOCKER] — Must be fixed before merge. Security or correctness issue.
[HIGH]    — Significant bug or reliability issue; should be fixed.
[MEDIUM]  — Non-critical issue worth addressing.
[LOW]     — Minor style, naming, or improvement suggestion.
[INFO]    — Observation or question, no action required.
```

---

## Security Checklist

### PowerShell Injection
- [ ] User-supplied strings (capability values, element attributes, script arguments) are **never** interpolated raw into PowerShell strings
- [ ] `executeScript` payloads that build PS commands use proper escaping or parameterized construction
- [ ] Capability values used in pre/postrun scripts are validated and sanitized

### FFI / native bindings
- [ ] `user32.dll` calls in `lib/winapi/user32.ts` validate coordinate ranges and handle types before passing to native
- [ ] koffi struct definitions match actual Windows API signatures

### Secrets & credentials
- [ ] No API keys, tokens, or passwords in source code or test fixtures
- [ ] Capability values for app launch do not log sensitive data

---

## Testing Standards

- Unit tests live in `test/` and use **Vitest**
- New utility functions in `lib/` should have corresponding unit tests
- PowerShell condition builders (`lib/powershell/conditions.ts`, `converter.ts`) and XPath evaluator (`lib/xpath/`) are well-covered — changes here need tests
- E2E tests require a real Windows environment; don't flag missing E2E coverage for pure logic changes

---

## Architecture Rules

### Session lifecycle
- `createSession()` must start the PowerShell process cleanly
- `deleteSession()` must kill the PS process and clear all session state (element cache, capabilities)
- Any async work initiated during session must be awaited or cancelled on teardown

### Element handles
- Element IDs are ephemeral — they map to live UIA3 elements that can become stale
- Code that caches element references must handle `ElementNotFound` / stale element gracefully

### Command routing
- All new driver commands must be exported from `lib/commands/index.ts` and follow the existing mixin pattern
- MCP tools in `lib/mcp/tools/` must map cleanly to existing driver commands — avoid duplicating logic

### Error handling
- Driver errors must be wrapped in Appium error classes (e.g., `NoSuchElementError`, `InvalidArgumentError`)
- Raw PowerShell stderr should not be surfaced verbatim to the WebDriver client
- MCP tool errors should return structured error responses, not throw

---

## Code Style

- TypeScript strict mode is on — no `any` unless unavoidable and justified
- Prefer `async/await` over raw Promise chains
- `@/` path alias resolves to `lib/` — use it for imports within the library
- Avoid adding unnecessary abstraction layers for single-use logic
