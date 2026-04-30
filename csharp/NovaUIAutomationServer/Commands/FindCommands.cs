using System.Text.Json;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;
using NovaUIAutomationServer.Uia3;

namespace NovaUIAutomationServer.Commands;

public static class FindCommands
{
    public static object? FindElement(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var scope = p.GetProperty("scope").GetString() ?? "descendants";
        var conditionDto = JsonSerializer.Deserialize<ConditionDto>(p.GetProperty("condition").GetRawText())
            ?? throw new ArgumentException("condition is required.");

        string? contextElementId = null;
        if (p.TryGetProperty("contextElementId", out var ctxProp) && ctxProp.ValueKind == JsonValueKind.String)
        {
            contextElementId = ctxProp.GetString();
        }

        // When searching from the session root we re-resolve the attached HWND
        // via IUIAutomation.ElementFromHandle(hwnd) on every call. WPF apps
        // routinely rebuild their automation-peer tree after navigation (splash
        // → main, logout → login), invalidating any cached IUIAutomationElement.
        // Fresh resolution is a sub-ms COM call and gives us the live tree.
        var searchRoot = contextElementId != null
            ? state.GetElement(contextElementId)
            : (state.GetLiveRoot() ?? state.Automation.GetRootElement());

        var condition = ConditionBuilder.Build(state.Automation, conditionDto);

        switch (scope.ToLowerInvariant())
        {
            case "descendants":
                return FindFirstRecursively(searchRoot, condition, state, includeSelf: false);
            case "children":
            {
                var el = searchRoot.FindFirst(TreeScope.Children, condition);
                return el != null ? state.SaveElementAndReturnId(el) : null;
            }
            case "element":
            {
                var el = searchRoot.FindFirst(TreeScope.Element, condition);
                return el != null ? state.SaveElementAndReturnId(el) : null;
            }
            case "subtree":
                return FindFirstRecursively(searchRoot, condition, state, includeSelf: true);
            case "ancestors":
                return FindFirstAncestor(searchRoot, condition, state);
            case "ancestors-or-self":
                return FindFirstAncestorOrSelf(searchRoot, condition, state);
            case "parent":
                return FindParent(searchRoot, condition, state);
            case "following":
                return FindFollowing(searchRoot, condition, state);
            case "following-sibling":
                return FindFollowingSibling(searchRoot, condition, state);
            case "preceding":
                return FindPreceding(searchRoot, condition, state);
            case "preceding-sibling":
                return FindPrecedingSibling(searchRoot, condition, state);
            case "child-or-self":
            {
                var el = searchRoot.FindFirst(TreeScope.Element | TreeScope.Children, condition);
                return el != null ? state.SaveElementAndReturnId(el) : null;
            }
            default:
                throw new ArgumentException($"Unsupported scope: '{scope}'");
        }
    }

    public static object? FindElements(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var scope = p.GetProperty("scope").GetString() ?? "descendants";
        var conditionDto = JsonSerializer.Deserialize<ConditionDto>(p.GetProperty("condition").GetRawText())
            ?? throw new ArgumentException("condition is required.");

        string? contextElementId = null;
        if (p.TryGetProperty("contextElementId", out var ctxProp) && ctxProp.ValueKind == JsonValueKind.String)
        {
            contextElementId = ctxProp.GetString();
        }

        // When searching from the session root we re-resolve the attached HWND
        // via IUIAutomation.ElementFromHandle(hwnd) on every call. WPF apps
        // routinely rebuild their automation-peer tree after navigation (splash
        // → main, logout → login), invalidating any cached IUIAutomationElement.
        // Fresh resolution is a sub-ms COM call and gives us the live tree.
        var searchRoot = contextElementId != null
            ? state.GetElement(contextElementId)
            : (state.GetLiveRoot() ?? state.Automation.GetRootElement());

        var condition = ConditionBuilder.Build(state.Automation, conditionDto);

        switch (scope.ToLowerInvariant())
        {
            case "descendants":
                return FindAllRecursively(searchRoot, condition, state, includeSelf: false);
            case "children":
                return SaveAll(searchRoot.FindAll(TreeScope.Children, condition), state);
            case "element":
                return SaveAll(searchRoot.FindAll(TreeScope.Element, condition), state);
            case "subtree":
                return FindAllRecursively(searchRoot, condition, state, includeSelf: true);
            case "ancestors":
                return FindAllAncestors(searchRoot, condition, state);
            case "ancestors-or-self":
                return FindAllAncestorsOrSelf(searchRoot, condition, state);
            case "parent":
            {
                var result = FindParent(searchRoot, condition, state);
                return result != null ? new[] { result } : Array.Empty<string>();
            }
            case "following":
                return FindAllFollowing(searchRoot, condition, state);
            case "following-sibling":
                return FindAllFollowingSiblings(searchRoot, condition, state);
            case "preceding":
                return FindAllPreceding(searchRoot, condition, state);
            case "preceding-sibling":
                return FindAllPrecedingSiblings(searchRoot, condition, state);
            case "child-or-self":
                return SaveAll(searchRoot.FindAll(TreeScope.Element | TreeScope.Children, condition), state);
            default:
                throw new ArgumentException($"Unsupported scope: '{scope}'");
        }
    }

