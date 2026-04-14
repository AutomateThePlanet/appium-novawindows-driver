using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;
using Point = System.Windows.Point;

namespace NovaUIAutomationServer.Commands;

public static class ElementCommands
{
    public static object? GetProperty(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var propertyName = p.GetProperty("property").GetString()
            ?? throw new ArgumentException("property is required.");

        var element = state.GetElement(elementId);

        // Special case: RuntimeId returns dot-joined string
        if (propertyName.Equals("RuntimeId", StringComparison.OrdinalIgnoreCase))
        {
            var runtimeId = element.GetCurrentPropertyValue(AutomationElement.RuntimeIdProperty) as int[];
            return runtimeId != null ? string.Join(".", runtimeId) : "";
        }

        // Special case: ControlType returns programmatic name
        if (propertyName.Equals("ControlType", StringComparison.OrdinalIgnoreCase))
        {
            var controlType = element.GetCurrentPropertyValue(AutomationElement.ControlTypeProperty) as ControlType;
            if (controlType != null)
            {
                return controlType.ProgrammaticName.Split('.').Last();
            }
            return "";
        }

        // Special case: ClickablePoint returns JSON object
        if (propertyName.Equals("ClickablePoint", StringComparison.OrdinalIgnoreCase))
        {
            var point = element.GetCurrentPropertyValue(AutomationElement.ClickablePointProperty);
            if (point is Point p2)
            {
                return new { x = p2.X, y = p2.Y };
            }
            throw new InvalidOperationException("Element does not have a clickable point.");
        }

        var automationProperty = ConditionBuilder.GetAutomationProperty(propertyName);
        var value = element.GetCurrentPropertyValue(automationProperty);

        if (value == null)
        {
            return "";
        }

        return value.ToString() ?? "";
    }

    public static object? GetTagName(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        var controlType = element.GetCurrentPropertyValue(AutomationElement.ControlTypeProperty) as ControlType;

        if (controlType != null)
        {
            return controlType.ProgrammaticName.Split('.').Last();
        }

        return "";
    }

    public static object? GetText(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);

        // Try TextPattern first
        try
        {
            if (element.TryGetCurrentPattern(TextPattern.Pattern, out var textPatternObj))
            {
                var textPattern = (TextPattern)textPatternObj;
                return textPattern.DocumentRange.GetText(-1);
            }
        }
        catch { }

        // Try SelectionPattern
        try
        {
            if (element.TryGetCurrentPattern(SelectionPattern.Pattern, out var selPatternObj))
            {
                var selPattern = (SelectionPattern)selPatternObj;
                var selected = selPattern.Current.GetSelection();
                if (selected.Length > 0)
                {
                    return selected[0].Current.Name;
                }
            }
        }
        catch { }

        // Fall back to Name property
        return element.Current.Name;
    }

    public static object? GetRect(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        var rect = element.Current.BoundingRectangle;

        return new
        {
            x = double.IsInfinity(rect.X) ? 2147483647.0 : rect.X,
            y = double.IsInfinity(rect.Y) ? 2147483647.0 : rect.Y,
            width = double.IsInfinity(rect.Width) ? 2147483647.0 : rect.Width,
            height = double.IsInfinity(rect.Height) ? 2147483647.0 : rect.Height,
        };
    }

    public static object? GetRootRect(SessionState state, JsonElement? parameters)
    {
        var root = state.RootElement;
        if (root == null)
        {
            return new { x = 0.0, y = 0.0, width = 0.0, height = 0.0 };
        }

        var rect = root.Current.BoundingRectangle;
        return new
        {
            x = double.IsInfinity(rect.X) ? 2147483647.0 : rect.X,
            y = double.IsInfinity(rect.Y) ? 2147483647.0 : rect.Y,
            width = double.IsInfinity(rect.Width) ? 2147483647.0 : rect.Width,
            height = double.IsInfinity(rect.Height) ? 2147483647.0 : rect.Height,
        };
    }

    public static object? SetFocus(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        element.SetFocus();
        return null;
    }

    public static object? SetValue(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");
        var value = p.GetProperty("value").GetString() ?? "";

        var element = state.GetElement(elementId);

        if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var patternObj))
        {
            var pattern = (ValuePattern)patternObj;
            pattern.SetValue(value);
            return null;
        }

        throw new InvalidOperationException("Element does not support ValuePattern.");
    }

    public static object? GetValue(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);

        if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var patternObj))
        {
            var pattern = (ValuePattern)patternObj;
            return pattern.Current.Value;
        }

        throw new InvalidOperationException("Element does not support ValuePattern.");
    }

    public static object? SendKeys(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var text = p.GetProperty("text").GetString()
            ?? throw new ArgumentException("text is required.");

        System.Windows.Forms.SendKeys.SendWait(text);
        return null;
    }
}
