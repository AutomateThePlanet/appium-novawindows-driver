// Hand-written UIA3 (UIAutomationClient COM) interop declarations.
//
// Why hand-written: <COMReference Include="UIAutomationClient"> produces
// identical output but relies on the ResolveComReference MSBuild task, which
// .NET SDK MSBuild doesn't implement (MSB4803). Hand-writing the minimum
// surface we use — core finds, patterns we actually call, conditions, tree
// walker, cache request — keeps us on `dotnet build` with no external deps.
//
// Stability: IID/CLSID values and vtable layouts of `CUIAutomation`,
// `IUIAutomation`, `IUIAutomationElement`, and the patterns below are part of
// Windows's long-standing public UIA3 contract (Windows 7+). We intentionally
// avoid `IUIAutomation2`+ additions and higher-numbered pattern IDs so the
// same interop works on every Windows version that ships with UIAutomationCore.dll.
//
// Conventions:
// - Property accessors use distinct signatures (no C# get_/set_ pairs) because
//   the vtable order must match the IDL. GetCurrentX() / PutCurrentX() matches
//   tlbimp-generated code.
// - `object` in signatures represents VARIANT; the CLR marshals VARIANT<->object
//   automatically for primitives, BSTR, SAFEARRAY, and IUnknown.
// - `tagRECT` / `tagPOINT` are defined below as structs to match UIA's layout.

using System;
using System.Runtime.InteropServices;

namespace NovaUIAutomationServer.Uia3;

[StructLayout(LayoutKind.Sequential)]
public struct tagRECT
{
    public int left;
    public int top;
    public int right;
    public int bottom;
}

[StructLayout(LayoutKind.Sequential)]
public struct tagPOINT
{
    public int x;
    public int y;
}

// ----- Enums ------------------------------------------------------------

[Flags]
public enum TreeScope
{
    Element = 0x1,
    Children = 0x2,
    Descendants = 0x4,
    Subtree = Element | Children | Descendants,  // 0x7
    Parent = 0x8,
    Ancestors = 0x10,
}

public enum ToggleState
{
    Off = 0,
    On = 1,
    Indeterminate = 2,
}

public enum WindowVisualState
{
    Normal = 0,
    Maximized = 1,
    Minimized = 2,
}

public enum OrientationType
{
    None = 0,
    Horizontal = 1,
    Vertical = 2,
}

// ----- Property / Pattern / ControlType IDs -----------------------------

public static class UIA
{
    // Property IDs (from UIAutomationClient.h). Only the ones we expose.
    public const int RuntimeIdPropertyId = 30000;
    public const int BoundingRectanglePropertyId = 30001;
    public const int ProcessIdPropertyId = 30002;
    public const int ControlTypePropertyId = 30003;
    public const int LocalizedControlTypePropertyId = 30004;
    public const int NamePropertyId = 30005;
    public const int AcceleratorKeyPropertyId = 30006;
    public const int AccessKeyPropertyId = 30007;
    public const int HasKeyboardFocusPropertyId = 30008;
    public const int IsKeyboardFocusablePropertyId = 30009;
    public const int IsEnabledPropertyId = 30010;
    public const int AutomationIdPropertyId = 30011;
    public const int ClassNamePropertyId = 30012;
    public const int HelpTextPropertyId = 30013;
    public const int ClickablePointPropertyId = 30014;
    public const int CulturePropertyId = 30015;
    public const int IsControlElementPropertyId = 30016;
    public const int IsContentElementPropertyId = 30017;
    public const int LabeledByPropertyId = 30018;
    public const int IsPasswordPropertyId = 30019;
    public const int NativeWindowHandlePropertyId = 30020;
    public const int ItemTypePropertyId = 30021;
    public const int IsOffscreenPropertyId = 30022;
    public const int OrientationPropertyId = 30023;
    public const int FrameworkIdPropertyId = 30024;
    public const int IsRequiredForFormPropertyId = 30025;
    public const int ItemStatusPropertyId = 30026;
    public const int IsDockPatternAvailablePropertyId = 30027;
    public const int IsExpandCollapsePatternAvailablePropertyId = 30028;
    public const int IsGridItemPatternAvailablePropertyId = 30029;
    public const int IsGridPatternAvailablePropertyId = 30030;
    public const int IsInvokePatternAvailablePropertyId = 30031;
    public const int IsMultipleViewPatternAvailablePropertyId = 30032;
    public const int IsRangeValuePatternAvailablePropertyId = 30033;
    public const int IsScrollPatternAvailablePropertyId = 30034;
    public const int IsScrollItemPatternAvailablePropertyId = 30035;
    public const int IsSelectionItemPatternAvailablePropertyId = 30036;
    public const int IsSelectionPatternAvailablePropertyId = 30037;
    public const int IsTablePatternAvailablePropertyId = 30038;
    public const int IsTableItemPatternAvailablePropertyId = 30039;
    public const int IsTextPatternAvailablePropertyId = 30040;
    public const int IsTogglePatternAvailablePropertyId = 30041;
    public const int IsTransformPatternAvailablePropertyId = 30042;
    public const int IsValuePatternAvailablePropertyId = 30043;
    public const int IsWindowPatternAvailablePropertyId = 30044;
    public const int SizeOfSetPropertyId = 30166;
    public const int PositionInSetPropertyId = 30165;
    public const int HeadingLevelPropertyId = 30173;
    public const int IsDialogPropertyId = 30174;

