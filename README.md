NovaWindows Driver
===================

NovaWindows Driver is a custom Appium driver designed to tackle the limitations of existing Windows automation solutions like WinAppDriver. NovaWindows Driver supports testing Universal Windows Platform (UWP), Windows Forms (WinForms), Windows Presentation Foundation (WPF), and Classic Windows (Win32) apps on Windows 10 PCs. Built to improve performance and reliability for traditional desktop applications, it offers:

Faster XPath locator performance — Reduces element lookup times, even in complex UIs.
RawView element support — Access elements typically hidden from the default ControlView/ContentView.
Enhanced text input handling — Solves keyboard layout issues while improving input speed.
Platform-specific commands — Supports direct window manipulation, advanced UI interactions, and more.
It’s designed to handle real-world scenarios where traditional drivers fall short — from tricky dropdowns to missing elements and unreliable clicks — making it an ideal choice for automating legacy Windows apps.

> **Note**
>
> This driver is built for Appium 2 and is not compatible with Appium 1. To get started,
> clone the repository and run `npm install` to resolve dependencies. Then, use `npm run build`
> to build the driver. Finally, add it to your Appium 2 distribution with the command:
> `appium driver install --source=npm appium-novawindows-driver`


## Usage

Beside of standard Appium requirements NovaWindows Driver adds the following prerequisites:

- Appium Windows Driver only supports Windows 10 and later as the host.

> **Note**
>
> The driver is currently uses a PowerShell session as a back-end, and
> should not require Developer Mode to be on, or any other software.
> There's a plan to update to a better, .NET-based backend for improved
> realiability and better code and error management, as well as supporting
> more features, that are currently not possible using PowerShell alone.
> It is unlikely for the prerequisites to change, as this is one of the
> main goals of NovaWindows driver – seamless setup on any PC.

NovaWindows Driver supports the following capabilities:

Capability Name | Description
--- | ---
platformName | Must be set to `Windows` (case-insensitive).
automationName | Must be set to `NovaWindows` (case-insensitive).
smoothPointerMove | CSS-like easing function (including valid Bezier curve). This controls the smooth movement of the mouse for `delayBeforeClick` ms. Example: `ease-in`, `cubic-bezier(0.42, 0, 0.58, 1)`.
delayBeforeClick | Time in milliseconds before a click is performed.
delayAfterClick | Time in milliseconds after a click is performed.
appTopLevelWindow | The handle of an existing application top-level window to attach to. It can be a number or string (not necessarily hexadecimal). Example: `12345`, `0x12345`.
shouldCloseApp | Whether to close the window of the application in test after the session finishes. Default is `true`.

Please note that more capabilities will be added as the development of this driver progresses. Since it is still in its early stages, some features may be missing or subject to change. If you need a specific capability or encounter any issues, please feel free to open an issue.

## Example

```python
# Python3 + PyTest
import pytest

from appium import webdriver
from appium.options.windows import WindowsOptions

def generate_options():
    uwp_options = WindowsOptions()
    # How to get the app ID for Universal Windows Apps (UWP):
    # https://www.securitylearningacademy.com/mod/book/view.php?id=13829&chapterid=678
    uwp_options.app = 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App'
    uwp_options.automation_name = 'NovaWindows'

    classic_options = WindowsOptions()
    classic_options.app = 'C:\\Windows\\System32\\notepad.exe'
    classic_options.automation_name = 'NovaWindows'

    use_existing_app_options = WindowsOptions()
    # Active window handles could be retrieved from any compatible UI inspector app:
    # https://docs.microsoft.com/en-us/windows/win32/winauto/inspect-objects
    # or https://accessibilityinsights.io/.
    # Also, it is possible to use the corresponding WinApi calls for this purpose:
    # https://referencesource.microsoft.com/#System/services/monitoring/system/diagnosticts/ProcessManager.cs,db7ac68b7cb40db1
    #
    # This capability could be used to create a workaround for UWP apps startup:
    # https://github.com/microsoft/WinAppDriver/blob/master/Samples/C%23/StickyNotesTest/StickyNotesSession.cs
    use_existing_app_options.app_top_level_window = hex(12345)
    use_existing_app_options.automation_name = 'NovaWindows'

    return [uwp_options, classic_options, use_existing_app_options]


@pytest.fixture(params=generate_options())
def driver(request):
    drv = webdriver.Remote('http://127.0.0.1:4723', options=request.param)
    yield drv
    drv.quit()


def test_app_source_could_be_retrieved(driver):
    assert len(driver.page_source) > 0
```


