using System.Text.Json;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;
using NovaUIAutomationServer.Uia3;

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
        state.SetRoot(state.Automation.GetRootElement());
        return null;
    }

    public static object? SetRootElementNull(SessionState state, JsonElement? parameters)
    {
        state.SetRoot(null);
        return null;
    }

    // Direct UIA lookup from a native window handle — one IUIAutomation3 COM call
    // to the target window's provider. Avoids walking desktop children, so a
    // neighboring unresponsive top-level window can't block us for the full 60s
    // COM RPC timeout. This is the path used by attachToApplicationWindow in
    // lib/commands/app.ts.
    public static object? ElementFromHandle(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var handle = p.GetProperty("handle").GetInt32();

        var element = state.Automation.ElementFromHandle(new IntPtr(handle));
        if (element == null)
        {
            throw new InvalidOperationException($"IUIAutomation.ElementFromHandle returned null for handle {handle}.");
        }
        return state.SaveElementAndReturnId(element);
    }

    public static object? SetRootElementFromHandle(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var handle = p.GetProperty("handle").GetInt32();

        var element = state.Automation.ElementFromHandle(new IntPtr(handle));
        if (element == null)
        {
            throw new InvalidOperationException($"No element found with native window handle {handle}.");
        }

        var id = state.SaveElementAndReturnId(element);
        state.SetRoot(element);
        return id;
    }

    public static object? SetRootElementFromElementId(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        state.SetRoot(state.GetElement(elementId));
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

        state.CacheRequest.TreeFilter = ConditionBuilder.Build(state.Automation, conditionDto);
        state.TreeWalker = state.Automation.CreateTreeWalker(state.CacheRequest.TreeFilter);
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

        state.CacheRequest.TreeScope = ParseTreeScope(scopeStr);
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

        // AutomationElementMode_Full = 1, _None = 0 (per UIA IDL)
        state.CacheRequest.AutomationElementMode = modeStr.ToLowerInvariant() switch
        {
            "full" => 1,
            "none" => 0,
            _ => throw new ArgumentException($"Invalid AutomationElementMode: '{modeStr}'")
        };
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
