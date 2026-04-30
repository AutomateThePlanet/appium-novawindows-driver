using System.Text.Json;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;
using NovaUIAutomationServer.Uia3;

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
            var runtimeId = element.GetRuntimeId();
            return runtimeId != null ? string.Join(".", runtimeId) : "";
        }

        // Special case: ControlType returns programmatic name (integer ID -> name)
        if (propertyName.Equals("ControlType", StringComparison.OrdinalIgnoreCase))
        {
            var ctId = element.CurrentControlType;
            return ConditionBuilder.ControlTypeNameById.TryGetValue(ctId, out var name) ? name : ctId.ToString();
        }

        // Special case: ClickablePoint returns JSON object. Three-tier fallback
        // mirrors FlaUI's TryGetClickablePoint
        // (FlaUI.UIA3/UIA3FrameworkAutomationElement.cs:147-176):
        //   1. Live IUIAutomationElement.GetClickablePoint.
        //   2. Cached UIA_ClickablePointPropertyId (SAFEARRAY of 2 doubles).
        //   3. Throw → client falls back to bounding-rect centre.
        // WPF providers sometimes return BOOL=FALSE from the live call under
        // contention even when the cached property value is still present.
        if (propertyName.Equals("ClickablePoint", StringComparison.OrdinalIgnoreCase))
        {
            var gotClickable = element.GetClickablePoint(out var pt);
            if (gotClickable != 0)
            {
                return new { x = (double)pt.x, y = (double)pt.y };
            }

            try
            {
                var cachedValue = element.GetCurrentPropertyValue(UIA.ClickablePointPropertyId);
                if (cachedValue is double[] arr && arr.Length >= 2)
                {
                    return new { x = arr[0], y = arr[1] };
                }
            }
            catch
            {
                // fall through to the throw below
            }

            throw new InvalidOperationException("Element does not have a clickable point.");
        }

        // Special case: BoundingRectangle returns JSON object
        if (propertyName.Equals("BoundingRectangle", StringComparison.OrdinalIgnoreCase))
        {
            var r = element.CurrentBoundingRectangle;
            return new
            {
                x = (double)r.left,
                y = (double)r.top,
                width = (double)(r.right - r.left),
                height = (double)(r.bottom - r.top),
            };
        }

        var propertyId = ConditionBuilder.GetPropertyId(propertyName);
        var value = element.GetCurrentPropertyValue(propertyId);

        if (value == null)
        {
            return "";
        }

        // Normalise UIA3 return types for JSON serialization.
        return value switch
        {
            int[] ints => string.Join(".", ints),
            bool b => b,
            int i => i,
            double d => double.IsInfinity(d) ? 2147483647.0 : d,
            _ => value.ToString() ?? "",
        };
    }

    public static object? GetTagName(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        var ctId = element.CurrentControlType;
        return ConditionBuilder.ControlTypeNameById.TryGetValue(ctId, out var name) ? name : ctId.ToString();
    }

    public static object? GetText(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);

        // Prefer TextPattern.DocumentRange.GetText.
        try
        {
            if (element.GetCurrentPattern(UIA.TextPatternId) is IUIAutomationTextPattern tp)
            {
                return tp.DocumentRange.GetText(-1);
            }
        }
        catch { }

        // Fall back to SelectionPattern.GetCurrentSelection()[0].Name.
        try
        {
            if (element.GetCurrentPattern(UIA.SelectionPatternId) is IUIAutomationSelectionPattern sp)
            {
                var selected = sp.GetCurrentSelection();
                if (selected != null && selected.Length > 0)
                {
                    return selected.GetElement(0).get_CurrentName();
                }
            }
        }
        catch { }

        return element.get_CurrentName();
    }

    public static object? GetRect(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        var rect = element.CurrentBoundingRectangle;

        return new
        {
            x = (double)rect.left,
            y = (double)rect.top,
            width = (double)(rect.right - rect.left),
            height = (double)(rect.bottom - rect.top),
        };
    }

    public static object? GetRootRect(SessionState state, JsonElement? parameters)
    {
        var root = state.GetLiveRoot();
        if (root == null)
        {
            return new { x = 0.0, y = 0.0, width = 0.0, height = 0.0 };
        }

        var rect = root.CurrentBoundingRectangle;
        return new
        {
            x = (double)rect.left,
            y = (double)rect.top,
            width = (double)(rect.right - rect.left),
            height = (double)(rect.bottom - rect.top),
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
        if (element.GetCurrentPattern(UIA.ValuePatternId) is IUIAutomationValuePattern vp)
        {
            vp.SetValue(value);
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
        if (element.GetCurrentPattern(UIA.ValuePatternId) is IUIAutomationValuePattern vp)
        {
            return vp.get_CurrentValue();
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