## Power Shell commands execution

Just like in Appium Windows Driver (version 1.15.0 and above) there is a possibility to
run custom Power Shell scriptsfrom your client code. This feature is potentially insecure
and thus needs to beexplicitly enabled when executing the server by providing `power_shell`
key to the listof enabled insecure features. Refer to [Appium Security document](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/security.md) for more details.
It is possible to ether execute a single Power Shell command or a whole script
and get its stdout in response. If the script execution returns non-zero exit code then an exception
is going to be thrown. The exception message will contain the actual stderr. Unlike, Appium Windows Driver,
there is no difference if you paste the script with `command` or `script` argument. For ease of use, you
can even pass the script as a string only, it will work the same way.
Here's an example code of how to control the Notepad process:

```java
// java
String psScript =
  "$sig = '[DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'\n" +
  "Add-Type -MemberDefinition $sig -name NativeMethods -namespace Win32\n" +
  "Start-Process Notepad\n" +
  "$hwnd = @(Get-Process Notepad)[0].MainWindowHandle\n" +
  "[Win32.NativeMethods]::ShowWindowAsync($hwnd, 2)\n" +
  "[Win32.NativeMethods]::ShowWindowAsync($hwnd, 4)\n" +
  "Stop-Process -Name Notepad";
driver.executeScript("powerShell", psScript);
```

Another example, which demonstrates how to use the command output:

```python
# python
cmd = 'Get-Process outlook -ErrorAction SilentlyContinue'
proc_info = driver.execute_script('powerShell', cmd)
if proc_info:
    print('Outlook is running')
else:
    print('Outlook is not running')
```

> **Note**
>
> NovaWindows Driver runs on a single PowerShell session,
> therefore you may share variables between executed PowerShell
> scripts. Unless the PowerShell session exits or crashes for some
> reason, you should be able to reuse the variables that you create.


## Element Location

