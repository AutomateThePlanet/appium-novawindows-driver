using NovaUIAutomationServer.Server;

namespace NovaUIAutomationServer;

class Program
{
    static void Main(string[] args)
    {
        string? recordingPath = null;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--record" && i + 1 < args.Length)
            {
                recordingPath = args[i + 1];
                i++;
            }
        }

        // UIAutomation COM objects require STA threading.
        // [STAThread] on async Main doesn't reliably set the apartment state,
        // so we create a dedicated STA thread and run the server on it.
        var staThread = new Thread(() =>
        {
            var server = new JsonRpcServer(recordingPath);
            server.Run();
        });
        staThread.SetApartmentState(ApartmentState.STA);
        staThread.Start();
        staThread.Join();
    }
}
