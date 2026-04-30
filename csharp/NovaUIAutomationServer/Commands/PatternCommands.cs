using System.Text.Json;
using NovaUIAutomationServer.State;
using NovaUIAutomationServer.Uia3;

namespace NovaUIAutomationServer.Commands;

public static class PatternCommands
{
    public static object? Invoke(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);

        // Fallback chain: most callers treat "invoke" as "do the default action",
        // not the strict UIAutomation InvokePattern. SelectionItemPattern covers
        // ListItem/TabItem/RadioButton and is what the app uses for menu items
        // the UIA provider chose not to mark as invokable.
        //
        // UIA3's IUIAutomationInvokePattern::Invoke is natively non-blocking —
        // it posts the action and returns. No StaTaskRunner / FireAndForget
        // wrapper is needed (unlike the managed UIA1 Invoke which could block
        // 30–60s on WPF tree rebuilds).
        if (element.GetCurrentPattern(UIA.InvokePatternId) is IUIAutomationInvokePattern invoke)
        {
            invoke.Invoke();
        }
        else if (element.GetCurrentPattern(UIA.SelectionItemPatternId) is IUIAutomationSelectionItemPattern sel)
        {
            sel.Select();
        }
        else
        {
            throw new InvalidOperationException(
                "Element does not support InvokePattern or SelectionItemPattern.");
        }

        // Yield to let the target app's message pump process the event before
        // the next command touches it. Keeps rapid back-to-back invokes from
        // racing the app's UI thread (e.g. calculator button mashing).
        Thread.Sleep(50);
        return null;
    }

    public static object? Expand(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationExpandCollapsePattern>(state, parameters, UIA.ExpandCollapsePatternId, "ExpandCollapsePattern");
        p.Expand();
        return null;
    }

    public static object? Collapse(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationExpandCollapsePattern>(state, parameters, UIA.ExpandCollapsePatternId, "ExpandCollapsePattern");
        p.Collapse();
        return null;
    }

    public static object? Toggle(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationTogglePattern>(state, parameters, UIA.TogglePatternId, "TogglePattern");
        p.Toggle();
        return null;
    }

    public static object? GetToggleState(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationTogglePattern>(state, parameters, UIA.TogglePatternId, "TogglePattern");
        return p.CurrentToggleState.ToString();
    }

    public static object? SetRangeValue(SessionState state, JsonElement? parameters)
    {
        var par = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = par.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var value = par.GetProperty("value").GetDouble();

        var element = state.GetElement(elementId);
        if (element.GetCurrentPattern(UIA.RangeValuePatternId) is IUIAutomationRangeValuePattern p)
        {
            p.SetValue(value);
            return null;
        }
        throw new InvalidOperationException("Element does not support RangeValuePattern.");
    }

    public static object? ScrollIntoView(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationScrollItemPattern>(state, parameters, UIA.ScrollItemPatternId, "ScrollItemPattern");
        p.ScrollIntoView();
        return null;
    }

    public static object? Select(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionItemPattern>(state, parameters, UIA.SelectionItemPatternId, "SelectionItemPattern");
        p.Select();
        return null;
    }

    public static object? AddToSelection(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionItemPattern>(state, parameters, UIA.SelectionItemPatternId, "SelectionItemPattern");
        p.AddToSelection();
        return null;
    }

    public static object? RemoveFromSelection(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionItemPattern>(state, parameters, UIA.SelectionItemPatternId, "SelectionItemPattern");
        p.RemoveFromSelection();
        return null;
    }

    public static object? IsSelected(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionItemPattern>(state, parameters, UIA.SelectionItemPatternId, "SelectionItemPattern");
        return p.CurrentIsSelected != 0;
    }

    public static object? IsMultipleSelect(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionPattern>(state, parameters, UIA.SelectionPatternId, "SelectionPattern");
        return p.CurrentCanSelectMultiple != 0;
    }

    public static object? GetSelectedElements(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationSelectionPattern>(state, parameters, UIA.SelectionPatternId, "SelectionPattern");
        var selected = p.GetCurrentSelection();
        return FindCommands.IterateArray(selected)
            .Select(el => state.SaveElementAndReturnId(el))
            .ToArray();
    }

    public static object? MaximizeWindow(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationWindowPattern>(state, parameters, UIA.WindowPatternId, "WindowPattern");
        p.SetWindowVisualState(WindowVisualState.Maximized);
        return null;
    }

    public static object? MinimizeWindow(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationWindowPattern>(state, parameters, UIA.WindowPatternId, "WindowPattern");
        p.SetWindowVisualState(WindowVisualState.Minimized);
        return null;
    }

    public static object? RestoreWindow(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationWindowPattern>(state, parameters, UIA.WindowPatternId, "WindowPattern");
        p.SetWindowVisualState(WindowVisualState.Normal);
        return null;
    }

    public static object? CloseWindow(SessionState state, JsonElement? parameters)
    {
        var p = RequirePattern<IUIAutomationWindowPattern>(state, parameters, UIA.WindowPatternId, "WindowPattern");
        p.Close();
        return null;
    }

    public static object? MoveWindow(SessionState state, JsonElement? parameters)
    {
        var par = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = par.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var x = par.GetProperty("x").GetDouble();
        var y = par.GetProperty("y").GetDouble();

        var element = state.GetElement(elementId);
        if (element.GetCurrentPattern(UIA.TransformPatternId) is IUIAutomationTransformPattern p)
        {
            p.Move(x, y);
            return null;
        }
        throw new InvalidOperationException("Element does not support TransformPattern.");
    }

    public static object? ResizeWindow(SessionState state, JsonElement? parameters)
    {
        var par = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = par.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var width = par.GetProperty("width").GetDouble();
        var height = par.GetProperty("height").GetDouble();

        var element = state.GetElement(elementId);
        if (element.GetCurrentPattern(UIA.TransformPatternId) is IUIAutomationTransformPattern p)
        {
            p.Resize(width, height);
            return null;
        }
        throw new InvalidOperationException("Element does not support TransformPattern.");
    }

    private static IUIAutomationElement GetElement(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        return state.GetElement(elementId);
    }

    private static T RequirePattern<T>(SessionState state, JsonElement? parameters, int patternId, string patternName) where T : class
    {
        var element = GetElement(state, parameters);
        if (element.GetCurrentPattern(patternId) is T pattern)
        {
            return pattern;
        }
        throw new InvalidOperationException($"Element does not support {patternName}.");
    }
}
