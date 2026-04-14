using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;

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

        var searchRoot = contextElementId != null
            ? state.GetElement(contextElementId)
            : (state.RootElement ?? AutomationElement.RootElement);

        var condition = ConditionBuilder.Build(conditionDto);

        switch (scope.ToLowerInvariant())
        {
            case "descendants":
                return FindFirstRecursively(searchRoot, condition, state);
            case "children":
            {
                var element = searchRoot.FindFirst(TreeScope.Children, condition);
                return element != null ? state.SaveElementAndReturnId(element) : null;
            }
            case "element":
            {
                var element = searchRoot.FindFirst(TreeScope.Element, condition);
                return element != null ? state.SaveElementAndReturnId(element) : null;
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
                var element = searchRoot.FindFirst(TreeScope.Element | TreeScope.Children, condition);
                return element != null ? state.SaveElementAndReturnId(element) : null;
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

        var searchRoot = contextElementId != null
            ? state.GetElement(contextElementId)
            : (state.RootElement ?? AutomationElement.RootElement);

        var condition = ConditionBuilder.Build(conditionDto);

        switch (scope.ToLowerInvariant())
        {
            case "descendants":
                return FindAllRecursively(searchRoot, condition, state);
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
        var focused = AutomationElement.FocusedElement;
        return state.SaveElementAndReturnId(focused);
    }

    public static object? SaveRootElementToTable(SessionState state, JsonElement? parameters)
    {
        var root = state.RootElement ?? AutomationElement.RootElement;
        return state.SaveElementAndReturnId(root);
    }

    public static object? LookupElement(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        return state.ElementTable.ContainsKey(elementId);
    }

    // --- Recursive find implementations matching the PowerShell versions ---

    private static string? FindFirstRecursively(AutomationElement element, Condition condition, SessionState state, bool includeSelf = false)
    {
        var scope = includeSelf ? (TreeScope.Element | TreeScope.Children) : TreeScope.Children;
        var found = element.FindFirst(scope, condition);

        if (found != null)
        {
            return state.SaveElementAndReturnId(found);
        }

        var children = element.FindAll(TreeScope.Children, Condition.TrueCondition);
        foreach (AutomationElement child in children)
        {
            var allResults = FindAllRecursivelyInternal(child, condition, returnFirstResult: true);
            if (allResults.Count > 0)
            {
                return state.SaveElementAndReturnId(allResults[0]);
            }
        }

        return null;
    }

    private static string[] FindAllRecursively(AutomationElement element, Condition condition, SessionState state, bool includeSelf = false)
    {
        var results = FindAllRecursivelyInternal(element, condition, includeSelf: includeSelf);
        return results.Select(el => state.SaveElementAndReturnId(el)).ToArray();
    }

    private static List<AutomationElement> FindAllRecursivelyInternal(AutomationElement element, Condition condition,
        bool returnFirstResult = false, bool includeSelf = false)
    {
        var validChildren = new List<AutomationElement>();
        var children = element.FindAll(TreeScope.Children, Condition.TrueCondition);

        foreach (AutomationElement child in children)
        {
            var match = child.FindFirst(TreeScope.Element, condition);
            if (match != null)
            {
                validChildren.Add(child);
            }
        }

        if (includeSelf)
        {
            var selfMatch = element.FindFirst(TreeScope.Element, condition);
            if (selfMatch != null)
            {
                validChildren.Add(selfMatch);
            }
        }

        foreach (AutomationElement child in children)
        {
            var allResults = FindAllRecursivelyInternal(child, condition);
            if (returnFirstResult && allResults.Count > 0)
            {
                return allResults;
            }

            foreach (var result in allResults)
            {
                var match = result.FindFirst(TreeScope.Element, condition);
                if (match != null)
                {
                    validChildren.Add(result);
                }
            }
        }

        return validChildren;
    }

    // --- Ancestor / Following / Preceding traversal ---

    private static string? FindFirstAncestor(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var el = element;
        while ((el = walker.GetParent(el)) != null)
        {
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                return state.SaveElementAndReturnId(el);
            }
        }
        return null;
    }

    private static string? FindFirstAncestorOrSelf(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var el = element;
        while (el != null)
        {
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                return state.SaveElementAndReturnId(el);
            }
            el = walker.GetParent(el);
        }
        return null;
    }

    private static string[] FindAllAncestors(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var results = new List<string>();
        var el = element;
        while ((el = walker.GetParent(el)) != null)
        {
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                results.Add(state.SaveElementAndReturnId(valid));
            }
        }
        return results.ToArray();
    }

    private static string[] FindAllAncestorsOrSelf(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                results.Add(state.SaveElementAndReturnId(valid));
            }
            el = walker.GetParent(el);
        }
        return results.ToArray();
    }

    private static string? FindParent(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var parent = walker.GetParent(element);
        if (parent == null) return null;

        var valid = parent.FindFirst(TreeScope.Element, condition);
        return valid != null ? state.SaveElementAndReturnId(valid) : null;
    }

    private static string? FindFollowing(AutomationElement element, Condition condition, SessionState state)
    {
        var filterCondition = state.CacheRequest?.TreeFilter ?? Automation.ControlViewCondition;
        var walker = new TreeWalker(new AndCondition(filterCondition, condition));
        var el = element;
        while (el != null)
        {
            var nextSibling = walker.GetNextSibling(el);
            if (nextSibling != null)
            {
                return state.SaveElementAndReturnId(nextSibling);
            }
            el = walker.GetParent(el);
        }
        return null;
    }

    private static string[] FindAllFollowing(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            var nextSibling = walker.GetNextSibling(el);
            if (nextSibling != null)
            {
                el = nextSibling;
                results.Add(state.SaveElementAndReturnId(el));
                var children = el.FindAll(TreeScope.Children, condition);
                foreach (AutomationElement child in children)
                {
                    results.Add(state.SaveElementAndReturnId(child));
                }
            }
            else
            {
                el = walker.GetParent(el);
            }
        }
        return results.ToArray();
    }

    private static string? FindFollowingSibling(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var el = element;
        while (true)
        {
            var nextSibling = walker.GetNextSibling(el);
            if (nextSibling == null) break;
            el = nextSibling;
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                return state.SaveElementAndReturnId(el);
            }
        }
        return null;
    }

    private static string[] FindAllFollowingSiblings(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var results = new List<string>();
        var el = element;
        while (true)
        {
            var nextSibling = walker.GetNextSibling(el);
            if (nextSibling == null) break;
            el = nextSibling;
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                results.Add(state.SaveElementAndReturnId(valid));
            }
        }
        return results.ToArray();
    }

    private static string? FindPreceding(AutomationElement element, Condition condition, SessionState state)
    {
        var filterCondition = state.CacheRequest?.TreeFilter ?? Automation.ControlViewCondition;
        var walker = new TreeWalker(new AndCondition(filterCondition, condition));
        var el = element;
        while (el != null)
        {
            var prevSibling = walker.GetPreviousSibling(el);
            if (prevSibling != null)
            {
                return state.SaveElementAndReturnId(prevSibling);
            }
            el = walker.GetParent(el);
        }
        return null;
    }

    private static string[] FindAllPreceding(AutomationElement element, Condition condition, SessionState state)
    {
        var filterCondition = state.CacheRequest?.TreeFilter ?? Automation.ControlViewCondition;
        var walker = new TreeWalker(new AndCondition(filterCondition, condition));
        var results = new List<string>();
        var el = element;
        while (el != null)
        {
            var prevSibling = walker.GetPreviousSibling(el);
            if (prevSibling != null)
            {
                el = prevSibling;
                results.Add(state.SaveElementAndReturnId(el));
                var children = el.FindAll(TreeScope.Children, condition);
                foreach (AutomationElement child in children)
                {
                    results.Add(state.SaveElementAndReturnId(child));
                }
            }
            else
            {
                el = walker.GetParent(el);
            }
        }
        return results.ToArray();
    }

    private static string? FindPrecedingSibling(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var el = element;
        while (true)
        {
            var prevSibling = walker.GetPreviousSibling(el);
            if (prevSibling == null) break;
            el = prevSibling;
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                return state.SaveElementAndReturnId(el);
            }
        }
        return null;
    }

    private static string[] FindAllPrecedingSiblings(AutomationElement element, Condition condition, SessionState state)
    {
        var walker = state.TreeWalker ?? TreeWalker.ControlViewWalker;
        var results = new List<string>();
        var el = element;
        while (true)
        {
            var prevSibling = walker.GetPreviousSibling(el);
            if (prevSibling == null) break;
            el = prevSibling;
            var valid = el.FindFirst(TreeScope.Element, condition);
            if (valid != null)
            {
                results.Add(state.SaveElementAndReturnId(valid));
            }
        }
        return results.ToArray();
    }

    private static string[] SaveAll(AutomationElementCollection collection, SessionState state)
    {
        var results = new List<string>();
        foreach (AutomationElement element in collection)
        {
            results.Add(state.SaveElementAndReturnId(element));
        }
        return results.ToArray();
    }
}
