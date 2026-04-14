using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.Protocol;

namespace NovaUIAutomationServer.Server;

public static class ConditionBuilder
{
    private static readonly Dictionary<string, AutomationProperty> PropertyMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AcceleratorKey"] = AutomationElement.AcceleratorKeyProperty,
        ["AccessKey"] = AutomationElement.AccessKeyProperty,
        ["AutomationId"] = AutomationElement.AutomationIdProperty,
        ["ClassName"] = AutomationElement.ClassNameProperty,
        ["ControlType"] = AutomationElement.ControlTypeProperty,
        ["Culture"] = AutomationElement.CultureProperty,
        ["FrameworkId"] = AutomationElement.FrameworkIdProperty,
        ["HasKeyboardFocus"] = AutomationElement.HasKeyboardFocusProperty,
        ["HeadingLevel"] = AutomationElement.HeadingLevelProperty,
        ["HelpText"] = AutomationElement.HelpTextProperty,
        ["IsContentElement"] = AutomationElement.IsContentElementProperty,
        ["IsControlElement"] = AutomationElement.IsControlElementProperty,
        ["IsEnabled"] = AutomationElement.IsEnabledProperty,
        ["IsKeyboardFocusable"] = AutomationElement.IsKeyboardFocusableProperty,
        ["IsOffscreen"] = AutomationElement.IsOffscreenProperty,
        ["IsPassword"] = AutomationElement.IsPasswordProperty,
        ["IsRequiredForForm"] = AutomationElement.IsRequiredForFormProperty,
        ["ItemStatus"] = AutomationElement.ItemStatusProperty,
        ["ItemType"] = AutomationElement.ItemTypeProperty,
        ["LabeledBy"] = AutomationElement.LabeledByProperty,
        ["LocalizedControlType"] = AutomationElement.LocalizedControlTypeProperty,
        ["Name"] = AutomationElement.NameProperty,
        ["NativeWindowHandle"] = AutomationElement.NativeWindowHandleProperty,
        ["Orientation"] = AutomationElement.OrientationProperty,
        ["ProcessId"] = AutomationElement.ProcessIdProperty,
        ["RuntimeId"] = AutomationElement.RuntimeIdProperty,
        ["ClickablePoint"] = AutomationElement.ClickablePointProperty,
        ["BoundingRectangle"] = AutomationElement.BoundingRectangleProperty,
        ["SizeOfSet"] = AutomationElement.SizeOfSetProperty,
        ["PositionInSet"] = AutomationElement.PositionInSetProperty,
        ["IsDialog"] = AutomationElement.IsDialogProperty,
        // Pattern availability
        ["IsDockPatternAvailable"] = AutomationElement.IsDockPatternAvailableProperty,
        ["IsExpandCollapsePatternAvailable"] = AutomationElement.IsExpandCollapsePatternAvailableProperty,
        ["IsGridItemPatternAvailable"] = AutomationElement.IsGridItemPatternAvailableProperty,
        ["IsGridPatternAvailable"] = AutomationElement.IsGridPatternAvailableProperty,
        ["IsInvokePatternAvailable"] = AutomationElement.IsInvokePatternAvailableProperty,
        ["IsMultipleViewPatternAvailable"] = AutomationElement.IsMultipleViewPatternAvailableProperty,
        ["IsRangeValuePatternAvailable"] = AutomationElement.IsRangeValuePatternAvailableProperty,
        ["IsSelectionItemPatternAvailable"] = AutomationElement.IsSelectionItemPatternAvailableProperty,
        ["IsSelectionPatternAvailable"] = AutomationElement.IsSelectionPatternAvailableProperty,
        ["IsScrollPatternAvailable"] = AutomationElement.IsScrollPatternAvailableProperty,
        ["IsSynchronizedInputPatternAvailable"] = AutomationElement.IsSynchronizedInputPatternAvailableProperty,
        ["IsScrollItemPatternAvailable"] = AutomationElement.IsScrollItemPatternAvailableProperty,
        ["IsVirtualizedItemPatternAvailable"] = AutomationElement.IsVirtualizedItemPatternAvailableProperty,
        ["IsItemContainerPatternAvailable"] = AutomationElement.IsItemContainerPatternAvailableProperty,
        ["IsTablePatternAvailable"] = AutomationElement.IsTablePatternAvailableProperty,
        ["IsTableItemPatternAvailable"] = AutomationElement.IsTableItemPatternAvailableProperty,
        ["IsTextPatternAvailable"] = AutomationElement.IsTextPatternAvailableProperty,
        ["IsTogglePatternAvailable"] = AutomationElement.IsTogglePatternAvailableProperty,
        ["IsTransformPatternAvailable"] = AutomationElement.IsTransformPatternAvailableProperty,
        ["IsValuePatternAvailable"] = AutomationElement.IsValuePatternAvailableProperty,
        ["IsWindowPatternAvailable"] = AutomationElement.IsWindowPatternAvailableProperty,
    };

    private static readonly Dictionary<string, ControlType> ControlTypeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Button"] = ControlType.Button,
        ["Calendar"] = ControlType.Calendar,
        ["CheckBox"] = ControlType.CheckBox,
        ["ComboBox"] = ControlType.ComboBox,
        ["Edit"] = ControlType.Edit,
        ["Hyperlink"] = ControlType.Hyperlink,
        ["Image"] = ControlType.Image,
        ["ListItem"] = ControlType.ListItem,
        ["List"] = ControlType.List,
        ["Menu"] = ControlType.Menu,
        ["MenuBar"] = ControlType.MenuBar,
        ["MenuItem"] = ControlType.MenuItem,
        ["ProgressBar"] = ControlType.ProgressBar,
        ["RadioButton"] = ControlType.RadioButton,
        ["ScrollBar"] = ControlType.ScrollBar,
        ["Slider"] = ControlType.Slider,
        ["Spinner"] = ControlType.Spinner,
        ["StatusBar"] = ControlType.StatusBar,
        ["Tab"] = ControlType.Tab,
        ["TabItem"] = ControlType.TabItem,
        ["Text"] = ControlType.Text,
        ["ToolBar"] = ControlType.ToolBar,
        ["ToolTip"] = ControlType.ToolTip,
        ["Tree"] = ControlType.Tree,
        ["TreeItem"] = ControlType.TreeItem,
        ["Custom"] = ControlType.Custom,
        ["Group"] = ControlType.Group,
        ["Thumb"] = ControlType.Thumb,
        ["DataGrid"] = ControlType.DataGrid,
        ["DataItem"] = ControlType.DataItem,
        ["Document"] = ControlType.Document,
        ["SplitButton"] = ControlType.SplitButton,
        ["Window"] = ControlType.Window,
        ["Pane"] = ControlType.Pane,
        ["Header"] = ControlType.Header,
        ["HeaderItem"] = ControlType.HeaderItem,
        ["Table"] = ControlType.Table,
        ["TitleBar"] = ControlType.TitleBar,
        ["Separator"] = ControlType.Separator,
    };

    public static AutomationProperty GetAutomationProperty(string name)
    {
        // Strip trailing "Property" suffix if present
        if (name.EndsWith("Property", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^8];
        }

        if (PropertyMap.TryGetValue(name, out var prop))
        {
            return prop;
        }

        throw new ArgumentException($"Unknown automation property: '{name}'");
    }

    public static Condition Build(ConditionDto dto)
    {
        return dto.Type.ToLowerInvariant() switch
        {
            "property" => BuildPropertyCondition(dto),
            "and" => BuildAndCondition(dto),
            "or" => BuildOrCondition(dto),
            "not" => BuildNotCondition(dto),
            "true" => Condition.TrueCondition,
            "false" => Condition.FalseCondition,
            _ => throw new ArgumentException($"Unknown condition type: '{dto.Type}'")
        };
    }

    private static Condition BuildPropertyCondition(ConditionDto dto)
    {
        if (string.IsNullOrEmpty(dto.Property) || dto.Value == null)
        {
            throw new ArgumentException("Property condition requires 'property' and 'value' fields.");
        }

        var automationProperty = GetAutomationProperty(dto.Property);
        var value = ConvertValue(automationProperty, dto.Value.Value);

        return new PropertyCondition(automationProperty, value);
    }

    private static object ConvertValue(AutomationProperty property, JsonElement value)
    {
        if (property == AutomationElement.ControlTypeProperty)
        {
            var typeName = value.GetString() ?? throw new ArgumentException("ControlType value must be a string.");
            if (ControlTypeMap.TryGetValue(typeName, out var ct))
            {
                return ct;
            }
            throw new ArgumentException($"Unknown ControlType: '{typeName}'");
        }

        if (property == AutomationElement.RuntimeIdProperty)
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

        if (property == AutomationElement.OrientationProperty)
        {
            var orientationName = value.GetString() ?? "None";
            return Enum.Parse<OrientationType>(orientationName, true);
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

    private static Condition BuildAndCondition(ConditionDto dto)
    {
        if (dto.Conditions == null || dto.Conditions.Length < 2)
        {
            throw new ArgumentException("AndCondition requires at least 2 conditions.");
        }
        return new AndCondition(dto.Conditions.Select(Build).ToArray());
    }

    private static Condition BuildOrCondition(ConditionDto dto)
    {
        if (dto.Conditions == null || dto.Conditions.Length < 2)
        {
            throw new ArgumentException("OrCondition requires at least 2 conditions.");
        }
        return new OrCondition(dto.Conditions.Select(Build).ToArray());
    }

    private static Condition BuildNotCondition(ConditionDto dto)
    {
        if (dto.Condition == null)
        {
            throw new ArgumentException("NotCondition requires a 'condition' field.");
        }
        return new NotCondition(Build(dto.Condition));
    }
}
