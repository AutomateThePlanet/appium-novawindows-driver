using System.Diagnostics;
using System.Text.Json;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class ProcessCommands
{
    public static object? StartProcess(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var path = p.GetProperty("path").GetString()
            ?? throw new ArgumentException("path is required.");

        string? arguments = null;
        if (p.TryGetProperty("arguments", out var argsProp) && argsProp.ValueKind == JsonValueKind.String)
        {
            arguments = argsProp.GetString();
        }

        string? workingDir = null;
        if (p.TryGetProperty("workingDir", out var wdProp) && wdProp.ValueKind == JsonValueKind.String)
        {
            workingDir = wdProp.GetString();
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = path,
            UseShellExecute = true,
        };

        if (!string.IsNullOrEmpty(arguments))
        {
            startInfo.Arguments = arguments;
        }

        if (!string.IsNullOrEmpty(workingDir))
        {
            startInfo.WorkingDirectory = workingDir;
        }

        var process = Process.Start(startInfo);
        return process?.Id;
    }

    public static object? GetProcessIds(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var processName = p.GetProperty("processName").GetString()
            ?? throw new ArgumentException("processName is required.");

        var processes = Process.GetProcessesByName(processName)
            .OrderByDescending(proc => proc.StartTime)
            .Select(proc => proc.Id)
            .ToArray();

        return processes;
    }

    public static object? StopProcess(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var pid = p.GetProperty("pid").GetInt32();

        bool force = true;
        if (p.TryGetProperty("force", out var forceProp))
        {
            force = forceProp.GetBoolean();
        }

        try
        {
            var process = Process.GetProcessById(pid);
            if (force)
            {
                process.Kill();
            }
            else
            {
                process.CloseMainWindow();
            }
        }
        catch (ArgumentException)
        {
            // Process already exited
        }

        return null;
    }

    public static object? ExecutePowerShellScript(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var script = p.GetProperty("script").GetString()
            ?? throw new ArgumentException("script is required.");

        string? workingDir = null;
        if (p.TryGetProperty("workingDir", out var wdProp) && wdProp.ValueKind == JsonValueKind.String)
        {
            workingDir = wdProp.GetString();
        }

        // Base64 encode the script for safe transport
        var base64Script = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(script));

        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -NonInteractive -Command \"[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{base64Script}')) | Invoke-Expression\"",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };

        if (!string.IsNullOrEmpty(workingDir))
        {
            startInfo.WorkingDirectory = workingDir;
        }

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start PowerShell process.");

        var stdout = process.StandardOutput.ReadToEnd();
        var stderr = process.StandardError.ReadToEnd();
        process.WaitForExit();

        if (!string.IsNullOrEmpty(stderr))
        {
            throw new InvalidOperationException(stderr);
        }

        return stdout.Trim();
    }
}