    public static object? FindElementFocused(SessionState state, JsonElement? parameters)
    {
        var focused = state.Automation.GetFocusedElement();
        return state.SaveElementAndReturnId(focused);
    }

    public static object? SaveRootElementToTable(SessionState state, JsonElement? parameters)
    {
        var root = state.GetLiveRoot() ?? state.Automation.GetRootElement();
        return state.SaveElementAndReturnId(root);
    }

    public static object? LookupElement(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        return state.ElementTable.ContainsKey(elementId);
    }

    // --- Ancestor / Following / Preceding via TreeWalker ---

    private static IUIAutomationTreeWalker DefaultWalker(SessionState state)
        => state.TreeWalker ?? state.Automation.ControlViewWalker;

    private static string? FindFirstAncestor(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = walker.GetParentElement(element);
        while (el != null)
        {
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                return state.SaveElementAndReturnId(el);
            }
            el = walker.GetParentElement(el);
        }
        return null;
    }

    private static string? FindFirstAncestorOrSelf(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = element;
        while (el != null)
        {
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                return state.SaveElementAndReturnId(el);
            }
            el = walker.GetParentElement(el);
        }
        return null;
    }

    private static string[] FindAllAncestors(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = walker.GetParentElement(element);
        while (el != null)
        {
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                results.Add(state.SaveElementAndReturnId(el));
            }
            el = walker.GetParentElement(el);
        }
        return results.ToArray();
    }

    private static string[] FindAllAncestorsOrSelf(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                results.Add(state.SaveElementAndReturnId(el));
            }
            el = walker.GetParentElement(el);
        }
        return results.ToArray();
    }

    private static string? FindParent(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var parent = DefaultWalker(state).GetParentElement(element);
        if (parent == null) return null;
        return parent.FindFirst(TreeScope.Element, condition) != null
            ? state.SaveElementAndReturnId(parent)
            : null;
    }

    private static string? FindFollowing(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = element;
        while (el != null)
        {
            var next = walker.GetNextSiblingElement(el);
            if (next != null)
            {
                if (next.FindFirst(TreeScope.Element, condition) != null)
                {
                    return state.SaveElementAndReturnId(next);
                }
                // Descend into this sibling's subtree to look for matches there first.
                var found = next.FindFirst(TreeScope.Descendants, condition);
                if (found != null)
                {
                    return state.SaveElementAndReturnId(found);
                }
                el = next;
                continue;
            }
            el = walker.GetParentElement(el);
        }
        return null;
    }

    private static string[] FindAllFollowing(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            var next = walker.GetNextSiblingElement(el);
            if (next != null)
            {
                el = next;
                if (el.FindFirst(TreeScope.Element, condition) != null)
                {
                    results.Add(state.SaveElementAndReturnId(el));
                }
                foreach (var match in IterateArray(el.FindAll(TreeScope.Descendants, condition)))
                {
                    results.Add(state.SaveElementAndReturnId(match));
                }
            }
            else
            {
                el = walker.GetParentElement(el);
            }
        }
        return results.ToArray();
    }

    private static string? FindFollowingSibling(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = element;
        while (true)
        {
            var next = walker.GetNextSiblingElement(el);
            if (next == null) break;
            el = next;
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                return state.SaveElementAndReturnId(el);
            }
        }
        return null;
    }

    private static string[] FindAllFollowingSiblings(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = element;
        while (true)
        {
            var next = walker.GetNextSiblingElement(el);
            if (next == null) break;
            el = next;
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                results.Add(state.SaveElementAndReturnId(el));
            }
        }
        return results.ToArray();
    }

    private static string? FindPreceding(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = element;
        while (el != null)
        {
            var prev = walker.GetPreviousSiblingElement(el);
            if (prev != null)
            {
                if (prev.FindFirst(TreeScope.Element, condition) != null)
                {
                    return state.SaveElementAndReturnId(prev);
                }
                var found = prev.FindFirst(TreeScope.Descendants, condition);
                if (found != null)
                {
                    return state.SaveElementAndReturnId(found);
                }
                el = prev;
                continue;
            }
            el = walker.GetParentElement(el);
        }
        return null;
    }

    private static string[] FindAllPreceding(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            var prev = walker.GetPreviousSiblingElement(el);
            if (prev != null)
            {
                el = prev;
                if (el.FindFirst(TreeScope.Element, condition) != null)
                {
                    results.Add(state.SaveElementAndReturnId(el));
                }
                foreach (var match in IterateArray(el.FindAll(TreeScope.Descendants, condition)))
                {
                    results.Add(state.SaveElementAndReturnId(match));
                }
            }
            else
            {
                el = walker.GetParentElement(el);
            }
        }
        return results.ToArray();
    }

    private static string? FindPrecedingSibling(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var el = element;
        while (true)
        {
            var prev = walker.GetPreviousSiblingElement(el);
            if (prev == null) break;
            el = prev;
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                return state.SaveElementAndReturnId(el);
            }
        }
        return null;
    }

    private static string[] FindAllPrecedingSiblings(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state)
    {
        var walker = DefaultWalker(state);
        var results = new List<string>();
        var el = element;
        while (true)
        {
            var prev = walker.GetPreviousSiblingElement(el);
            if (prev == null) break;
            el = prev;
            if (el.FindFirst(TreeScope.Element, condition) != null)
            {
                results.Add(state.SaveElementAndReturnId(el));
            }
        }
        return results.ToArray();
    }

    // Native UIA3 descendant search first — sub-millisecond on typical apps.
    // If native misses (happens for elements in subtrees it doesn't traverse —
    // WPF popup owners hosted in a separate UIA provider, and some virtualised
    // lists), fall back to a manual child-by-child walk via TreeScope.Children
    // which does cross those boundaries. The manual walk is slow on miss
    // (~3–12 s for large trees) but guarantees parity with the original Nova
    // driver's behaviour — tests that were passing before rely on it to find
    // elements the native scope skips.

    private static string? FindFirstRecursively(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state, bool includeSelf)
    {
        var scope = includeSelf ? TreeScope.Subtree : TreeScope.Descendants;
        var native = element.FindFirst(scope, condition);
        if (native != null) return state.SaveElementAndReturnId(native);

        if (includeSelf)
        {
            var self = element.FindFirst(TreeScope.Element, condition);
            if (self != null) return state.SaveElementAndReturnId(self);
        }
        var trueCond = state.Automation.CreateTrueCondition();
        return WalkForFirst(element, condition, trueCond, state);
    }

    private static string? WalkForFirst(IUIAutomationElement element, IUIAutomationCondition condition, IUIAutomationCondition trueCond, SessionState state)
    {
        var direct = element.FindFirst(TreeScope.Children, condition);
        if (direct != null) return state.SaveElementAndReturnId(direct);

        var children = element.FindAll(TreeScope.Children, trueCond);
        foreach (var child in IterateArray(children))
        {
            var found = WalkForFirst(child, condition, trueCond, state);
            if (found != null) return found;
        }
        return null;
    }

    private static string[] FindAllRecursively(IUIAutomationElement element, IUIAutomationCondition condition, SessionState state, bool includeSelf)
    {
        var scope = includeSelf ? TreeScope.Subtree : TreeScope.Descendants;
        var nativeResults = IterateArray(element.FindAll(scope, condition))
            .Select(el => state.SaveElementAndReturnId(el))
            .ToList();

        // Supplement with a manual walk to catch matches the native scope
        // missed. De-dupe by RuntimeId (which is the saved element ID).
        var seen = new HashSet<string>(nativeResults);
        if (includeSelf)
        {
            var self = element.FindFirst(TreeScope.Element, condition);
            if (self != null)
            {
                var id = state.SaveElementAndReturnId(self);
                if (seen.Add(id)) nativeResults.Add(id);
            }
        }
        var trueCond = state.Automation.CreateTrueCondition();
        WalkForAll(element, condition, trueCond, state, nativeResults, seen);
        return nativeResults.ToArray();
    }

    private static void WalkForAll(IUIAutomationElement element, IUIAutomationCondition condition, IUIAutomationCondition trueCond, SessionState state, List<string> results, HashSet<string> seen)
    {
        var children = element.FindAll(TreeScope.Children, trueCond);
        foreach (var child in IterateArray(children))
        {
            if (child.FindFirst(TreeScope.Element, condition) != null)
            {
                var id = state.SaveElementAndReturnId(child);
                if (seen.Add(id)) results.Add(id);
            }
            WalkForAll(child, condition, trueCond, state, results, seen);
        }
    }

    // --- UIA3 array iteration ---

    public static IEnumerable<IUIAutomationElement> IterateArray(IUIAutomationElementArray? array)
    {
        if (array == null) yield break;
        var len = array.Length;
        for (var i = 0; i < len; i++)
        {
            yield return array.GetElement(i);
        }
    }

    private static string[] SaveAll(IUIAutomationElementArray array, SessionState state)
    {
        var results = new List<string>();
        foreach (var el in IterateArray(array))
        {
            results.Add(state.SaveElementAndReturnId(el));
        }
        return results.ToArray();
    }
}
