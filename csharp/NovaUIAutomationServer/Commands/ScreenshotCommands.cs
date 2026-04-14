using System.Drawing;
using System.Drawing.Imaging;
using System.Text.Json;
using System.Windows.Automation;
using NovaUIAutomationServer.State;

namespace NovaUIAutomationServer.Commands;

public static class ScreenshotCommands
{
    public static object? GetScreenshot(SessionState state, JsonElement? parameters)
    {
        var root = state.RootElement;

        if (root == null)
        {
            // Return 1x1 transparent PNG if no root
            using var bitmap = new Bitmap(1, 1);
            using var stream = new MemoryStream();
            bitmap.Save(stream, ImageFormat.Png);
            return Convert.ToBase64String(stream.ToArray());
        }

        var rect = root.Current.BoundingRectangle;
        using var bmp = new Bitmap((int)rect.Width, (int)rect.Height);
        using var graphics = Graphics.FromImage(bmp);
        graphics.CopyFromScreen((int)rect.Left, (int)rect.Top, 0, 0, bmp.Size);

        using var ms = new MemoryStream();
        bmp.Save(ms, ImageFormat.Png);
        return Convert.ToBase64String(ms.ToArray());
    }

    public static object? GetElementScreenshot(SessionState state, JsonElement? parameters)
    {
        var p = parameters ?? throw new ArgumentException("Parameters required.");
        var elementId = p.GetProperty("elementId").GetString()
            ?? throw new ArgumentException("elementId is required.");

        var element = state.GetElement(elementId);
        var rect = element.Current.BoundingRectangle;

        using var bitmap = new Bitmap((int)rect.Width, (int)rect.Height);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen((int)rect.Left, (int)rect.Top, 0, 0, bitmap.Size);

        using var stream = new MemoryStream();
        bitmap.Save(stream, ImageFormat.Png);
        return Convert.ToBase64String(stream.ToArray());
    }
}
