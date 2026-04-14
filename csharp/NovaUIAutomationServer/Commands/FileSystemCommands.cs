using System.Text.Json;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class FileSystemCommands
{
    public static object? DeleteFile(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var path = p.GetProperty("path").GetString()
            ?? throw new ArgumentException("path is required.");

        File.Delete(path);
        return null;
    }

    public static object? DeleteFolder(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var path = p.GetProperty("path").GetString()
            ?? throw new ArgumentException("path is required.");

        bool recursive = true;
        if (p.TryGetProperty("recursive", out var recProp))
        {
            recursive = recProp.GetBoolean();
        }

        Directory.Delete(path, recursive);
        return null;
    }
}
