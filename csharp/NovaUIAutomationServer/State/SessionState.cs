using System.Windows.Automation;

namespace NovaUIAutomationServer.State;

public class SessionState
{
    public Dictionary<string, AutomationElement> ElementTable { get; } = new();
    public AutomationElement? RootElement { get; set; }
    public CacheRequest? CacheRequest { get; set; }
    public TreeWalker? TreeWalker { get; set; }

    public string SaveElementAndReturnId(AutomationElement element)
    {
        var runtimeId = element.GetCurrentPropertyValue(AutomationElement.RuntimeIdProperty) as int[];
        if (runtimeId == null || runtimeId.Length == 0)
        {
            throw new InvalidOperationException("Element has no RuntimeId.");
        }

        var id = string.Join(".", runtimeId);

        if (!ElementTable.ContainsKey(id))
        {
            ElementTable[id] = element;
        }

        return id;
    }

    public AutomationElement GetElement(string elementId)
    {
        if (ElementTable.TryGetValue(elementId, out var element))
        {
            return element;
        }

        throw new KeyNotFoundException($"Element with ID '{elementId}' not found in element table.");
    }

    public AutomationElement GetRootOrThrow()
    {
        return RootElement ?? throw new InvalidOperationException("Root element is not set.");
    }

    public void Initialize()
    {
        CacheRequest = new CacheRequest();
        var chromeFilter = new PropertyCondition(AutomationElement.FrameworkIdProperty, "Chrome");
        CacheRequest.TreeFilter = new AndCondition(
            Automation.ControlViewCondition,
            new NotCondition(chromeFilter)
        );
        CacheRequest.Push();

        TreeWalker = new TreeWalker(CacheRequest.TreeFilter);
    }

    public void Dispose()
    {
        try
        {
            CacheRequest?.Pop();
        }
        catch
        {
            // ignore if already popped
        }
        ElementTable.Clear();
        RootElement = null;
    }
}
