using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class SessionCommands
{
    public static object? Init(SessionState state, JsonElement? parameters)
    {
        state.Initialize();
        return null;
    }

    public static object? SetRootElement(SessionState state, JsonElement? parameters)
    {
        state.RootElement = AutomationElement.RootElement;
        return null;
    }

    public static object? SetRootElementNull(SessionState state, JsonElement? parameters)
    {
        state.RootElement = null;
        return null;
    }

    public static object? SetRootElementFromHandle(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var handle = p.GetProperty("handle").GetInt32();

        var condition = new PropertyCondition(AutomationElement.NativeWindowHandleProperty, handle);
        var element = AutomationElement.RootElement.FindFirst(TreeScope.Children | TreeScope.Element, condition);

        if (element == null)
        {
            throw new InvalidOperationException($"No element found with native window handle {handle}.");
        }

        var id = state.SaveElementAndReturnId(element);
        state.RootElement = state.GetElement(id);
        return id;
    }

    public static object? SetRootElementFromElementId(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        state.RootElement = state.GetElement(elementId);
        return null;
    }

    public static object? CheckRootElementNotNull(SessionState state, JsonElement? parameters)
    {
        return state.RootElement != null;
    }

    public static object? SetCacheRequestTreeFilter(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var conditionDto = JsonSerializer.Deserialize<ConditionDto>(p.GetProperty("condition").GetRawText())
            ?? throw new ArgumentException("condition is required.");

        if (state.CacheRequest == null)
        {
            throw new InvalidOperationException("Session not initialized.");
        }

        state.CacheRequest.Pop();
        state.CacheRequest.TreeFilter = ConditionBuilder.Build(conditionDto);
        state.CacheRequest.Push();
        state.TreeWalker = new TreeWalker(state.CacheRequest.TreeFilter);
        return null;
    }

    public static object? SetCacheRequestTreeScope(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var scopeStr = p.GetProperty("scope").GetString()
            ?? throw new ArgumentException("scope is required.");

        if (state.CacheRequest == null)
        {
            throw new InvalidOperationException("Session not initialized.");
        }

        var scope = ParseTreeScope(scopeStr);
        state.CacheRequest.Pop();
        state.CacheRequest.TreeScope = scope;
        state.CacheRequest.Push();
        return null;
    }

    public static object? SetCacheRequestAutomationElementMode(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var modeStr = p.GetProperty("mode").GetString()
            ?? throw new ArgumentException("mode is required.");

        if (state.CacheRequest == null)
        {
            throw new InvalidOperationException("Session not initialized.");
        }

        var mode = modeStr.ToLowerInvariant() switch
        {
            "full" => AutomationElementMode.Full,
            "none" => AutomationElementMode.None,
            _ => throw new ArgumentException($"Invalid AutomationElementMode: '{modeStr}'")
        };

        state.CacheRequest.Pop();
        state.CacheRequest.AutomationElementMode = mode;
        state.CacheRequest.Push();
        return null;
    }

    public static object? Dispose(SessionState state, JsonElement? parameters)
    {
        state.Dispose();
        return null;
    }

    internal static TreeScope ParseTreeScope(string scope)
    {
        return scope.ToLowerInvariant() switch
        {
            "element" => TreeScope.Element,
            "children" => TreeScope.Children,
            "descendants" => TreeScope.Descendants,
            "subtree" => TreeScope.Subtree,
            _ => throw new ArgumentException($"Unsupported tree scope: '{scope}'")
        };
    }
}
