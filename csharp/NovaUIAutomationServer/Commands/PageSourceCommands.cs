using System.Text.Json;
using System.Windows;
using System.Windows.Automation;
using System.Xml;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class PageSourceCommands
{
    public static object? GetPageSource(SessionState state, JsonElement? parameters)
    {
        var root = state.RootElement;

        if (root == null)
        {
            return "<DummyRoot></DummyRoot>";
        }

        var xmlDoc = new XmlDocument();
        BuildPageSource(root, xmlDoc, null, state);
        return xmlDoc.OuterXml;
    }

    private static void BuildPageSource(AutomationElement element, XmlDocument xmlDoc, XmlElement? parentXmlElement, SessionState state)
    {
        try
        {
            var controlType = element.GetCurrentPropertyValue(AutomationElement.ControlTypeProperty) as ControlType;
            var localizedControlType = element.GetCurrentPropertyValue(AutomationElement.LocalizedControlTypeProperty) as string ?? "";

            string tagName;
            try
            {
                tagName = controlType?.ProgrammaticName?.Split('.').Last() ?? "";
                if (string.IsNullOrEmpty(tagName))
                {
                    throw new Exception();
                }
            }
            catch
            {
                // Fallback: capitalize localized control type words
                tagName = string.Concat(
                    localizedControlType.Split(' ')
                        .Select(w => w.Length > 0
                            ? char.ToUpper(w[0]) + w[1..].ToLower()
                            : "")
                );
            }

            if (string.IsNullOrEmpty(tagName))
            {
                tagName = "Unknown";
            }

            var acceleratorKey = element.GetCurrentPropertyValue(AutomationElement.AcceleratorKeyProperty)?.ToString() ?? "";
            var accessKey = element.GetCurrentPropertyValue(AutomationElement.AccessKeyProperty)?.ToString() ?? "";
            var automationId = element.GetCurrentPropertyValue(AutomationElement.AutomationIdProperty)?.ToString() ?? "";
            var className = element.GetCurrentPropertyValue(AutomationElement.ClassNameProperty)?.ToString() ?? "";
            var frameworkId = element.GetCurrentPropertyValue(AutomationElement.FrameworkIdProperty)?.ToString() ?? "";
            var hasKeyboardFocus = element.GetCurrentPropertyValue(AutomationElement.HasKeyboardFocusProperty)?.ToString() ?? "";
            var helpText = element.GetCurrentPropertyValue(AutomationElement.HelpTextProperty)?.ToString() ?? "";
            var isContentElement = element.GetCurrentPropertyValue(AutomationElement.IsContentElementProperty)?.ToString() ?? "";
            var isControlElement = element.GetCurrentPropertyValue(AutomationElement.IsControlElementProperty)?.ToString() ?? "";
            var isEnabled = element.GetCurrentPropertyValue(AutomationElement.IsEnabledProperty)?.ToString() ?? "";
            var isKeyboardFocusable = element.GetCurrentPropertyValue(AutomationElement.IsKeyboardFocusableProperty)?.ToString() ?? "";
            var isOffscreen = element.GetCurrentPropertyValue(AutomationElement.IsOffscreenProperty)?.ToString() ?? "";
            var isPassword = element.GetCurrentPropertyValue(AutomationElement.IsPasswordProperty)?.ToString() ?? "";
            var isRequiredForForm = element.GetCurrentPropertyValue(AutomationElement.IsRequiredForFormProperty)?.ToString() ?? "";
            var itemStatus = element.GetCurrentPropertyValue(AutomationElement.ItemStatusProperty)?.ToString() ?? "";
            var itemType = element.GetCurrentPropertyValue(AutomationElement.ItemTypeProperty)?.ToString() ?? "";
            var name = element.GetCurrentPropertyValue(AutomationElement.NameProperty)?.ToString() ?? "";
            var orientation = element.GetCurrentPropertyValue(AutomationElement.OrientationProperty)?.ToString() ?? "";
            var processId = element.GetCurrentPropertyValue(AutomationElement.ProcessIdProperty)?.ToString() ?? "";
            var runtimeId = element.GetCurrentPropertyValue(AutomationElement.RuntimeIdProperty) as int[];
            var runtimeIdStr = runtimeId != null ? string.Join(".", runtimeId) : "";

            var rect = element.Current.BoundingRectangle;
            var rootRect = state.RootElement?.Current.BoundingRectangle ?? new Rect(0, 0, 0, 0);
            var x = rect.X - rootRect.X;
            var y = rect.Y - rootRect.Y;
            var width = rect.Width;
            var height = rect.Height;

            var newXmlElement = xmlDoc.CreateElement(tagName);
            newXmlElement.SetAttribute("AcceleratorKey", acceleratorKey);
            newXmlElement.SetAttribute("AccessKey", accessKey);
            newXmlElement.SetAttribute("AutomationId", automationId);
            newXmlElement.SetAttribute("ClassName", className);
            newXmlElement.SetAttribute("FrameworkId", frameworkId);
            newXmlElement.SetAttribute("HasKeyboardfocus", hasKeyboardFocus);
            newXmlElement.SetAttribute("HelpText", helpText);
            newXmlElement.SetAttribute("IsContentelement", isContentElement);
            newXmlElement.SetAttribute("IsControlelement", isControlElement);
            newXmlElement.SetAttribute("IsEnabled", isEnabled);
            newXmlElement.SetAttribute("IsKeyboardfocusable", isKeyboardFocusable);
            newXmlElement.SetAttribute("IsOffscreen", isOffscreen);
            newXmlElement.SetAttribute("IsPassword", isPassword);
            newXmlElement.SetAttribute("IsRequiredforform", isRequiredForForm);
            newXmlElement.SetAttribute("ItemStatus", itemStatus);
            newXmlElement.SetAttribute("ItemType", itemType);
            newXmlElement.SetAttribute("LocalizedControlType", localizedControlType);
            newXmlElement.SetAttribute("Name", name);
            newXmlElement.SetAttribute("Orientation", orientation);
            newXmlElement.SetAttribute("ProcessId", processId);
            newXmlElement.SetAttribute("RuntimeId", runtimeIdStr);
            newXmlElement.SetAttribute("x", x.ToString());
            newXmlElement.SetAttribute("y", y.ToString());
            newXmlElement.SetAttribute("width", width.ToString());
            newXmlElement.SetAttribute("height", height.ToString());

            // Window pattern attributes
            if (element.TryGetCurrentPattern(WindowPattern.Pattern, out var windowPatternObj))
            {
                var wp = (WindowPattern)windowPatternObj;
                newXmlElement.SetAttribute("CanMaximize", wp.Current.CanMaximize.ToString());
                newXmlElement.SetAttribute("CanMinimize", wp.Current.CanMinimize.ToString());
                newXmlElement.SetAttribute("IsModal", wp.Current.IsModal.ToString());
                newXmlElement.SetAttribute("WindowVisualState", wp.Current.WindowVisualState.ToString());
                newXmlElement.SetAttribute("WindowInteractionState", wp.Current.WindowInteractionState.ToString());
                newXmlElement.SetAttribute("IsTopmost", wp.Current.IsTopmost.ToString());
            }

            // Transform pattern attributes
            if (element.TryGetCurrentPattern(TransformPattern.Pattern, out var transformPatternObj))
            {
                var tp = (TransformPattern)transformPatternObj;
                newXmlElement.SetAttribute("CanRotate", tp.Current.CanRotate.ToString());
                newXmlElement.SetAttribute("CanResize", tp.Current.CanResize.ToString());
                newXmlElement.SetAttribute("CanMove", tp.Current.CanMove.ToString());
            }

            if (parentXmlElement == null)
            {
                xmlDoc.AppendChild(newXmlElement);
            }
            else
            {
                parentXmlElement.AppendChild(newXmlElement);
            }

            // Process children using a queue (breadth-first, same as the PowerShell version)
            var treeFilter = state.CacheRequest?.TreeFilter ?? Automation.ControlViewCondition;
            var children = element.FindAll(TreeScope.Children, treeFilter);
            foreach (AutomationElement child in children)
            {
                BuildPageSource(child, xmlDoc, newXmlElement, state);
            }
        }
        catch
        {
            // noop - match PowerShell behavior
        }
    }
}
