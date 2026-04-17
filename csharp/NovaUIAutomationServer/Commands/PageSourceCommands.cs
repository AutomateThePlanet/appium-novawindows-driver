using System.Text.Json;
using System.Xml;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;
using NovaUIAutomationServer.Uia3;

namespace NovaUIAutomationServer.Commands;

public static class PageSourceCommands
{
    public static object? GetPageSource(SessionState state, JsonElement? parameters)
    {
        var root = state.GetLiveRoot();
        if (root == null)
        {
            return "<DummyRoot></DummyRoot>";
        }

        var xmlDoc = new XmlDocument();
        BuildPageSource(root, xmlDoc, null, state, root);
        return xmlDoc.OuterXml;
    }

    private static void BuildPageSource(
        IUIAutomationElement element,
        XmlDocument xmlDoc,
        XmlElement? parentXmlElement,
        SessionState state,
        IUIAutomationElement? rootForCoords)
    {
        try
        {
            var controlTypeId = element.CurrentControlType;
            var tagName = ConditionBuilder.ControlTypeNameById.TryGetValue(controlTypeId, out var name)
                ? name
                : "";

            var localizedControlType = element.get_CurrentLocalizedControlType() ?? "";
            if (string.IsNullOrEmpty(tagName))
            {
                // Fallback: capitalize localized control type words.
                tagName = string.Concat(
                    localizedControlType.Split(' ')
                        .Select(w => w.Length > 0
                            ? char.ToUpper(w[0]) + w[1..].ToLower()
                            : ""));
            }
            if (string.IsNullOrEmpty(tagName))
            {
                tagName = "Unknown";
            }

            var runtimeId = element.GetRuntimeId();
            var runtimeIdStr = runtimeId != null ? string.Join(".", runtimeId) : "";

            var rect = element.CurrentBoundingRectangle;
            var rootRect = rootForCoords?.CurrentBoundingRectangle ?? new tagRECT();
            var x = rect.left - rootRect.left;
            var y = rect.top - rootRect.top;
            var width = rect.right - rect.left;
            var height = rect.bottom - rect.top;

            var newXmlElement = xmlDoc.CreateElement(tagName);
            newXmlElement.SetAttribute("AcceleratorKey", element.get_CurrentAcceleratorKey() ?? "");
            newXmlElement.SetAttribute("AccessKey", element.get_CurrentAccessKey() ?? "");
            newXmlElement.SetAttribute("AutomationId", element.get_CurrentAutomationId() ?? "");
            newXmlElement.SetAttribute("ClassName", element.get_CurrentClassName() ?? "");
            newXmlElement.SetAttribute("FrameworkId", element.get_CurrentFrameworkId() ?? "");
            newXmlElement.SetAttribute("HasKeyboardfocus", (element.CurrentHasKeyboardFocus != 0).ToString());
            newXmlElement.SetAttribute("HelpText", element.get_CurrentHelpText() ?? "");
            newXmlElement.SetAttribute("IsContentelement", (element.CurrentIsContentElement != 0).ToString());
            newXmlElement.SetAttribute("IsControlelement", (element.CurrentIsControlElement != 0).ToString());
            newXmlElement.SetAttribute("IsEnabled", (element.CurrentIsEnabled != 0).ToString());
            newXmlElement.SetAttribute("IsKeyboardfocusable", (element.CurrentIsKeyboardFocusable != 0).ToString());
            newXmlElement.SetAttribute("IsOffscreen", (element.CurrentIsOffscreen != 0).ToString());
            newXmlElement.SetAttribute("IsPassword", (element.CurrentIsPassword != 0).ToString());
            newXmlElement.SetAttribute("IsRequiredforform", (element.CurrentIsRequiredForForm != 0).ToString());
            newXmlElement.SetAttribute("ItemStatus", element.get_CurrentItemStatus() ?? "");
            newXmlElement.SetAttribute("ItemType", element.get_CurrentItemType() ?? "");
            newXmlElement.SetAttribute("LocalizedControlType", localizedControlType);
            newXmlElement.SetAttribute("Name", element.get_CurrentName() ?? "");
            newXmlElement.SetAttribute("Orientation", element.CurrentOrientation.ToString());
            newXmlElement.SetAttribute("ProcessId", element.CurrentProcessId.ToString());
            newXmlElement.SetAttribute("RuntimeId", runtimeIdStr);
            newXmlElement.SetAttribute("x", x.ToString());
            newXmlElement.SetAttribute("y", y.ToString());
            newXmlElement.SetAttribute("width", width.ToString());
            newXmlElement.SetAttribute("height", height.ToString());

            // WindowPattern attributes (for top-level windows)
            if (element.GetCurrentPattern(UIA.WindowPatternId) is IUIAutomationWindowPattern wp)
            {
                newXmlElement.SetAttribute("CanMaximize", (wp.CurrentCanMaximize != 0).ToString());
                newXmlElement.SetAttribute("CanMinimize", (wp.CurrentCanMinimize != 0).ToString());
                newXmlElement.SetAttribute("IsModal", (wp.CurrentIsModal != 0).ToString());
                newXmlElement.SetAttribute("WindowVisualState", wp.CurrentWindowVisualState.ToString());
                newXmlElement.SetAttribute("WindowInteractionState", wp.CurrentWindowInteractionState.ToString());
                newXmlElement.SetAttribute("IsTopmost", (wp.CurrentIsTopmost != 0).ToString());
            }

            // TransformPattern attributes
            if (element.GetCurrentPattern(UIA.TransformPatternId) is IUIAutomationTransformPattern tp)
            {
                newXmlElement.SetAttribute("CanRotate", (tp.CurrentCanRotate != 0).ToString());
                newXmlElement.SetAttribute("CanResize", (tp.CurrentCanResize != 0).ToString());
                newXmlElement.SetAttribute("CanMove", (tp.CurrentCanMove != 0).ToString());
            }

            if (parentXmlElement == null)
            {
                xmlDoc.AppendChild(newXmlElement);
            }
            else
            {
                parentXmlElement.AppendChild(newXmlElement);
            }

            // Walk children using the session's tree filter (ControlView + !Chrome)
            // if available; otherwise use the default control view.
            var treeFilter = state.CacheRequest?.TreeFilter ?? state.Automation.ControlViewCondition;
            var children = element.FindAll(TreeScope.Children, treeFilter);
            foreach (var child in FindCommands.IterateArray(children))
            {
                BuildPageSource(child, xmlDoc, newXmlElement, state, rootForCoords);
            }
        }
        catch
        {
            // Match the historical PowerShell driver's behavior — swallow per-element
            // failures during page-source generation so a single flaky subtree can't
            // abort the whole dump.
        }
    }
}
