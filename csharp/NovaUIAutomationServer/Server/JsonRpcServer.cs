using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using NovaUIAutomationServer.Logging;
using NovaUIAutomationServer.Protocol;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Server;

public class JsonRpcServer
{
    private readonly CommandDispatcher _dispatcher;
    private readonly SessionState _state;
    private readonly SessionRecorder? _recorder;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonRpcServer(string? recordingPath = null)
    {
        _dispatcher = new CommandDispatcher();
        _state = new SessionState();
        _recorder = recordingPath != null ? new SessionRecorder(recordingPath) : null;

        _jsonOptions = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
    }

    public void Run()
    {
        // UIAutomation COM requires STA. Keep the entire request loop synchronous
        // so no await ever marshals a continuation onto an MTA thread-pool thread.
        Console.InputEncoding = System.Text.Encoding.UTF8;
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        LogToStderr("NovaUIAutomationServer started. Waiting for commands...");

        using var reader = new StreamReader(Console.OpenStandardInput(), System.Text.Encoding.UTF8);

        while (true)
        {
            var line = reader.ReadLine();

            if (line == null)
            {
                LogToStderr("stdin closed. Shutting down.");
                break;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            ProcessLine(line);
        }

        _state.Dispose();
        _recorder?.Dispose();
    }

    private void ProcessLine(string line)
    {
        Request? request = null;
        var sw = Stopwatch.StartNew();

        try
        {
            request = JsonSerializer.Deserialize<Request>(line, _jsonOptions);

            if (request == null)
            {
                WriteResponse(new Response
                {
                    Id = 0,
                    Error = new ErrorInfo { Code = ErrorCodes.InvalidArgument, Message = "Failed to parse request." },
                    DurationMs = sw.ElapsedMilliseconds,
                });
                return;
            }

            _recorder?.RecordRequest(request);
            LogToStderr($"[{request.Id}] -> {request.Method}");

            if (request.Method == "dispose")
            {
                _state.Dispose();
                var response = new Response
                {
                    Id = request.Id,
                    Result = null,
                    DurationMs = sw.ElapsedMilliseconds,
                };
                _recorder?.RecordResponse(response);
                WriteResponse(response);
                Environment.Exit(0);
                return;
            }

            if (!_dispatcher.HasHandler(request.Method))
            {
                var errorResponse = new Response
                {
                    Id = request.Id,
                    Error = new ErrorInfo { Code = ErrorCodes.UnknownMethod, Message = $"Unknown method: '{request.Method}'" },
                    DurationMs = sw.ElapsedMilliseconds,
                };
                _recorder?.RecordResponse(errorResponse);
                WriteResponse(errorResponse);
                return;
            }

            var result = _dispatcher.Execute(request.Method, _state, request.Params);
            sw.Stop();

            var successResponse = new Response
            {
                Id = request.Id,
                Result = result,
                DurationMs = sw.ElapsedMilliseconds,
            };

            _recorder?.RecordResponse(successResponse);

            if (sw.ElapsedMilliseconds > 500)
            {
                LogToStderr($"[{request.Id}] <- {request.Method} SLOW ({sw.ElapsedMilliseconds}ms)");
            }
            else
            {
                LogToStderr($"[{request.Id}] <- {request.Method} ({sw.ElapsedMilliseconds}ms)");
            }

            WriteResponse(successResponse);
        }
        catch (Exception ex)
        {
            sw.Stop();
            var errorCode = ex switch
            {
                KeyNotFoundException => ErrorCodes.ElementNotFound,
                ArgumentException => ErrorCodes.InvalidArgument,
                InvalidOperationException when ex.Message.Contains("Pattern") => ErrorCodes.PatternNotSupported,
                InvalidOperationException => ErrorCodes.InternalError,
                _ => ErrorCodes.InternalError,
            };

            var errorResponse = new Response
            {
                Id = request?.Id ?? 0,
                Error = new ErrorInfo { Code = errorCode, Message = ex.Message },
                DurationMs = sw.ElapsedMilliseconds,
            };

            _recorder?.RecordResponse(errorResponse);
            LogToStderr($"[{request?.Id}] ERROR {request?.Method}: {ex.Message}");
            WriteResponse(errorResponse);
        }
    }

    private void WriteResponse(Response response)
    {
        var json = JsonSerializer.Serialize(response, _jsonOptions);
        Console.WriteLine(json);
        Console.Out.Flush();
    }

    private static void LogToStderr(string message)
    {
        Console.Error.WriteLine($"[{DateTime.UtcNow:HH:mm:ss.fff}] {message}");
        Console.Error.Flush();
    }
}
