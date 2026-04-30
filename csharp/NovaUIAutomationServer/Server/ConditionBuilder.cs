using System.Text.Json;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.Uia3;

namespace NovaUIAutomationServer.Server;

public static class ConditionBuilder
{
    // UIA3 property IDs. Names here are the public API the TS client sends on
    // the wire ("AutomationId", "Name", "ControlType", …) — do not change them
    // without updating lib/server/conditions.ts + lib/powershell/types.ts.
    private static readonly Dictionary<string, int> PropertyMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AcceleratorKey"] = UIA.AcceleratorKeyPropertyId,
        ["AccessKey"] = UIA.AccessKeyPropertyId,
        ["AutomationId"] = UIA.AutomationIdPropertyId,
        ["ClassName"] = UIA.ClassNamePropertyId,
        ["ControlType"] = UIA.ControlTypePropertyId,
        ["Culture"] = UIA.CulturePropertyId,
        ["FrameworkId"] = UIA.FrameworkIdPropertyId,
        ["HasKeyboardFocus"] = UIA.HasKeyboardFocusPropertyId,
        ["HeadingLevel"] = UIA.HeadingLevelPropertyId,
        ["HelpText"] = UIA.HelpTextPropertyId,
        ["IsContentElement"] = UIA.IsContentElementPropertyId,
        ["IsControlElement"] = UIA.IsControlElementPropertyId,
        ["IsEnabled"] = UIA.IsEnabledPropertyId,
        ["IsKeyboardFocusable"] = UIA.IsKeyboardFocusablePropertyId,
        ["IsOffscreen"] = UIA.IsOffscreenPropertyId,
        ["IsPassword"] = UIA.IsPasswordPropertyId,
        ["IsRequiredForForm"] = UIA.IsRequiredForFormPropertyId,
        ["ItemStatus"] = UIA.ItemStatusPropertyId,
        ["ItemType"] = UIA.ItemTypePropertyId,
        ["LabeledBy"] = UIA.LabeledByPropertyId,
        ["LocalizedControlType"] = UIA.LocalizedControlTypePropertyId,
        ["Name"] = UIA.NamePropertyId,
        ["NativeWindowHandle"] = UIA.NativeWindowHandlePropertyId,
        ["Orientation"] = UIA.OrientationPropertyId,
        ["ProcessId"] = UIA.ProcessIdPropertyId,
        ["RuntimeId"] = UIA.RuntimeIdPropertyId,
        ["ClickablePoint"] = UIA.ClickablePointPropertyId,
        ["BoundingRectangle"] = UIA.BoundingRectanglePropertyId,
        ["SizeOfSet"] = UIA.SizeOfSetPropertyId,
        ["PositionInSet"] = UIA.PositionInSetPropertyId,
        ["IsDialog"] = UIA.IsDialogPropertyId,
        // Pattern availability
        ["IsDockPatternAvailable"] = UIA.IsDockPatternAvailablePropertyId,
        ["IsExpandCollapsePatternAvailable"] = UIA.IsExpandCollapsePatternAvailablePropertyId,
        ["IsGridItemPatternAvailable"] = UIA.IsGridItemPatternAvailablePropertyId,
        ["IsGridPatternAvailable"] = UIA.IsGridPatternAvailablePropertyId,
        ["IsInvokePatternAvailable"] = UIA.IsInvokePatternAvailablePropertyId,
        ["IsMultipleViewPatternAvailable"] = UIA.IsMultipleViewPatternAvailablePropertyId,
        ["IsRangeValuePatternAvailable"] = UIA.IsRangeValuePatternAvailablePropertyId,
        ["IsSelectionItemPatternAvailable"] = UIA.IsSelectionItemPatternAvailablePropertyId,
        ["IsSelectionPatternAvailable"] = UIA.IsSelectionPatternAvailablePropertyId,
        ["IsScrollPatternAvailable"] = UIA.IsScrollPatternAvailablePropertyId,
        ["IsScrollItemPatternAvailable"] = UIA.IsScrollItemPatternAvailablePropertyId,
        ["IsTablePatternAvailable"] = UIA.IsTablePatternAvailablePropertyId,
        ["IsTableItemPatternAvailable"] = UIA.IsTableItemPatternAvailablePropertyId,
        ["IsTextPatternAvailable"] = UIA.IsTextPatternAvailablePropertyId,
        ["IsTogglePatternAvailable"] = UIA.IsTogglePatternAvailablePropertyId,
        ["IsTransformPatternAvailable"] = UIA.IsTransformPatternAvailablePropertyId,
        ["IsValuePatternAvailable"] = UIA.IsValuePatternAvailablePropertyId,
        ["IsWindowPatternAvailable"] = UIA.IsWindowPatternAvailablePropertyId,
    };

    // ControlType names map to the UIA3 integer IDs.
    public static readonly Dictionary<string, int> ControlTypeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Button"] = UIA.ButtonControlTypeId,
        ["Calendar"] = UIA.CalendarControlTypeId,
        ["CheckBox"] = UIA.CheckBoxControlTypeId,
        ["ComboBox"] = UIA.ComboBoxControlTypeId,
        ["Edit"] = UIA.EditControlTypeId,
        ["Hyperlink"] = UIA.HyperlinkControlTypeId,
        ["Image"] = UIA.ImageControlTypeId,
        ["ListItem"] = UIA.ListItemControlTypeId,
        ["List"] = UIA.ListControlTypeId,
        ["Menu"] = UIA.MenuControlTypeId,
        ["MenuBar"] = UIA.MenuBarControlTypeId,
        ["MenuItem"] = UIA.MenuItemControlTypeId,
        ["ProgressBar"] = UIA.ProgressBarControlTypeId,
        ["RadioButton"] = UIA.RadioButtonControlTypeId,
        ["ScrollBar"] = UIA.ScrollBarControlTypeId,
        ["Slider"] = UIA.SliderControlTypeId,
        ["Spinner"] = UIA.SpinnerControlTypeId,
        ["StatusBar"] = UIA.StatusBarControlTypeId,
        ["Tab"] = UIA.TabControlTypeId,
        ["TabItem"] = UIA.TabItemControlTypeId,
        ["Text"] = UIA.TextControlTypeId,
        ["ToolBar"] = UIA.ToolBarControlTypeId,
        ["ToolTip"] = UIA.ToolTipControlTypeId,
        ["Tree"] = UIA.TreeControlTypeId,
        ["TreeItem"] = UIA.TreeItemControlTypeId,
        ["Custom"] = UIA.CustomControlTypeId,
        ["Group"] = UIA.GroupControlTypeId,
        ["Thumb"] = UIA.ThumbControlTypeId,
        ["DataGrid"] = UIA.DataGridControlTypeId,
        ["DataItem"] = UIA.DataItemControlTypeId,
        ["Document"] = UIA.DocumentControlTypeId,
        ["SplitButton"] = UIA.SplitButtonControlTypeId,
        ["Window"] = UIA.WindowControlTypeId,
        ["Pane"] = UIA.PaneControlTypeId,
        ["Header"] = UIA.HeaderControlTypeId,
        ["HeaderItem"] = UIA.HeaderItemControlTypeId,
        ["Table"] = UIA.TableControlTypeId,
        ["TitleBar"] = UIA.TitleBarControlTypeId,
        ["Separator"] = UIA.SeparatorControlTypeId,
        ["SemanticZoom"] = UIA.SemanticZoomControlTypeId,
        ["AppBar"] = UIA.AppBarControlTypeId,
    };

    // Reverse lookup used by ElementCommands.GetProperty / GetTagName — the
    // wire protocol returns ControlType as the programmatic name string, not
    // the integer ID.
    public static readonly Dictionary<int, string> ControlTypeNameById =
        ControlTypeMap.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static int GetPropertyId(string name)
    {
        if (name.EndsWith("Property", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^8];
        }
        if (PropertyMap.TryGetValue(name, out var id))
        {
            return id;
        }
        throw new ArgumentException($"Unknown automation property: '{name}'");
    }

    public static IUIAutomationCondition Build(IUIAutomation automation, ConditionDto dto)
    {
        return dto.Type.ToLowerInvariant() switch
        {
            "property" => BuildPropertyCondition(automation, dto),
            "and" => BuildAndCondition(automation, dto),
            "or" => BuildOrCondition(automation, dto),
            "not" => BuildNotCondition(automation, dto),
            "true" => automation.CreateTrueCondition(),
            "false" => automation.CreateFalseCondition(),
            _ => throw new ArgumentException($"Unknown condition type: '{dto.Type}'")
        };
    }

    private static IUIAutomationCondition BuildPropertyCondition(IUIAutomation automation, ConditionDto dto)
    {
        if (string.IsNullOrEmpty(dto.Property) || dto.Value == null)
        {
            throw new ArgumentException("Property condition requires 'property' and 'value' fields.");
        }

        var propertyId = GetPropertyId(dto.Property);
        var value = ConvertValue(propertyId, dto.Value.Value);

        return automation.CreatePropertyCondition(propertyId, value);
    }

    private static object ConvertValue(int propertyId, JsonElement value)
    {
        if (propertyId == UIA.ControlTypePropertyId)
        {
            var typeName = value.GetString() ?? throw new ArgumentException("ControlType value must be a string.");
            if (ControlTypeMap.TryGetValue(typeName, out var ct))
            {
                return ct;
            }
            throw new ArgumentException($"Unknown ControlType: '{typeName}'");
        }

        if (propertyId == UIA.RuntimeIdPropertyId)
        {
            if (value.ValueKind == JsonValueKind.Array)
            {
                return value.EnumerateArray().Select(v => v.GetInt32()).ToArray();
            }
            if (value.ValueKind == JsonValueKind.String)
            {
                return value.GetString()!.Split('.').Select(int.Parse).ToArray();
            }
        }

        if (propertyId == UIA.OrientationPropertyId)
        {
            var orientationName = value.GetString() ?? "None";
            // UIA3 OrientationType is an int enum (None=0, Horizontal=1, Vertical=2)
            return (int)Enum.Parse<OrientationType>(orientationName, true);
        }

        // NativeWindowHandle is an HWND. UIA property expects an int (not IntPtr)
        // when stored in a VARIANT — CreatePropertyCondition takes an object.
        if (propertyId == UIA.NativeWindowHandlePropertyId && value.ValueKind == JsonValueKind.Number)
        {
            return value.GetInt32();
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString()!,
            JsonValueKind.Number => value.GetInt32(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => value.GetString() ?? string.Empty
        };
    }

    private static IUIAutomationCondition BuildAndCondition(IUIAutomation automation, ConditionDto dto)
    {
        if (dto.Conditions == null || dto.Conditions.Length < 2)
        {
            throw new ArgumentException("AndCondition requires at least 2 conditions.");
        }
        var built = dto.Conditions.Select(c => Build(automation, c)).ToArray();
        return automation.CreateAndConditionFromArray(built);
    }

    private static IUIAutomationCondition BuildOrCondition(IUIAutomation automation, ConditionDto dto)
    {
        if (dto.Conditions == null || dto.Conditions.Length < 2)
        {
            throw new ArgumentException("OrCondition requires at least 2 conditions.");
        }
        var built = dto.Conditions.Select(c => Build(automation, c)).ToArray();
        return automation.CreateOrConditionFromArray(built);
    }

    private static IUIAutomationCondition BuildNotCondition(IUIAutomation automation, ConditionDto dto)
    {
        if (dto.Condition == null)
        {
            throw new ArgumentException("NotCondition requires a 'condition' field.");
        }
        return automation.CreateNotCondition(Build(automation, dto.Condition));
    }
}
