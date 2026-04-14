using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class PatternCommands
{
    public static object? Invoke(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(InvokePattern.Pattern, out var patternObj))
        {
            ((InvokePattern)patternObj).Invoke();

            // Yield to let the target app's message pump process the invoke event.
            // InvokePattern.Invoke() is asynchronous — it posts the event but doesn't
            // wait for the app to handle it. Without this, rapid back-to-back invocations
            // (e.g. pressing calculator buttons) can outpace the app's UI thread.
            Thread.Sleep(50);

            return null;
        }
        throw new InvalidOperationException("Element does not support InvokePattern.");
    }

    public static object? Expand(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out var patternObj))
        {
            ((ExpandCollapsePattern)patternObj).Expand();
            return null;
        }
        throw new InvalidOperationException("Element does not support ExpandCollapsePattern.");
    }

    public static object? Collapse(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out var patternObj))
        {
            ((ExpandCollapsePattern)patternObj).Collapse();
            return null;
        }
        throw new InvalidOperationException("Element does not support ExpandCollapsePattern.");
    }

    public static object? Toggle(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(TogglePattern.Pattern, out var patternObj))
        {
            ((TogglePattern)patternObj).Toggle();
            return null;
        }
        throw new InvalidOperationException("Element does not support TogglePattern.");
    }

    public static object? GetToggleState(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(TogglePattern.Pattern, out var patternObj))
        {
            return ((TogglePattern)patternObj).Current.ToggleState.ToString();
        }
        throw new InvalidOperationException("Element does not support TogglePattern.");
    }

    public static object? SetRangeValue(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var value = p.GetProperty("value").GetDouble();

        var element = state.GetElement(elementId);
        if (element.TryGetCurrentPattern(RangeValuePattern.Pattern, out var patternObj))
        {
            ((RangeValuePattern)patternObj).SetValue(value);
            return null;
        }
        throw new InvalidOperationException("Element does not support RangeValuePattern.");
    }

    public static object? ScrollIntoView(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(ScrollItemPattern.Pattern, out var patternObj))
        {
            ((ScrollItemPattern)patternObj).ScrollIntoView();
            return null;
        }
        throw new InvalidOperationException("Element does not support ScrollItemPattern.");
    }

    public static object? Select(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var patternObj))
        {
            ((SelectionItemPattern)patternObj).Select();
            return null;
        }
        throw new InvalidOperationException("Element does not support SelectionItemPattern.");
    }

    public static object? AddToSelection(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var patternObj))
        {
            ((SelectionItemPattern)patternObj).AddToSelection();
            return null;
        }
        throw new InvalidOperationException("Element does not support SelectionItemPattern.");
    }

    public static object? RemoveFromSelection(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var patternObj))
        {
            ((SelectionItemPattern)patternObj).RemoveFromSelection();
            return null;
        }
        throw new InvalidOperationException("Element does not support SelectionItemPattern.");
    }

    public static object? IsSelected(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var patternObj))
        {
            return ((SelectionItemPattern)patternObj).Current.IsSelected;
        }
        throw new InvalidOperationException("Element does not support SelectionItemPattern.");
    }

    public static object? IsMultipleSelect(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionPattern.Pattern, out var patternObj))
        {
            return ((SelectionPattern)patternObj).Current.CanSelectMultiple;
        }
        throw new InvalidOperationException("Element does not support SelectionPattern.");
    }

    public static object? GetSelectedElements(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(SelectionPattern.Pattern, out var patternObj))
        {
            var selected = ((SelectionPattern)patternObj).Current.GetSelection();
            return selected.Select(el => state.SaveElementAndReturnId(el)).ToArray();
        }
        throw new InvalidOperationException("Element does not support SelectionPattern.");
    }

    public static object? MaximizeWindow(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(WindowPattern.Pattern, out var patternObj))
        {
            ((WindowPattern)patternObj).SetWindowVisualState(WindowVisualState.Maximized);
            return null;
        }
        throw new InvalidOperationException("Element does not support WindowPattern.");
    }

    public static object? MinimizeWindow(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(WindowPattern.Pattern, out var patternObj))
        {
            ((WindowPattern)patternObj).SetWindowVisualState(WindowVisualState.Minimized);
            return null;
        }
        throw new InvalidOperationException("Element does not support WindowPattern.");
    }

    public static object? RestoreWindow(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(WindowPattern.Pattern, out var patternObj))
        {
            ((WindowPattern)patternObj).SetWindowVisualState(WindowVisualState.Normal);
            return null;
        }
        throw new InvalidOperationException("Element does not support WindowPattern.");
    }

    public static object? CloseWindow(SessionState state, JsonElement? parameters)
    {
        var element = GetElement(state, parameters);
        if (element.TryGetCurrentPattern(WindowPattern.Pattern, out var patternObj))
        {
            ((WindowPattern)patternObj).Close();
            return null;
        }
        throw new InvalidOperationException("Element does not support WindowPattern.");
    }

    public static object? MoveWindow(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var x = p.GetProperty("x").GetDouble();
        var y = p.GetProperty("y").GetDouble();

        var element = state.GetElement(elementId);
        if (element.TryGetCurrentPattern(TransformPattern.Pattern, out var patternObj))
        {
            ((TransformPattern)patternObj).Move(x, y);
            return null;
        }
        throw new InvalidOperationException("Element does not support TransformPattern.");
    }

    public static object? ResizeWindow(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var width = p.GetProperty("width").GetDouble();
        var height = p.GetProperty("height").GetDouble();

        var element = state.GetElement(elementId);
        if (element.TryGetCurrentPattern(TransformPattern.Pattern, out var patternObj))
        {
            ((TransformPattern)patternObj).Resize(width, height);
            return null;
        }
        throw new InvalidOperationException("Element does not support TransformPattern.");
    }

    private static AutomationElement GetElement(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        return state.GetElement(elementId);
    }
}