Appium Windows Driver supports the same location strategies [the WinAppDriver supports](https://github.com/microsoft/WinAppDriver/blob/master/Docs/AuthoringTestScripts.md#supported-locators-to-find-ui-elements), but also includes Windows UIAutomation conditoons:

Name | Description | Example
--- | --- | ---
accessibility id | This strategy is AutomationId attribute in inspect.exe | AppNameTitle
class name | This strategy is ClassName attribute in inspect.exe | TextBlock
id | This strategy is RuntimeId (decimal) attribute in inspect.exe | 42.333896.3.1
name | This strategy is Name attribute in inspect.exe | Calculator
tag name | This strategy is LocalizedControlType (upper camel case) attribute in inspect.exe since Appium Windows Driver 2.1.1 | Text
xpath | This strategy allows to create custom XPath queries on any attribute exposed by inspect.exe. Only XPath 1.0 is supported | (//Button)[2]
windows uiautomation | This strategy allows to create custom Windows UIAutomation conditions on any attribute exposed by inspect.exe. Both C# and PowerShell syntax is supported | new PropertyCondition(AutomationElement.HelpTextProperty, "Info")

## Platform-Specific Extensions

Beside of standard W3C APIs the driver provides the below custom command extensions to execute platform specific scenarios. Use the following source code examples in order to invoke them from your client code:

> **Note**
>
> In most cases, commands implemented in NovaWindows driver can be used
> more intuitively by just the element as a second argument and the value
> (if such is needed) as the thrid argument and so on. For example:
> `driver.executeScript("windows: setValue", element, "valueToSet")` or
> `driver.executeScript("windows: invoke", element)`. Commands that are created
> as fallbacks to Appium Windows Driver should work as is. Open an issue if some
> command that you need is missing or is not behaving as it should.

```java
// Java 11+
var result = driver.executeScript("windows: <methodName>", Map.of(
    "arg1", "value1",
    "arg2", "value2"
    // you may add more pairs if needed or skip providing the map completely
    // if all arguments are defined as optional
));
```

```js
// WebdriverIO
const result = await driver.executeScript('windows: <methodName>', [{
    arg1: "value1",
    arg2: "value2",
}]);
```

```python
# Python
result = driver.execute_script('windows: <methodName>', {
    'arg1': 'value1',
    'arg2': 'value2',
})
```

```ruby
# Ruby
result = @driver.execute_script 'windows: <methodName>', {
    arg1: 'value1',
    arg2: 'value2',
}
```

```csharp
// Dotnet
object result = driver.ExecuteScript("windows: <methodName>", new Dictionary<string, object>() {
    {"arg1", "value1"},
    {"arg2", "value2"}
});
```

### windows: click

This is a shortcut for a single mouse click gesture.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
elementId | string | no | Hexadecimal identifier of the element to click on. If this parameter is missing then given coordinates will be parsed as absolute ones. Otherwise they are parsed as relative to the top left corner of this element. | 123e4567-e89b-12d3-a456-426614174000
x | number | no | Integer horizontal coordinate of the click point. Both x and y coordinates must be provided or none of them if elementId is present. In such case the gesture will be performed at the center point of the given element. The screen scale (if customized) is **not** taken into consideration while calculating the coordinate. The coordinate is always calculated for the [virtual screen](https://learn.microsoft.com/en-us/windows/win32/gdi/the-virtual-screen). | 100
y | number | no | Integer vertical coordinate of the click point. Both x and y coordinates must be provided or none of them if elementId is present. In such case the gesture will be performed at the center point of the given element. The screen scale (if customized) is **not** taken into consideration while calculating the coordinate. The coordinate is always calculated for the [virtual screen](https://learn.microsoft.com/en-us/windows/win32/gdi/the-virtual-screen). | 100
button | string | no | Name of the mouse button to be clicked. An exception is thrown if an unknown button name is provided. Supported button names are: left, middle, right, back, forward. The default value is `left` | right
modifierKeys | string[] or string | no | List of possible keys or a single key name to depress while the click is being performed. Supported key names are: Shift, Ctrl, Alt, Win. For example, in order to keep Ctrl+Alt depressed while clicking, provide the value of ['ctrl', 'alt'] | win
durationMs | number | no | The number of milliseconds to wait between pressing and releasing the mouse button. By default no delay is applied, which simulates a regular click. | 500
times | number | no | How many times the click must be performed. One by default. | 2
interClickDelayMs | number | no | Duration of the pause between each click gesture. Only makes sense if `times` is greater than one. 100ms by default. | 10

### windows: scroll

This is a shortcut for a mouse wheel scroll gesture. The API is a thin wrapper over the [SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput#:~:text=The%20SendInput%20function%20inserts%20the,or%20other%20calls%20to%20SendInput.)
WinApi call. It emulates the mouse cursor movement and/or horizontal/vertical rotation of the mouse wheel.
Thus make sure the target control is ready to receive mouse wheel events (e.g. is focused) before invoking it.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
elementId | string | no | Same as in [windows: click](#windows-click) | 123e4567-e89b-12d3-a456-426614174000
x | number | no | Same as in [windows: click](#windows-click) | 100
y | number | no | Same as in [windows: click](#windows-click) | 100
deltaX | number | no | The amount of horizontal wheel movement measured in wheel clicks. A positive value indicates that the wheel was rotated to the right; a negative value indicates that the wheel was rotated to the left. Either this value or deltaY must be provided, but not both. | -5
deltaY | number | no | The amount of vertical wheel movement measured in wheel clicks. A positive value indicates that the wheel was rotated forward, away from the user; a negative value indicates that the wheel was rotated backward, toward the user. Either this value or deltaX must be provided, but not both. | 5
modifierKeys | string[] or string | no | Same as in [windows: click](#windows-click) | win

### windows: hover

This is a shortcut for a hover gesture.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
startElementId | string | no | Same as in [windows: click](#windows-click) | 123e4567-e89b-12d3-a456-426614174000
startX | number | no | Same as in [windows: click](#windows-click) | 100
startY | number | no | Same as in [windows: click](#windows-click) | 100
endElementId | string | no | Same as in [windows: click](#windows-click) | 123e4567-e89b-12d3-a456-426614174000
endX | number | no | Same as in [windows: click](#windows-click) | 100
endY | number | no | Same as in [windows: click](#windows-click) | 100
modifierKeys | string[] or string | no | Same as in [windows: click](#windows-click) | win
durationMs | number | no | The number of milliseconds between moving the cursor from the starting to the ending hover point. 500ms by default. | 700

### windows: keys

This is a shortcut for a customized keyboard input. Selenium keys should also work as modifier keys, unless forceUnicode option is set to true.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
actions | KeyAction[] or KeyAction | yes | One or more [KeyAction](#keyaction) dictionaries | ```json [{"virtualKeyCode": 0x10, "down": true}, {'text': "appium likes you"}, {"virtualKeyCode": 0x10, "down": false}]```
forceUnicode | boolean | no | Forces the characters to be sent as unicode characters. Note that they won't work in keyboard shortcut combinations, but it makes them keyboard-layout independent. | true

##### KeyAction

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
pause | number | no | Allows to set a delay in milliseconds between key input series. Either this property or `text` or `virtualKeyCode` must be provided. | 100
text | string | no | Non-empty string of Unicode text to type (surrogate characters like smileys are not supported). Either this property or `pause` or `virtualKeyCode` must be provided. | Привіт Світ!
virtualKeyCode | number | no | Valid virtual key code. The list of supported key codes is available at [Virtual-Key Codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes) page. Either this property or `pause` or `text` must be provided. | 0x10
down | boolean | no | This property only makes sense in combination with `virtualKeyCode`. If set to `true` then the corresponding key will be depressed, `false` - released. By default the key is just pressed once. ! Do not forget to release depressed keys in your automated tests. | true

### windows: setClipboard

Sets Windows clipboard content to the given text or a PNG image.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
b64Content | string | yes | Base64-encoded content of the clipboard to be set | `QXBwaXVt`
contentType | 'plaintext' or 'image' | no | Set to 'plaintext' in order to set the given text to the clipboard (the default value). Set to 'image' if `b64Content` contains a base64-encoded payload of a PNG image. | image

### windows: getClipboard

Retrieves Windows clipboard content.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
contentType | 'plaintext' or 'image' | no | Set to 'plaintext' in order to set the given text to the clipboard (the default value). Set to 'image' to retrieve a base64-encoded payload of a PNG image. | image

#### Returns

Base-64 encoded content of the Windows clipboard.

### windows: pushCacheRequest

This is an asynchronous function that sends cache requests based on specific conditions. This is useful for revealing RawView elements in the element tree. Note that cached elements aren't supported by NovaWindows driver yet.

#### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
treeFilter | string | yes | Defines the filter that is applied when walking the automation tree. You can use any UI Automation conditions. For simplicity, you can omit the namespace and/or the Condition word at the end. | `RawView`
treeScope | string | no | Defines the scope of the automation tree to be cached. It determines how far to search for elements, such as just the element itself, its children, descendants or the entire subtree. | `SubTree`
automationElementMode | string | no | Specifies the mode of automation element (e.g., None, Full). Determines whether the UI element is fully cached or only partially cached. | `Full`

### windows: invoke

Invokes a UI element pattern, simulating an interaction like clicking or activating the element.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element on which the `InvokePattern` is called to simulate activation. | `element`

### windows: expand

Expands a UI element that supports the `ExpandPattern`, typically used for elements that can be expanded (like trees or combo boxes).

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element on which the `ExpandPattern` is called to expand the element. | `element`

### windows: collapse

Collapses a UI element that supports the `CollapsePattern`, typically used for collapsible elements (like tree nodes).

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element on which the `CollapsePattern` is called to collapse the element. | `element`

### windows: scrollIntoView

Scrolls the UI element into view using the `ScrollItemPattern`, ensuring that the element is visible within its container.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element on which the `ScrollItemPattern` is called to bring the element into view. | `element`

### windows: isMultiple

Checks if a UI element supports multiple selection using the `SelectionPattern`. Returns `true` if the element supports multiple selections, otherwise `false`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element to check for multiple selection support. | `element`

#### Returns

- `boolean`: `true` if the element supports multiple selection, otherwise `false`.

### windows: selectedItem

Gets the selected item from a UI element that supports the `SelectionPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element from which to retrieve the selected item. | `element`

#### Returns

- `Element`: The selected item of the element as an Appium element.

### windows: allSelectedItems

Gets all selected items from a UI element that supports the `SelectionPattern`, useful for lists or combo boxes.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element from which to retrieve all selected items. | `element`

#### Returns

- `Element[]`: An array of selected items as Appium elements.

### windows: addToSelection

Adds an element to the current selection on a UI element that supports the `SelectionPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element to add to the selection. | `element`

### windows: removeFromSelection

Removes an element from the current selection on a UI element that supports the `SelectionPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element to remove from the selection. | `element`

### windows: select

Selects a UI element using the `SelectionPattern`, simulating the action of choosing the element in a selection context.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element`   | The UI element to select. | `element`

### windows: toggle

Toggles a UI element’s state using the `TogglePattern`, typically used for elements like checkboxes or radio buttons.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element`   | The UI element to toggle. | `element`

### windows: setValue

Sets the value of a UI element using the `ValuePattern` (for elements like text boxes, sliders, etc.).

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element whose value will be set. | `element`
2 | `string` | The value to be set on the element. | `"new value"`

### windows: getValue

Gets the current value of a UI element that supports the `ValuePattern` (e.g., a text box).

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element from which to retrieve the value. | `element`

### windows: maximize

Maximizes a window or UI element using the `WindowPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The window or UI element to maximize. | `element`

### windows: minimize

Minimizes a window or UI element using the `WindowPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The window or UI element to minimize. | `element`

### windows: restore

Restores a window or UI element to its normal state (if it was maximized or minimized) using the `WindowPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The window or UI element to restore. | `element`

### windows: close

Closes a window or UI element using the `WindowPattern`.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The window or UI element to close. | `element`

### windows: setFocus

Sets focus to the specified UI element using UIAutomationElement's `SetFocus` method.

#### Arguments

Position | Type | Description | Example
| --- | --- | --- | --- |
1 | `Element` | The UI element to set focus on. | `element`

### windows: startRecordingScreen

To be implemented.

### windows: stopRecordingScreen

To be implemented.

### windows: deleteFile

To be implemented.

### windows: deleteFolder

To be implemented.

### windows: launchApp

To be implemented.

### windows: closeApp

To be implemented.

### windows: clickAndDrag

To be implemented.

## Development

it is recommended to use Matt Bierner's [Comment tagged templates](https://marketplace.visualstudio.com/items?itemName=bierner.comment-tagged-templates)
Visual Studio Code plugin so it highlights the powershell and C code used throughout the project.

```bash
# Checkout the current repository and run
npm install
# Run linting to check for code quality
npm run lint
# Transpile TypeScript files to build the project
npm run build
```
