// Based on the original WinAppDriver Calculator test by Microsoft, licensed under the MIT License.

using OpenQA.Selenium.Appium;
using OpenQA.Selenium.Appium.Windows;

namespace CalculatorTest;

public class CalculatorSession
{
    private const string AppiumServerUrl = "http://127.0.0.1:4723/";
    private const string CalculatorAppId = "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App";

    protected static WindowsDriver Session { get; private set; }

    protected static void Setup()
    {
        if (Session != null) return;

        // Launch Calculator application if it is not yet launched
        // Create a new session to bring up an instance of the Calculator application
        // Note: Multiple calculator windows (instances) share the same process Id
        var appiumOptions = new AppiumOptions
        {
            App = CalculatorAppId,
            AutomationName = "NovaWindows",
            PlatformName = "Windows",
        };

        Session = new WindowsDriver(new Uri(AppiumServerUrl), appiumOptions);
        Assert.That(Session, Is.Not.Null);

        // Set implicit timeout to 1.5 seconds to make element search to retry every 500 ms for at most three times
        Session.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1.5);
    }

    protected static void TearDown()
    {
        if (Session == null) return;

        // Close the application and delete the session
        Session.Quit();
        Session = null;
    }
}