    // Pattern IDs
    public const int InvokePatternId = 10000;
    public const int SelectionPatternId = 10001;
    public const int ValuePatternId = 10002;
    public const int RangeValuePatternId = 10003;
    public const int ScrollPatternId = 10004;
    public const int ExpandCollapsePatternId = 10005;
    public const int GridPatternId = 10006;
    public const int GridItemPatternId = 10007;
    public const int MultipleViewPatternId = 10008;
    public const int WindowPatternId = 10009;
    public const int SelectionItemPatternId = 10010;
    public const int DockPatternId = 10011;
    public const int TablePatternId = 10012;
    public const int TableItemPatternId = 10013;
    public const int TextPatternId = 10014;
    public const int TogglePatternId = 10015;
    public const int TransformPatternId = 10016;
    public const int ScrollItemPatternId = 10017;
    public const int LegacyIAccessiblePatternId = 10018;

    // Control Type IDs
    public const int ButtonControlTypeId = 50000;
    public const int CalendarControlTypeId = 50001;
    public const int CheckBoxControlTypeId = 50002;
    public const int ComboBoxControlTypeId = 50003;
    public const int EditControlTypeId = 50004;
    public const int HyperlinkControlTypeId = 50005;
    public const int ImageControlTypeId = 50006;
    public const int ListItemControlTypeId = 50007;
    public const int ListControlTypeId = 50008;
    public const int MenuControlTypeId = 50009;
    public const int MenuBarControlTypeId = 50010;
    public const int MenuItemControlTypeId = 50011;
    public const int ProgressBarControlTypeId = 50012;
    public const int RadioButtonControlTypeId = 50013;
    public const int ScrollBarControlTypeId = 50014;
    public const int SliderControlTypeId = 50015;
    public const int SpinnerControlTypeId = 50016;
    public const int StatusBarControlTypeId = 50017;
    public const int TabControlTypeId = 50018;
    public const int TabItemControlTypeId = 50019;
    public const int TextControlTypeId = 50020;
    public const int ToolBarControlTypeId = 50021;
    public const int ToolTipControlTypeId = 50022;
    public const int TreeControlTypeId = 50023;
    public const int TreeItemControlTypeId = 50024;
    public const int CustomControlTypeId = 50025;
    public const int GroupControlTypeId = 50026;
    public const int ThumbControlTypeId = 50027;
    public const int DataGridControlTypeId = 50028;
    public const int DataItemControlTypeId = 50029;
    public const int DocumentControlTypeId = 50030;
    public const int SplitButtonControlTypeId = 50031;
    public const int WindowControlTypeId = 50032;
    public const int PaneControlTypeId = 50033;
    public const int HeaderControlTypeId = 50034;
    public const int HeaderItemControlTypeId = 50035;
    public const int TableControlTypeId = 50036;
    public const int TitleBarControlTypeId = 50037;
    public const int SeparatorControlTypeId = 50038;
    public const int SemanticZoomControlTypeId = 50039;
    public const int AppBarControlTypeId = 50040;
}

// ----- Interfaces -------------------------------------------------------

