# Appium Desktop MCP Server

The `appium-desktop-driver` package ships a built-in **Model Context Protocol (MCP)** server that lets AI agents (Claude, Cursor, Copilot, etc.) automate Windows desktop applications via natural language — no test-framework code required.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the MCP Server](#running-the-mcp-server)
- [Connecting an AI Client](#connecting-an-ai-client)
- [Startup Sequence](#startup-sequence)
- [Tool Reference](#tool-reference)
  - [Session Management](#session-management)
  - [Element Discovery](#element-discovery)
  - [Basic Interaction](#basic-interaction)
  - [Advanced Input](#advanced-input)
  - [UIA Patterns](#uia-patterns)
  - [Window Management](#window-management)
  - [Application Control](#application-control)
  - [Clipboard](#clipboard)
- [Locator Strategies](#locator-strategies)
- [Capabilities Reference](#capabilities-reference)
- [Example Workflows](#example-workflows)
- [File Structure](#file-structure)

---

## Overview

The MCP server wraps the **Appium Desktop driver** in a stateful, tool-based interface that AI agents can call over the [Model Context Protocol](https://modelcontextprotocol.io). The agent:

1. Calls `create_session` to launch a Windows app (Win32, UWP, or classic).
2. Uses `find_element` / `find_elements` to locate UI elements.
3. Uses interaction tools (`click_element`, `set_value`, `send_keys`, etc.) to drive the app.
4. Calls `delete_session` when done.

All communication between the MCP host (AI client) and this server goes over **stdio**. Appium itself is managed automatically (auto-start / auto-shutdown) unless configured otherwise.

---

## Architecture

```
AI Client (Claude / Cursor / etc.)
        │  stdio (MCP protocol)
        ▼
┌──────────────────────────────────────────┐
│          desktop-driver-mcp server          │
│  lib/mcp/index.ts                        │
│  ┌─────────────┐   ┌──────────────────┐  │
│  │AppiumManager│   │  AppiumSession   │  │
│  │ (auto-start │   │ (WebdriverIO     │  │
│  │  / monitor) │   │  remote driver)  │  │
│  └──────┬──────┘   └────────┬─────────┘  │
│         │                   │            │
│         ▼                   ▼            │
│     Appium Server      MCP Tools         │
│     :4723              (30+ tools)       │
└──────────────────────────────────────────┘
        │
        ▼
Windows UI Automation (UIA3)
```

### Key source files

| File | Responsibility |
|------|---------------|
| [lib/mcp/index.ts](lib/mcp/index.ts) | Entry point — wires config, Appium, session, tools, and transport |
| [lib/mcp/config.ts](lib/mcp/config.ts) | Reads environment variables into `McpConfig` |
| [lib/mcp/appium-manager.ts](lib/mcp/appium-manager.ts) | Detects / spawns / shuts down the Appium process |
| [lib/mcp/session.ts](lib/mcp/session.ts) | Creates and deletes the WebdriverIO session |
| [lib/mcp/errors.ts](lib/mcp/errors.ts) | Formats errors for MCP tool responses |
| [lib/mcp/tools/index.ts](lib/mcp/tools/index.ts) | Registers all tool groups |
| [lib/mcp/tools/session.ts](lib/mcp/tools/session.ts) | `create_session`, `delete_session`, `get_session_status` |
| [lib/mcp/tools/find.ts](lib/mcp/tools/find.ts) | `find_element`, `find_elements`, `find_child_element` |
| [lib/mcp/tools/interact.ts](lib/mcp/tools/interact.ts) | `click_element`, `set_value`, `clear_element`, `get_text`, `get_attribute`, `is_element_displayed`, `is_element_enabled` |
| [lib/mcp/tools/advanced.ts](lib/mcp/tools/advanced.ts) | `advanced_click`, `send_keys`, `hover`, `scroll`, `click_and_drag` |
| [lib/mcp/tools/patterns.ts](lib/mcp/tools/patterns.ts) | UIA pattern tools — `invoke_element`, `expand_element`, `collapse_element`, `toggle_element`, `set_element_value`, `get_element_value`, window state tools |
| [lib/mcp/tools/window.ts](lib/mcp/tools/window.ts) | `take_screenshot`, `get_page_source`, `get_window_rect`, `get_window_handles`, `switch_to_window` |
| [lib/mcp/tools/app.ts](lib/mcp/tools/app.ts) | `get_window_element`, `launch_app`, `close_app`, `get_device_time` |
| [lib/mcp/tools/clipboard.ts](lib/mcp/tools/clipboard.ts) | `get_clipboard`, `set_clipboard` |

---

## Prerequisites

- **Windows 10 / 11** (64-bit)
- **Node.js 18+**
- **Appium 3.x** with the Appium Desktop driver installed:
  ```bash
  npm install -g appium
  appium driver install --source=npm appium-desktop-driver
  ```
- An MCP-capable AI client (Claude Desktop, Cursor, VS Code with MCP extension, etc.)

---

## Installation

### From npm (recommended)

```bash
npm install appium-desktop-driver
```

The MCP entry point is automatically registered as a `bin` command:

```
desktop-driver-mcp  →  build/lib/mcp/index.js
```

### From source

```bash
git clone https://github.com/AutomateThePlanet/appium-desktop-driver.git
cd appium-desktop-driver
npm install
npm run build
```

---

## Configuration

All configuration is via **environment variables** read at startup. No configuration file is required.

| Variable | Default | Description |
|----------|---------|-------------|
| `APPIUM_HOST` | `127.0.0.1` | Hostname where Appium is running (or should be started) |
| `APPIUM_PORT` | `4723` | Port for the Appium server |
| `APPIUM_AUTO_START` | `true` | `true` = start Appium automatically if not running; `false` = require it to already be running |
| `APPIUM_BINARY` | *(auto-detected)* | Full path to the `appium` executable. If omitted, looks in `node_modules/.bin/appium` then the system `PATH` |

### Binary resolution order

When `APPIUM_AUTO_START=true` and Appium is not already running, the server resolves the binary as:

1. `APPIUM_BINARY` env var (if set)
2. `<project-root>/node_modules/.bin/appium` (local install)
3. `appium` on the system `PATH` (global install)

---

## Running the MCP Server

### Standalone (for testing)

```bash
# Using the npm script
npm run mcp:start

# Using npx (after npm install)
npx desktop-driver-mcp

# After global install
desktop-driver-mcp
```

### With custom configuration

```bash
APPIUM_PORT=4724 APPIUM_AUTO_START=false desktop-driver-mcp
```

---

## Connecting an AI Client

### Claude Desktop

Add to `claude_desktop_config.json` (usually at `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "appium-desktop-driver": {
      "command": "npx",
      "args": ["desktop-driver-mcp"],
      "env": {
        "APPIUM_AUTO_START": "true"
      }
    }
  }
}
```

Or, if using a local build:

```json
{
  "mcpServers": {
    "appium-desktop-driver": {
      "command": "node",
      "args": ["C:/path/to/appium-desktop-driver/build/lib/mcp/index.js"],
      "env": {
        "APPIUM_AUTO_START": "true"
      }
    }
  }
}
```

### Cursor / VS Code MCP Extension

```json
{
  "mcp": {
    "servers": {
      "appium-desktop-driver": {
        "type": "stdio",
        "command": "npx",
        "args": ["desktop-driver-mcp"]
      }
    }
  }
}
```

---

## Startup Sequence

When the server starts it performs these steps in order:

1. **Load config** — reads environment variables into `McpConfig`. Fails immediately on invalid values (e.g. bad port number).
2. **Ensure Appium is running** — polls `GET /status` on the configured host:port.
   - If already running: skips spawn.
   - If not running and `APPIUM_AUTO_START=true`: spawns the Appium process and polls until ready (30 s timeout).
   - If not running and `APPIUM_AUTO_START=false`: exits with an error.
3. **Create session holder** — `AppiumSession` object is initialized but no app is launched yet.
4. **Create MCP server** — `McpServer` from `@modelcontextprotocol/sdk` with name `desktop-driver-mcp` and version `1.3.0`.
5. **Register tools** — all 30+ tools are registered (see [Tool Reference](#tool-reference)).
6. **Register shutdown handlers** — `SIGINT`, `SIGTERM`, and `stdin close` all trigger graceful shutdown (session delete + Appium stop, with a 10 s session-delete timeout).
7. **Connect stdio transport** — the server is now ready for the AI client.

> **Note:** `stdout` is owned entirely by the MCP protocol. All log messages (prefixed `[MCP]` or `[Appium]`) go to `stderr`.

---

## Tool Reference

### Session Management

#### `create_session`
Start an Appium session by launching a Windows application. **Must be called before any other tool.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app` | string | yes | Executable path (`C:\Windows\notepad.exe`), UWP App ID (`Microsoft.WindowsCalculator_8wekyb3d8bbwe!App`), or `Root` to attach to the desktop |
| `appArguments` | string | no | Command-line arguments for the app |
| `appWorkingDir` | string | no | Working directory for the app process |
| `waitForAppLaunch` | number (ms) | no | Extra wait after launch before interactions begin |
| `shouldCloseApp` | boolean | no | Default `true` — close app on `delete_session` |
| `implicitTimeout` | number (ms) | no | Default `1500` — implicit element wait timeout |
| `delayAfterClick` | number (ms) | no | Wait after every click |
| `delayBeforeClick` | number (ms) | no | Wait before every click |
| `smoothPointerMove` | string | no | Easing function name for pointer movement |

Returns: confirmation string with the app name.

---

#### `delete_session`
End the current Appium session. Closes the app (unless `shouldCloseApp=false` was set). Call when done.

No parameters.

---

#### `get_session_status`
Check whether a session is currently active.

No parameters. Returns `"Session is active."` or `"No active session. Call create_session to start one."`

---

### Element Discovery

#### `find_element`
Find a single UI element. Returns an **element ID string** used by interaction tools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `strategy` | enum | yes | Locator strategy (see [Locator Strategies](#locator-strategies)) |
| `selector` | string | yes | The selector value |

Returns: element ID string, or error if not found.

---

#### `find_elements`
Find all UI elements matching the selector.

Same parameters as `find_element`. Returns: JSON array of element ID strings.

---

#### `find_child_element`
Find a child element within a known parent element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parentElementId` | string | yes | Element ID of the parent |
| `strategy` | enum | yes | Locator strategy |
| `selector` | string | yes | The selector value |

Returns: child element ID string.

---

### Basic Interaction

All interaction tools accept an `elementId` returned by a find tool.

#### `click_element`
Click a UI element at its center.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `set_value`
Clear an input element and type a new value.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `elementId` | string | yes | |
| `value` | string | yes | Text to type |

---

#### `clear_element`
Clear the text content of an input element.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `get_text`
Get the visible text of a UI element.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

Returns: text string.

---

#### `get_attribute`
Get any UIA attribute of an element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `elementId` | string | yes | |
| `attribute` | string | yes | Attribute name, e.g. `Name`, `AutomationId`, `ClassName`, `IsEnabled`, `IsOffscreen`, `ControlType`, `Value.Value` |

Returns: attribute value string.

---

#### `is_element_displayed`
Check whether an element is visible on screen (not off-screen).

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

Returns: `"true"` or `"false"`.

---

#### `is_element_enabled`
Check whether an element is enabled and interactable.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

Returns: `"true"` or `"false"`.

---

### Advanced Input

#### `advanced_click`
Perform a click with modifier keys, multiple clicks, a specific mouse button, or a hold duration.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `elementId` | string | — | Element to click (use either `elementId` or `x`+`y`) |
| `x` | number | — | Absolute screen x coordinate |
| `y` | number | — | Absolute screen y coordinate |
| `button` | enum | `left` | `left`, `right`, `middle`, `back`, `forward` |
| `modifierKeys` | array | `[]` | Any of `shift`, `ctrl`, `alt`, `win` |
| `durationMs` | number | `0` | Hold duration in ms (long-press) |
| `times` | number | `1` | Click count (`2` = double-click) |
| `interClickDelayMs` | number | `100` | Delay between clicks |

---

#### `send_keys`
Send a sequence of keyboard actions — text, virtual key codes, or pauses.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actions` | array | yes | Sequence of action objects (see below) |
| `forceUnicode` | boolean | no | Use Unicode input for special characters |

Each action object can contain:

| Field | Type | Description |
|-------|------|-------------|
| `pause` | number | Pause in milliseconds |
| `text` | string | Text to type (Unicode supported) |
| `virtualKeyCode` | number | Windows VK code (e.g. `13` = Enter, `27` = Escape, `9` = Tab) |
| `down` | boolean | `true` = key-down only, `false` = key-up only, omit = full press |

**Example** — press Ctrl+A then Delete:
```json
{
  "actions": [
    { "virtualKeyCode": 17, "down": true },
    { "virtualKeyCode": 65 },
    { "virtualKeyCode": 17, "down": false },
    { "virtualKeyCode": 46 }
  ]
}
```

---

#### `hover`
Move the mouse pointer from one position to another (for hover effects, tooltips, or drag-without-click).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startElementId` | string | — | Element to start from |
| `startX` / `startY` | number | — | Absolute start coordinates |
| `endElementId` | string | — | Element to end at |
| `endX` / `endY` | number | — | Absolute end coordinates |
| `modifierKeys` | array | `[]` | `shift`, `ctrl`, `alt`, `win` |
| `durationMs` | number | `500` | Duration of movement |

---

#### `scroll`
Scroll the mouse wheel at an element or screen coordinate.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `elementId` | string | — | Element to scroll over |
| `x` / `y` | number | — | Absolute screen coordinates |
| `deltaX` | number | `0` | Horizontal scroll (positive = right) |
| `deltaY` | number | `0` | Vertical scroll (positive = down) |
| `modifierKeys` | array | `[]` | |

---

#### `click_and_drag`
Click and drag from one position to another (resize, reorder, move).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startElementId` | string | — | Drag source element |
| `startX` / `startY` | number | — | Absolute start coordinates |
| `endElementId` | string | — | Drag target element |
| `endX` / `endY` | number | — | Absolute end coordinates |
| `modifierKeys` | array | `[]` | |
| `durationMs` | number | `500` | Drag duration |
| `button` | enum | `left` | `left`, `right`, `middle` |

---

### UIA Patterns

These tools use Windows UI Automation patterns directly, bypassing mouse simulation. More reliable for programmatic interactions.

#### `invoke_element`
Invoke the default action of an element via the **Invoke** pattern (button click, menu item selection, etc.).

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `expand_element`
Expand a collapsible element (tree node, combo box, menu) via the **ExpandCollapse** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `collapse_element`
Collapse an expanded element via the **ExpandCollapse** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `toggle_element`
Toggle a checkbox or toggle button via the **Toggle** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `set_element_value`
Set the value of an element via the **Value** or **RangeValue** pattern (sliders, spin boxes, editable cells).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `elementId` | string | yes | |
| `value` | string | yes | Value to set |

---

#### `get_element_value`
Get the value of an element via the **Value** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `maximize_window`
Maximize a window element via the **Window** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `minimize_window`
Minimize a window element via the **Window** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `restore_window`
Restore a minimized or maximized window to its normal state.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

#### `close_window`
Close a window element via the **Window** pattern.

| Parameter | Type | Required |
|-----------|------|----------|
| `elementId` | string | yes |

---

### Window Management

#### `take_screenshot`
Capture a screenshot of the current app window.

No parameters. Returns: base64-encoded PNG string.

---

#### `get_page_source`
Get the full XML UI element tree of the current window. Use this to understand the app structure before deciding what to interact with.

No parameters. Returns: XML string.

---

#### `get_window_rect`
Get the position and size of the current app window.

No parameters. Returns: JSON object `{ x, y, width, height }`.

---

#### `get_window_handles`
Get all window handles for the current session (for multi-window apps).

No parameters. Returns: JSON array of handle strings.

---

#### `switch_to_window`
Switch automation focus to a different window.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | yes | Handle from `get_window_handles` |

---

### Application Control

#### `get_window_element`
Get the root UI element of the current app window. Returns an element ID for the top-level window (useful for UIA pattern operations on the window itself).

No parameters. Returns: element ID string.

---

#### `launch_app`
Re-launch the application configured in the session (if it was closed with `close_app`).

No parameters.

---

#### `close_app`
Close the application under test without ending the session. Use `launch_app` to restart it.

No parameters.

---

#### `get_device_time`
Get the current date/time on the Windows device.

No parameters. Returns: datetime string.

---

### Clipboard

#### `get_clipboard`
Read the current clipboard contents.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contentType` | enum | `plaintext` | `plaintext` or `image` |

Returns: base64-encoded string of clipboard contents.

---

#### `set_clipboard`
Set the clipboard contents.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `b64Content` | string | yes | Base64-encoded content |
| `contentType` | enum | no | `plaintext` (default) or `image` |

---

## Locator Strategies

| Strategy | Description | Example selector |
|----------|-------------|-----------------|
| `accessibility id` | UIA AutomationId (most reliable) | `CalculatorResults` |
| `name` | Element Name property | `Close` |
| `id` | Same as AutomationId (CSS `#id` syntax internally) | `TextBox1` |
| `xpath` | XPath expression | `//Button[@Name='OK']` |
| `class name` | UIA ControlType class | `TextBlock` |
| `tag name` | UIA element type | `Button` |
| `-windows uiautomation` | Raw UIA condition expression | *(advanced)* |

**Best practice:** prefer `accessibility id` (AutomationId) when available. Use `get_page_source` to discover AutomationIds and element hierarchy.

---

## Capabilities Reference

These are the WebdriverIO capabilities set by `create_session`. They map directly to Appium / Appium Desktop driver capabilities:

| Capability | Session parameter | Description |
|-----------|------------------|-------------|
| `appium:app` | `app` | Application to launch |
| `appium:appArguments` | `appArguments` | CLI arguments |
| `appium:appWorkingDir` | `appWorkingDir` | Working directory |
| `appium:ms:waitForAppLaunch` | `waitForAppLaunch` | Post-launch wait (ms) |
| `appium:shouldCloseApp` | `shouldCloseApp` | Close on session delete |
| `appium:delayAfterClick` | `delayAfterClick` | Click delay (ms) |
| `appium:delayBeforeClick` | `delayBeforeClick` | Pre-click delay (ms) |
| `appium:smoothPointerMove` | `smoothPointerMove` | Pointer easing function |

---

## Example Workflows

### Open Notepad and type text

```
1. create_session(app="C:\Windows\notepad.exe")
2. find_element(strategy="class name", selector="RichEditD2DPT")  → <id>
3. set_value(elementId=<id>, value="Hello from the AI agent!")
4. delete_session()
```

### Open Windows Calculator and perform a calculation

```
1. create_session(app="Microsoft.WindowsCalculator_8wekyb3d8bbwe!App")
2. find_element(strategy="accessibility id", selector="num5Button")  → <5>
3. click_element(elementId=<5>)
4. find_element(strategy="accessibility id", selector="multiplyButton")  → <mul>
5. click_element(elementId=<mul>)
6. find_element(strategy="accessibility id", selector="num3Button")  → <3>
7. click_element(elementId=<3>)
8. find_element(strategy="accessibility id", selector="equalButton")  → <eq>
9. click_element(elementId=<eq>)
10. find_element(strategy="accessibility id", selector="CalculatorResults")  → <res>
11. get_text(elementId=<res>)  → "Display is 15"
12. delete_session()
```

### Inspect an unknown app

```
1. create_session(app="C:\MyApp\MyApp.exe")
2. get_page_source()          # inspect element tree XML
3. take_screenshot()          # visual confirmation
4. get_window_rect()          # window bounds
5. ...interact based on findings...
6. delete_session()
```

### Right-click context menu

```
1. create_session(app="C:\Windows\explorer.exe", appArguments="C:\Users")
2. find_element(strategy="name", selector="Documents")  → <doc>
3. advanced_click(elementId=<doc>, button="right")
4. find_element(strategy="name", selector="Properties")  → <props>
5. click_element(elementId=<props>)
6. delete_session()
```

---

## File Structure

```
lib/mcp/
├── index.ts            # Server entry point & lifecycle
├── config.ts           # Environment variable config
├── appium-manager.ts   # Appium process management
├── session.ts          # WebdriverIO session wrapper
├── errors.ts           # Error formatting utility
└── tools/
    ├── index.ts        # Registers all tool groups
    ├── session.ts      # create_session, delete_session, get_session_status
    ├── find.ts         # find_element, find_elements, find_child_element
    ├── interact.ts     # click_element, set_value, clear_element, get_text, get_attribute, is_element_*
    ├── advanced.ts     # advanced_click, send_keys, hover, scroll, click_and_drag
    ├── patterns.ts     # UIA pattern tools (invoke, expand, toggle, value, window state)
    ├── window.ts       # take_screenshot, get_page_source, get_window_rect, handles
    ├── app.ts          # get_window_element, launch_app, close_app, get_device_time
    └── clipboard.ts    # get_clipboard, set_clipboard
```
