using System.Text.Json;
using System.Windows.Media.Imaging;
using NovaUIAutomationServer.State;
using Clipboard = System.Windows.Clipboard;

namespace NovaUIAutomationServer.Commands;

public static class ClipboardCommands
{
    public static object? GetClipboardText(SessionState state, JsonElement? parameters)
    {
        string? text = null;

        // Clipboard must be accessed from STA thread
        RunOnStaThread(() =>
        {
            text = Clipboard.GetText();
        });

        if (text == null) return "";
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(text));
    }

    public static object? SetClipboardText(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var b64Content = p.GetProperty("b64Content").GetString()
            ?? throw new ArgumentException("b64Content is required.");

        var text = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(b64Content));

        RunOnStaThread(() =>
        {
            Clipboard.SetText(text);
        });

        return null;
    }

    public static object? GetClipboardImage(SessionState state, JsonElement? parameters)
    {
        string? result = null;

        RunOnStaThread(() =>
        {
            var image = Clipboard.GetImage();
            if (image != null)
            {
                using var stream = new MemoryStream();
                var encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(image));
                encoder.Save(stream);
                result = Convert.ToBase64String(stream.ToArray());
            }
        });

        return result ?? "";
    }

    public static object? SetClipboardImage(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var b64Content = p.GetProperty("b64Content").GetString()
            ?? throw new ArgumentException("b64Content is required.");

        var bytes = Convert.FromBase64String(b64Content);

        RunOnStaThread(() =>
        {
            using var stream = new MemoryStream(bytes);
            var frame = BitmapFrame.Create(stream);
            Clipboard.SetImage(frame);
        });

        return null;
    }

    private static void RunOnStaThread(Action action)
    {
        if (Thread.CurrentThread.GetApartmentState() == ApartmentState.STA)
        {
            action();
            return;
        }

        Exception? caughtException = null;
        var thread = new Thread(() =>
        {
            try
            {
                action();
            }
            catch (Exception ex)
            {
                caughtException = ex;
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();

        if (caughtException != null)
        {
            throw caughtException;
        }
    }
}
