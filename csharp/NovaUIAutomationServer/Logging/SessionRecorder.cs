using System.IO;
using System.Text.Json;
using NovaUIAutomationServer.Protocol;

namespace NovaUIAutomationServer.Logging;

public class SessionRecorder : IDisposable
{
    private readonly StreamWriter _writer;
    private readonly JsonSerializerOptions _jsonOptions;

    public SessionRecorder(string path)
    {
        _writer = new StreamWriter(path, append: false, encoding: System.Text.Encoding.UTF8)
        {
            AutoFlush = true,
        };
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
    }

    public void RecordRequest(Request request)
    {
        var entry = new
        {
            ts = DateTime.UtcNow.ToString("o"),
            direction = "request",
            request.Id,
            request.Method,
            request.Params,
        };
        _writer.WriteLine(JsonSerializer.Serialize(entry, _jsonOptions));
    }

    public void RecordResponse(Response response)
    {
        var entry = new
        {
            ts = DateTime.UtcNow.ToString("o"),
            direction = "response",
            response.Id,
            response.Result,
            response.Error,
            response.DurationMs,
        };
        _writer.WriteLine(JsonSerializer.Serialize(entry, _jsonOptions));
    }

    public void Dispose()
    {
        _writer.Dispose();
    }
}
