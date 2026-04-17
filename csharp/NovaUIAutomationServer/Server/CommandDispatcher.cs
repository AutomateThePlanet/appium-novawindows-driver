using System.Text.Json;
using NovaUIAutomationServer.Commands;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Server;

public class CommandDispatcher
{
    private readonly Dictionary<string, Func<SessionState, JsonElement?, object?>> _handlers;

    public CommandDispatcher()
    {
        _handlers = new Dictionary<string, Func<SessionState, JsonElement?, object?>>(StringComparer.OrdinalIgnoreCase)
        {
            // Session
            ["init"] = SessionCommands.Init,
            ["setRootElement"] = SessionCommands.SetRootElement,
            ["setRootElementNull"] = SessionCommands.SetRootElementNull,
            ["setRootElementFromHandle"] = SessionCommands.SetRootElementFromHandle,
            ["setRootElementFromElementId"] = SessionCommands.SetRootElementFromElementId,
            ["elementFromHandle"] = SessionCommands.ElementFromHandle,
            ["checkRootElementNotNull"] = SessionCommands.CheckRootElementNotNull,
            ["setCacheRequestTreeFilter"] = SessionCommands.SetCacheRequestTreeFilter,
            ["setCacheRequestTreeScope"] = SessionCommands.SetCacheRequestTreeScope,
            ["setCacheRequestAutomationElementMode"] = SessionCommands.SetCacheRequestAutomationElementMode,
            ["dispose"] = SessionCommands.Dispose,

            // Find
            ["findElement"] = FindCommands.FindElement,
            ["findElements"] = FindCommands.FindElements,
            ["findElementFocused"] = FindCommands.FindElementFocused,
            ["saveRootElementToTable"] = FindCommands.SaveRootElementToTable,
            ["lookupElement"] = FindCommands.LookupElement,

            // Element
            ["getProperty"] = ElementCommands.GetProperty,
            ["getTagName"] = ElementCommands.GetTagName,
            ["getText"] = ElementCommands.GetText,
            ["getRect"] = ElementCommands.GetRect,
            ["getRootRect"] = ElementCommands.GetRootRect,
            ["setFocus"] = ElementCommands.SetFocus,
            ["setElementValue"] = ElementCommands.SetValue,
            ["getElementValue"] = ElementCommands.GetValue,
            ["sendKeys"] = ElementCommands.SendKeys,

            // Patterns
            ["invokeElement"] = PatternCommands.Invoke,
            ["expandElement"] = PatternCommands.Expand,
            ["collapseElement"] = PatternCommands.Collapse,
            ["toggleElement"] = PatternCommands.Toggle,
            ["getToggleState"] = PatternCommands.GetToggleState,
            ["setElementRangeValue"] = PatternCommands.SetRangeValue,
            ["scrollElementIntoView"] = PatternCommands.ScrollIntoView,
            ["selectElement"] = PatternCommands.Select,
            ["addToSelection"] = PatternCommands.AddToSelection,
            ["removeFromSelection"] = PatternCommands.RemoveFromSelection,
            ["isElementSelected"] = PatternCommands.IsSelected,
            ["isMultipleSelect"] = PatternCommands.IsMultipleSelect,
            ["getSelectedElements"] = PatternCommands.GetSelectedElements,
            ["maximizeWindow"] = PatternCommands.MaximizeWindow,
            ["minimizeWindow"] = PatternCommands.MinimizeWindow,
            ["restoreWindow"] = PatternCommands.RestoreWindow,
            ["closeWindow"] = PatternCommands.CloseWindow,
            ["moveWindow"] = PatternCommands.MoveWindow,
            ["resizeWindow"] = PatternCommands.ResizeWindow,

            // Page source & screenshots
            ["getPageSource"] = PageSourceCommands.GetPageSource,
            ["getScreenshot"] = ScreenshotCommands.GetScreenshot,
            ["getElementScreenshot"] = ScreenshotCommands.GetElementScreenshot,

            // Clipboard
            ["getClipboardText"] = ClipboardCommands.GetClipboardText,
            ["setClipboardText"] = ClipboardCommands.SetClipboardText,
            ["getClipboardImage"] = ClipboardCommands.GetClipboardImage,
            ["setClipboardImage"] = ClipboardCommands.SetClipboardImage,

            // Process
            ["startProcess"] = ProcessCommands.StartProcess,
            ["getProcessIds"] = ProcessCommands.GetProcessIds,
            ["stopProcess"] = ProcessCommands.StopProcess,
            ["executePowerShellScript"] = ProcessCommands.ExecutePowerShellScript,

            // File system
            ["deleteFile"] = FileSystemCommands.DeleteFile,
            ["deleteFolder"] = FileSystemCommands.DeleteFolder,

            // Diagnostics
            ["debug:ping"] = DiagnosticCommands.Ping,
            ["debug:inspectElementTable"] = DiagnosticCommands.InspectElementTable,
        };
    }

    public bool HasHandler(string method) => _handlers.ContainsKey(method);

    public object? Execute(string method, SessionState state, JsonElement? parameters)
    {
        if (!_handlers.TryGetValue(method, out var handler))
        {
            throw new ArgumentException($"Unknown method: '{method}'");
        }

        // Handlers run inline on the request-loop STA thread. UIA3 RPC calls
        // don't deadlock the way the UIA1 managed wrapper did, so we don't need
        // per-command worker threads or timeouts.
        return handler(state, parameters);
    }
}