[ComImport, Guid("352FFBA8-0973-437C-A61F-F64CAFD81DF9"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationCondition
{
}

[ComImport, Guid("1B4E1F2E-75EB-4D0B-8952-5A69988E2307"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationBoolCondition : IUIAutomationCondition
{
    int BooleanValue { [return: MarshalAs(UnmanagedType.Bool)] get; }
}

[ComImport, Guid("99EBF2CB-5578-4267-9AD4-AFD6EA77E94B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationPropertyCondition : IUIAutomationCondition
{
    int PropertyId { get; }
    object PropertyValue { [return: MarshalAs(UnmanagedType.Struct)] get; }
    int PropertyConditionFlags { get; }
}

[ComImport, Guid("A7D0AF36-B912-45FE-9855-091DDC174AEC"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationAndCondition : IUIAutomationCondition
{
    int ChildCount { get; }
    void GetChildrenAsNativeArray(out IntPtr childArray, out int childArrayCount);
    [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_UNKNOWN)]
    IUIAutomationCondition[] GetChildren();
}

[ComImport, Guid("8753F032-3DB1-47B5-A1FC-6E34A266C712"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationOrCondition : IUIAutomationCondition
{
    int ChildCount { get; }
    void GetChildrenAsNativeArray(out IntPtr childArray, out int childArrayCount);
    [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_UNKNOWN)]
    IUIAutomationCondition[] GetChildren();
}

[ComImport, Guid("F528B657-847B-498C-8896-D52B565407A1"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationNotCondition : IUIAutomationCondition
{
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition GetChild();
}

[ComImport, Guid("B32A92B5-BC25-4078-9C08-D7EE95C48E03"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationCacheRequest
{
    void AddProperty(int propertyId);
    void AddPattern(int patternId);
    IUIAutomationCacheRequest Clone();
    TreeScope TreeScope { get; set; }
    IUIAutomationCondition TreeFilter { get; set; }
    int AutomationElementMode { get; set; }
}

[ComImport, Guid("14314595-B4BC-4055-95F2-58F2E42C9855"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationElementArray
{
    int Length { get; }
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetElement(int index);
}

[ComImport, Guid("D22108AA-8AC5-49A5-837B-37BBB3D7591E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationElement
{
    void SetFocus();

    [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)]
    int[] GetRuntimeId();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement FindFirst(TreeScope scope, IUIAutomationCondition condition);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElementArray FindAll(TreeScope scope, IUIAutomationCondition condition);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement FindFirstBuildCache(TreeScope scope, IUIAutomationCondition condition, IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElementArray FindAllBuildCache(TreeScope scope, IUIAutomationCondition condition, IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement BuildUpdatedCache(IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Struct)]
    object GetCurrentPropertyValue(int propertyId);

    [return: MarshalAs(UnmanagedType.Struct)]
    object GetCurrentPropertyValueEx(int propertyId, int ignoreDefaultValue);

    [return: MarshalAs(UnmanagedType.Struct)]
    object GetCachedPropertyValue(int propertyId);

    [return: MarshalAs(UnmanagedType.Struct)]
    object GetCachedPropertyValueEx(int propertyId, int ignoreDefaultValue);

    IntPtr GetCurrentPatternAs([In] int patternId, [In] ref Guid riid);
    IntPtr GetCachedPatternAs([In] int patternId, [In] ref Guid riid);

    [return: MarshalAs(UnmanagedType.IUnknown)]
    object GetCurrentPattern(int patternId);

    [return: MarshalAs(UnmanagedType.IUnknown)]
    object GetCachedPattern(int patternId);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetCachedParent();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElementArray GetCachedChildren();

    int CurrentProcessId { get; }
    int CurrentControlType { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentLocalizedControlType();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentName();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentAcceleratorKey();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentAccessKey();
    int CurrentHasKeyboardFocus { get; }
    int CurrentIsKeyboardFocusable { get; }
    int CurrentIsEnabled { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentAutomationId();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentClassName();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentHelpText();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentCulture();
    int CurrentIsControlElement { get; }
    int CurrentIsContentElement { get; }
    int CurrentIsPassword { get; }
    IntPtr CurrentNativeWindowHandle { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentItemType();
    int CurrentIsOffscreen { get; }
    OrientationType CurrentOrientation { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentFrameworkId();
    int CurrentIsRequiredForForm { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentItemStatus();
    tagRECT CurrentBoundingRectangle { get; }

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetCurrentLabeledBy();

    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentAriaRole();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentAriaProperties();
    int CurrentIsDataValidForForm { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentControllerFor();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentDescribedBy();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentFlowsTo();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentProviderDescription();

    // Cached variants — we don't use them but must preserve vtable order.
    int CachedProcessId { get; }
    int CachedControlType { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedLocalizedControlType();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedName();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedAcceleratorKey();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedAccessKey();
    int CachedHasKeyboardFocus { get; }
    int CachedIsKeyboardFocusable { get; }
    int CachedIsEnabled { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedAutomationId();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedClassName();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedHelpText();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedCulture();
    int CachedIsControlElement { get; }
    int CachedIsContentElement { get; }
    int CachedIsPassword { get; }
    IntPtr CachedNativeWindowHandle { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedItemType();
    int CachedIsOffscreen { get; }
    OrientationType CachedOrientation { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedFrameworkId();
    int CachedIsRequiredForForm { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedItemStatus();
    tagRECT CachedBoundingRectangle { get; }

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetCachedLabeledBy();

    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedAriaRole();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedAriaProperties();
    int CachedIsDataValidForForm { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedControllerFor();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedDescribedBy();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedFlowsTo();
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedProviderDescription();

    // IDL: HRESULT GetClickablePoint([out] POINT* pt, [out, retval] BOOL* gotClickable).
    // BOOL retval becomes the managed return (non-zero = got a point); POINT is a
    // regular out parameter. Earlier draft had these flipped, which corrupted the
    // result — btnLoginOK clicks fired at bogus coordinates.
    int GetClickablePoint(out tagPOINT clickablePoint);
}

[ComImport, Guid("4042C624-389C-4AFC-A630-9DF854A541FC"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTreeWalker
{
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetParentElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetFirstChildElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetLastChildElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetNextSiblingElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetPreviousSiblingElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? NormalizeElement(IUIAutomationElement element);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetParentElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetFirstChildElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetLastChildElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetNextSiblingElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? GetPreviousSiblingElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement? NormalizeElementBuildCache(IUIAutomationElement element, IUIAutomationCacheRequest cacheRequest);
    IUIAutomationCondition Condition { [return: MarshalAs(UnmanagedType.Interface)] get; }
}

[ComImport, Guid("30CBE57D-D9D0-452A-AB13-7AC5AC4825EE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomation
{
    int CompareElements(IUIAutomationElement el1, IUIAutomationElement el2);
    int CompareRuntimeIds([MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)] int[] runtimeId1, [MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)] int[] runtimeId2);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetRootElement();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromHandle(IntPtr hwnd);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromPoint(tagPOINT pt);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetFocusedElement();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetRootElementBuildCache(IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromHandleBuildCache(IntPtr hwnd, IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromPointBuildCache(tagPOINT pt, IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement GetFocusedElementBuildCache(IUIAutomationCacheRequest cacheRequest);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationTreeWalker CreateTreeWalker(IUIAutomationCondition pCondition);

    IUIAutomationTreeWalker ControlViewWalker { [return: MarshalAs(UnmanagedType.Interface)] get; }
    IUIAutomationTreeWalker ContentViewWalker { [return: MarshalAs(UnmanagedType.Interface)] get; }
    IUIAutomationTreeWalker RawViewWalker { [return: MarshalAs(UnmanagedType.Interface)] get; }
    IUIAutomationCondition RawViewCondition { [return: MarshalAs(UnmanagedType.Interface)] get; }
    IUIAutomationCondition ControlViewCondition { [return: MarshalAs(UnmanagedType.Interface)] get; }
    IUIAutomationCondition ContentViewCondition { [return: MarshalAs(UnmanagedType.Interface)] get; }

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCacheRequest CreateCacheRequest();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateTrueCondition();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateFalseCondition();

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreatePropertyCondition(int propertyId, [MarshalAs(UnmanagedType.Struct)] object value);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreatePropertyConditionEx(int propertyId, [MarshalAs(UnmanagedType.Struct)] object value, int flags);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateAndCondition(IUIAutomationCondition condition1, IUIAutomationCondition condition2);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateAndConditionFromArray([MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_UNKNOWN)] IUIAutomationCondition[] conditions);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateAndConditionFromNativeArray(IntPtr conditions, int conditionCount);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateOrCondition(IUIAutomationCondition condition1, IUIAutomationCondition condition2);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateOrConditionFromArray([MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_UNKNOWN)] IUIAutomationCondition[] conditions);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateOrConditionFromNativeArray(IntPtr conditions, int conditionCount);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationCondition CreateNotCondition(IUIAutomationCondition condition);

    // Event methods below — we don't use them but preserve vtable order.
    void AddAutomationEventHandler();
    void RemoveAutomationEventHandler();
    void AddPropertyChangedEventHandlerNativeArray();
    void AddPropertyChangedEventHandler();
    void RemovePropertyChangedEventHandler();
    void AddStructureChangedEventHandler();
    void RemoveStructureChangedEventHandler();
    void AddFocusChangedEventHandler();
    void RemoveFocusChangedEventHandler();
    void RemoveAllEventHandlers();

    [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)]
    int[] IntSafeArrayToNativeArray([MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)] int[] intArray, out IntPtr array);

    [return: MarshalAs(UnmanagedType.Struct)]
    object IntNativeArrayToSafeArray(IntPtr array, int arrayCount);

    int CheckNotSupported([MarshalAs(UnmanagedType.Struct)] object value);

    object ReservedNotSupportedValue { [return: MarshalAs(UnmanagedType.Struct)] get; }
    object ReservedMixedAttributeValue { [return: MarshalAs(UnmanagedType.Struct)] get; }

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromIAccessible([MarshalAs(UnmanagedType.Interface)] object accessible, int childId);

    [return: MarshalAs(UnmanagedType.Interface)]
    IUIAutomationElement ElementFromIAccessibleBuildCache([MarshalAs(UnmanagedType.Interface)] object accessible, int childId, IUIAutomationCacheRequest cacheRequest);
}

// ----- Patterns ---------------------------------------------------------

[ComImport, Guid("FB377FBE-8EA6-46D5-9C73-6499CAD4B1A3"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationInvokePattern
{
    void Invoke();
}

[ComImport, Guid("94CF8058-9B8D-4AB9-8BFD-4CD0A33C8C70"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTogglePattern
{
    void Toggle();
    ToggleState CurrentToggleState { get; }
    ToggleState CachedToggleState { get; }
}

[ComImport, Guid("A94CD8B1-0844-4CD6-9D2D-640537AB39E9"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationValuePattern
{
    void SetValue([MarshalAs(UnmanagedType.BStr)] string val);
    [return: MarshalAs(UnmanagedType.BStr)] string get_CurrentValue();
    int CurrentIsReadOnly { get; }
    [return: MarshalAs(UnmanagedType.BStr)] string get_CachedValue();
    int CachedIsReadOnly { get; }
}

[ComImport, Guid("0E0D7C4C-3F80-11D9-8B6C-00065B84C5EA"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationRangeValuePattern
{
    void SetValue(double val);
    double CurrentValue { get; }
    int CurrentIsReadOnly { get; }
    double CurrentMaximum { get; }
    double CurrentMinimum { get; }
    double CurrentLargeChange { get; }
    double CurrentSmallChange { get; }
    double CachedValue { get; }
    int CachedIsReadOnly { get; }
    double CachedMaximum { get; }
    double CachedMinimum { get; }
    double CachedLargeChange { get; }
    double CachedSmallChange { get; }
}

[ComImport, Guid("619BE086-1F4E-4EE4-BAFA-210128738730"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationExpandCollapsePattern
{
    void Expand();
    void Collapse();
    int CurrentExpandCollapseState { get; }
    int CachedExpandCollapseState { get; }
}

[ComImport, Guid("B488300F-D015-4F19-9C29-BB595E3645EF"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationScrollItemPattern
{
    void ScrollIntoView();
}

[ComImport, Guid("A8EFA66A-0FDA-421A-9194-38021F3578EA"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationSelectionItemPattern
{
    void Select();
    void AddToSelection();
    void RemoveFromSelection();
    int CurrentIsSelected { get; }
    IUIAutomationElement CurrentSelectionContainer { [return: MarshalAs(UnmanagedType.Interface)] get; }
    int CachedIsSelected { get; }
    IUIAutomationElement CachedSelectionContainer { [return: MarshalAs(UnmanagedType.Interface)] get; }
}

[ComImport, Guid("5ED5202E-B2AC-47A6-B638-4B0BF140D78E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationSelectionPattern
{
    [return: MarshalAs(UnmanagedType.Interface)] IUIAutomationElementArray GetCurrentSelection();
    int CurrentCanSelectMultiple { get; }
    int CurrentIsSelectionRequired { get; }
    [return: MarshalAs(UnmanagedType.Interface)] IUIAutomationElementArray GetCachedSelection();
    int CachedCanSelectMultiple { get; }
    int CachedIsSelectionRequired { get; }
}

[ComImport, Guid("0FAEF453-9208-43EF-BBB2-3B485177864F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationWindowPattern
{
    void Close();
    void WaitForInputIdle(int milliseconds, out int success);
    void SetWindowVisualState(WindowVisualState state);
    int CurrentCanMaximize { get; }
    int CurrentCanMinimize { get; }
    int CurrentIsModal { get; }
    int CurrentIsTopmost { get; }
    WindowVisualState CurrentWindowVisualState { get; }
    int CurrentWindowInteractionState { get; }
    int CachedCanMaximize { get; }
    int CachedCanMinimize { get; }
    int CachedIsModal { get; }
    int CachedIsTopmost { get; }
    WindowVisualState CachedWindowVisualState { get; }
    int CachedWindowInteractionState { get; }
}

[ComImport, Guid("A9B55844-A55D-4EF0-926D-569C16FF89BB"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTransformPattern
{
    void Move(double x, double y);
    void Resize(double width, double height);
    void Rotate(double degrees);
    int CurrentCanMove { get; }
    int CurrentCanResize { get; }
    int CurrentCanRotate { get; }
    int CachedCanMove { get; }
    int CachedCanResize { get; }
    int CachedCanRotate { get; }
}

[ComImport, Guid("32EBA289-3583-42C9-9C59-3B6D9A1E9B6A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTextPattern
{
    IUIAutomationTextRange RangeFromPoint(tagPOINT pt);
    IUIAutomationTextRange RangeFromChild(IUIAutomationElement child);
    IUIAutomationTextRangeArray GetSelection();
    IUIAutomationTextRangeArray GetVisibleRanges();
    IUIAutomationTextRange DocumentRange { get; }
    int SupportedTextSelection { get; }
}

[ComImport, Guid("A543CC6A-F4AE-494B-8239-C814481187A8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTextRange
{
    IUIAutomationTextRange Clone();
    int Compare(IUIAutomationTextRange range);
    int CompareEndpoints(int srcEndPoint, IUIAutomationTextRange range, int targetEndPoint);
    void ExpandToEnclosingUnit(int textUnit);
    IUIAutomationTextRange FindAttribute(int attr, [MarshalAs(UnmanagedType.Struct)] object val, int backward);
    IUIAutomationTextRange FindText([MarshalAs(UnmanagedType.BStr)] string text, int backward, int ignoreCase);
    [return: MarshalAs(UnmanagedType.Struct)] object GetAttributeValue(int attr);
    [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_R8)] double[] GetBoundingRectangles();
    IUIAutomationElement GetEnclosingElement();
    [return: MarshalAs(UnmanagedType.BStr)] string GetText(int maxLength);
    void Move(int unit, int count, out int moved);
    void MoveEndpointByUnit(int endpoint, int unit, int count, out int moved);
    void MoveEndpointByRange(int srcEndPoint, IUIAutomationTextRange range, int targetEndPoint);
    void Select();
    void AddToSelection();
    void RemoveFromSelection();
    void ScrollIntoView(int alignToTop);
    IUIAutomationElementArray GetChildren();
}

[ComImport, Guid("CE4AE76A-E717-4C98-81EA-47371D028EB6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IUIAutomationTextRangeArray
{
    int Length { get; }
    IUIAutomationTextRange GetElement(int index);
}

// ----- CoClass ----------------------------------------------------------

[ComImport, Guid("FF48DBA4-60EF-4201-AA87-54103EEF594E")]
public class CUIAutomationClass
{
}

public static class Uia3Factory
{
    public static IUIAutomation Create()
    {
        return (IUIAutomation)(object)new CUIAutomationClass();
    }
}
