using System.Text.Json;
using NovaUIAutomationServer.Server;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class DiagnosticCommands
{
    private static readonly DateTime StartTime = DateTime.UtcNow;

    public static object? Ping(SessionState state, JsonElement? parameters)
    {
        return new
        {
            status = "pong",
            uptimeSeconds = (long)(DateTime.UtcNow - StartTime).TotalSeconds,
            elementCount = state.ElementTable.Count,
            hasRootElement = state.RootElement != null,
        };
    }

    public static object? InspectElementTable(SessionState state, JsonElement? parameters)
    {
        var entries = new List<object>();

        foreach (var kvp in state.ElementTable)
        {
            string name = "";
            string controlType = "";
            bool isAlive = false;

            try
            {
                name = kvp.Value.get_CurrentName() ?? "";
                var ctId = kvp.Value.CurrentControlType;
                controlType = ConditionBuilder.ControlTypeNameById.TryGetValue(ctId, out var n) ? n : ctId.ToString();
                isAlive = true;
            }
            catch
            {
                // Element is no longer valid
            }

            entries.Add(new
            {
                runtimeId = kvp.Key,
                name,
                controlType,
                isAlive,
            });
        }

        return entries;
    }
}
