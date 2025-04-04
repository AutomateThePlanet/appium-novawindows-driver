// Based on the original WinAppDriver Calculator test by Microsoft, licensed under the MIT License.

using OpenQA.Selenium;
using OpenQA.Selenium.Appium;

namespace CalculatorTest;

public class ScenarioStandardInvoke : CalculatorSession
{
    private static AppiumElement _header;
    private static AppiumElement _calculatorResult;

    [Test]
    public void Addition()
    {
        // Find the buttons by their names and click them in sequence to perform 1 + 7 = 8
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name("One")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name("Plus")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name("Seven")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name("Equals")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo("8"));
    }

    [Test]
    public void Division()
    {
        // Find the buttons by their accessibility ids and click them in sequence to perform 88 / 11 = 8
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("num8Button")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("num8Button")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("divideButton")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("num1Button")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("num1Button")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("equalButton")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo("8"));
    }

    [Test]
    public void Multiplication()
    {
        // Find the buttons by their names using XPath and click them in sequence to perform 9 x 9 = 81
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@Name='Nine']")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@Name='Multiply by']")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@Name='Nine']")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@Name='Equals']")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo("81"));
    }

    [Test]
    public void Subtraction()
    {
        // Find the buttons by their accessibility ids using XPath and click them in sequence to perform 9 - 1 = 8
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@AutomationId=\"num9Button\"]")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@AutomationId=\"minusButton\"]")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@AutomationId=\"num1Button\"]")));
        Session.ExecuteScript("windows: invoke", Session.FindElement(By.XPath("//Button[@AutomationId=\"equalButton\"]")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo("8"));
    }

    [TestCase("One",   "Plus",      "Seven", "8")]
    [TestCase("Nine",  "Minus",     "One",   "8")]
    [TestCase("Eight", "Divide by", "Eight", "1")]
    public void Templatized(string input1, string operation, string input2, string expectedResult)
    {
        // Run sequence of button presses specified above and validate the results
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name(input1)));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name(operation)));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name(input2)));
        Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.Name("Equals")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo(expectedResult));
    }

    [OneTimeSetUp]
    public static void ClassInitialize()
    {
        // Create session to launch a Calculator window
        Setup();

        // Identify calculator mode by locating the header
        try
        {
            _header = Session.FindElement(MobileBy.AccessibilityId("Header"));
        }
        catch
        {
            _header = Session.FindElement(MobileBy.AccessibilityId("ContentPresenter"));
        }

        // Ensure that calculator is in standard mode
        if (!_header.Text.Equals("Standard", StringComparison.OrdinalIgnoreCase))
        {
            Session.ExecuteScript("windows: invoke", Session.FindElement(MobileBy.AccessibilityId("TogglePaneButton")));
            Thread.Sleep(TimeSpan.FromSeconds(1));
            var splitViewPane = Session.FindElement(MobileBy.ClassName("SplitViewPane"));
            Session.ExecuteScript("windows: invoke", splitViewPane.FindElement(MobileBy.Name("Standard Calculator")));
            Thread.Sleep(TimeSpan.FromSeconds(1));
            Assert.That(_header.Text.Equals("Standard", StringComparison.OrdinalIgnoreCase), Is.True);
        }

        // Locate the calculatorResult element
        _calculatorResult = Session.FindElement(MobileBy.AccessibilityId("CalculatorResults"));
        Assert.That(_calculatorResult, Is.Not.Null);
    }

    [OneTimeTearDown]
    public static void ClassCleanup()
    {
        TearDown();
    }

    [SetUp]
    public void Clear()
    {
        Session.ExecuteScript("windows: invoke", Session?.FindElement(MobileBy.Name("Clear")));
        Assert.That(GetCalculatorResultText(), Is.EqualTo("0"));
    }

    private static string GetCalculatorResultText()
    {
        return _calculatorResult.Text.Replace("Display is", string.Empty).Trim();
    }
}