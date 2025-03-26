import { Enum } from '../../enums';

export const SystemMetric = Object.freeze({
/** The flags that specify how the system arranged minimized windows. For more information, see the Remarks section in this topic. */
SM_ARRANGE: 56,
/** The value that specifies how the system is started:
 0 Normal boot
 1 Fail-safe boot
 2 Fail-safe with network boot
 A fail-safe boot (also called SafeBoot, Safe Mode, or Clean Boot) bypasses the user startup files. */
SM_CLEANBOOT: 67,
/** The number of display monitors on a desktop. For more information, see the Remarks section in this topic. */
SM_CMONITORS: 80,
/** The number of buttons on a mouse, or zero if no mouse is installed. */
SM_CMOUSEBUTTONS: 43,
/** Reflects the state of the laptop or slate mode, 0 for Slate Mode and non-zero otherwise. When this system metric changes, the system sends a broadcast message via WM_SETTINGCHANGE with "ConvertibleSlateMode" in the LPARAM. Note that this system metric doesn't apply to desktop PCs. In that case, use GetAutoRotationState. */
SM_CONVERTIBLESLATEMODE: 0x2003,
/** The width of a window border, in pixels. This is equivalent to the SM_CXEDGE value for windows with the 3-D look. */
SM_CXBORDER: 5,
/** The nominal width of a cursor, in pixels. */
SM_CXCURSOR: 13,
/** This value is the same as SM_CXFIXEDFRAME. */
SM_CXDLGFRAME: 7,
/** The width of the rectangle around the location of a first click in a double-click sequence, in pixels. The second click must occur within the rectangle that is defined by SM_CXDOUBLECLK and SM_CYDOUBLECLK for the system to consider the two clicks a double-click. The two clicks must also occur within a specified time.
 To set the width of the double-click rectangle, call SystemParametersInfo with SPI_SETDOUBLECLKWIDTH. */
SM_CXDOUBLECLK: 36,
/** The number of pixels on either side of a mouse-down point that the mouse pointer can move before a drag operation begins. This allows the user to click and release the mouse button easily without unintentionally starting a drag operation. If this value is negative, it is subtracted from the left of the mouse-down point and added to the right of it. */
SM_CXDRAG: 68,
/** The width of a 3-D border, in pixels. This metric is the 3-D counterpart of SM_CXBORDER. */
SM_CXEDGE: 45,
/** The thickness of the frame around the perimeter of a window that has a caption but is not sizable, in pixels. SM_CXFIXEDFRAME is the height of the horizontal border, and SM_CYFIXEDFRAME is the width of the vertical border.
 This value is the same as SM_CXDLGFRAME. */
SM_CXFIXEDFRAME: 7,
/** The width of the left and right edges of the focus rectangle that the DrawFocusRect draws. This value is in pixels.
 Windows 2000:  This value is not supported. */
SM_CXFOCUSBORDER: 83,
/** This value is the same as SM_CXSIZEFRAME. */
SM_CXFRAME: 32,
/** The width of the client area for a full-screen window on the primary display monitor, in pixels. To get the coordinates of the portion of the screen that is not obscured by the system taskbar or by application desktop toolbars, call the SystemParametersInfo function with the SPI_GETWORKAREA value. */
SM_CXFULLSCREEN: 16,
/** The width of the arrow bitmap on a horizontal scroll bar, in pixels. */
SM_CXHSCROLL: 21,
/** The width of the thumb box in a horizontal scroll bar, in pixels. */
SM_CXHTHUMB: 10,
/** The system large width of an icon, in pixels. The LoadIcon function can load only icons with the dimensions that SM_CXICON and SM_CYICON specifies. See Icon Sizes for more info. */
SM_CXICON: 11,
/** The width of a grid cell for items in large icon view, in pixels. Each item fits into a rectangle of size SM_CXICONSPACING by SM_CYICONSPACING when arranged. This value is always greater than or equal to SM_CXICON. */
SM_CXICONSPACING: 38,
/** The default width, in pixels, of a maximized top-level window on the primary display monitor. */
SM_CXMAXIMIZED: 61,
/** The default maximum width of a window that has a caption and sizing borders, in pixels. This metric refers to the entire desktop. The user cannot drag the window frame to a size larger than these dimensions. A window can override this value by processing the WM_GETMINMAXINFO message. */
SM_CXMAXTRACK: 59,
/** The width of the default menu check-mark bitmap, in pixels. */
SM_CXMENUCHECK: 71,
/** The width of menu bar buttons, such as the child window close button that is used in the multiple document interface, in pixels. */
SM_CXMENUSIZE: 54,
/** The minimum width of a window, in pixels. */
SM_CXMIN: 28,
/** The width of a minimized window, in pixels. */
SM_CXMINIMIZED: 57,
/** The width of a grid cell for a minimized window, in pixels. Each minimized window fits into a rectangle this size when arranged. This value is always greater than or equal to SM_CXMINIMIZED. */
SM_CXMINSPACING: 47,
/** The minimum tracking width of a window, in pixels. The user cannot drag the window frame to a size smaller than these dimensions. A window can override this value by processing the WM_GETMINMAXINFO message. */
SM_CXMINTRACK: 34,
/** The amount of border padding for captioned windows, in pixels.
 Windows XP/2000:  This value is not supported. */
SM_CXPADDEDBORDER: 92,
/** The width of the screen of the primary display monitor, in pixels. This is the same value obtained by calling GetDeviceCaps as follows: GetDeviceCaps( hdcPrimaryMonitor, HORZRES). */
SM_CXSCREEN: 0,
/** The width of a button in a window caption or title bar, in pixels. */
SM_CXSIZE: 30,
/** The thickness of the sizing border around the perimeter of a window that can be resized, in pixels. SM_CXSIZEFRAME is the width of the horizontal border, and SM_CYSIZEFRAME is the height of the vertical border.
 This value is the same as SM_CXFRAME. */
SM_CXSIZEFRAME: 32,
/** The system small width of an icon, in pixels. Small icons typically appear in window captions and in small icon view. See Icon Sizes for more info. */
SM_CXSMICON: 49,
/** The width of small caption buttons, in pixels. */
SM_CXSMSIZE: 52,
/** The width of the virtual screen, in pixels. The virtual screen is the bounding rectangle of all display monitors. The SM_XVIRTUALSCREEN metric is the coordinates for the left side of the virtual screen. */
SM_CXVIRTUALSCREEN: 78,
/** The width of a vertical scroll bar, in pixels. */
SM_CXVSCROLL: 2,
/** The height of a window border, in pixels. This is equivalent to the SM_CYEDGE value for windows with the 3-D look. */
SM_CYBORDER: 6,
/** The height of a caption area, in pixels. */
SM_CYCAPTION: 4,
/** The nominal height of a cursor, in pixels. */
SM_CYCURSOR: 14,
/** This value is the same as SM_CYFIXEDFRAME. */
SM_CYDLGFRAME: 8,
/** The height of the rectangle around the location of a first click in a double-click sequence, in pixels. The second click must occur within the rectangle defined by SM_CXDOUBLECLK and SM_CYDOUBLECLK for the system to consider the two clicks a double-click. The two clicks must also occur within a specified time.
 To set the height of the double-click rectangle, call SystemParametersInfo with SPI_SETDOUBLECLKHEIGHT. */
SM_CYDOUBLECLK: 37,
/** The number of pixels above and below a mouse-down point that the mouse pointer can move before a drag operation begins. This allows the user to click and release the mouse button easily without unintentionally starting a drag operation. If this value is negative, it is subtracted from above the mouse-down point and added below it. */
SM_CYDRAG: 69,
/** The height of a 3-D border, in pixels. This is the 3-D counterpart of SM_CYBORDER. */
SM_CYEDGE: 46,
/** The thickness of the frame around the perimeter of a window that has a caption but is not sizable, in pixels. SM_CXFIXEDFRAME is the height of the horizontal border, and SM_CYFIXEDFRAME is the width of the vertical border.
 This value is the same as SM_CYDLGFRAME. */
SM_CYFIXEDFRAME: 8,
/** The height of the top and bottom edges of the focus rectangle drawn by DrawFocusRect. This value is in pixels.
 Windows 2000:  This value is not supported. */
SM_CYFOCUSBORDER: 84,
/** This value is the same as SM_CYSIZEFRAME. */
SM_CYFRAME: 33,
/** The height of the client area for a full-screen window on the primary display monitor, in pixels. To get the coordinates of the portion of the screen not obscured by the system taskbar or by application desktop toolbars, call the SystemParametersInfo function with the SPI_GETWORKAREA value. */
SM_CYFULLSCREEN: 17,
/** The height of a horizontal scroll bar, in pixels. */
SM_CYHSCROLL: 3,
/** The system large height of an icon, in pixels. The LoadIcon function can load only icons with the dimensions that SM_CXICON and SM_CYICON specifies. See Icon Sizes for more info. */
SM_CYICON: 12,
/** The height of a grid cell for items in large icon view, in pixels. Each item fits into a rectangle of size SM_CXICONSPACING by SM_CYICONSPACING when arranged. This value is always greater than or equal to SM_CYICON. */
SM_CYICONSPACING: 39,
/** For double byte character set versions of the system, this is the height of the Kanji window at the bottom of the screen, in pixels. */
SM_CYKANJIWINDOW: 18,
/** The default height, in pixels, of a maximized top-level window on the primary display monitor. */
SM_CYMAXIMIZED: 62,
/** The default maximum height of a window that has a caption and sizing borders, in pixels. This metric refers to the entire desktop. The user cannot drag the window frame to a size larger than these dimensions. A window can override this value by processing the WM_GETMINMAXINFO message. */
SM_CYMAXTRACK: 60,
/** The height of a single-line menu bar, in pixels. */
SM_CYMENU: 15,
/** The height of the default menu check-mark bitmap, in pixels. */
SM_CYMENUCHECK: 72,
/** The height of menu bar buttons, such as the child window close button that is used in the multiple document interface, in pixels. */
SM_CYMENUSIZE: 55,
/** The minimum height of a window, in pixels. */
SM_CYMIN: 29,
/** The height of a minimized window, in pixels. */
SM_CYMINIMIZED: 58,
/** The height of a grid cell for a minimized window, in pixels. Each minimized window fits into a rectangle this size when arranged. This value is always greater than or equal to SM_CYMINIMIZED. */
SM_CYMINSPACING: 48,
/** The minimum tracking height of a window, in pixels. The user cannot drag the window frame to a size smaller than these dimensions. A window can override this value by processing the WM_GETMINMAXINFO message. */
SM_CYMINTRACK: 35,
/** The height of the screen of the primary display monitor, in pixels. This is the same value obtained by calling GetDeviceCaps as follows: GetDeviceCaps( hdcPrimaryMonitor, VERTRES). */
SM_CYSCREEN: 1,
/** The height of a button in a window caption or title bar, in pixels. */
SM_CYSIZE: 31,
/** The thickness of the sizing border around the perimeter of a window that can be resized, in pixels. SM_CXSIZEFRAME is the width of the horizontal border, and SM_CYSIZEFRAME is the height of the vertical border.
 This value is the same as SM_CYFRAME. */
SM_CYSIZEFRAME: 33,
/** The height of a small caption, in pixels. */
SM_CYSMCAPTION: 51,
/** The system small height of an icon, in pixels. Small icons typically appear in window captions and in small icon view. See Icon Sizes for more info. */
SM_CYSMICON: 50,
/** The height of small caption buttons, in pixels. */
SM_CYSMSIZE: 53,
/** The height of the virtual screen, in pixels. The virtual screen is the bounding rectangle of all display monitors. The SM_YVIRTUALSCREEN metric is the coordinates for the top of the virtual screen. */
SM_CYVIRTUALSCREEN: 79,
/** The height of the arrow bitmap on a vertical scroll bar, in pixels. */
SM_CYVSCROLL: 20,
/** The height of the thumb box in a vertical scroll bar, in pixels. */
SM_CYVTHUMB: 9,
/** Nonzero if User32.dll supports DBCS; otherwise, 0. */
SM_DBCSENABLED: 42,
/** Nonzero if the debug version of User.exe is installed; otherwise, 0. */
SM_DEBUG: 22,
/** Nonzero if the current operating system is Windows 7 or Windows Server 2008 R2 and the Tablet PC Input service is started; otherwise, 0. The return value is a bitmask that specifies the type of digitizer input supported by the device. For more information, see Remarks.
 Windows Server 2008, Windows Vista and Windows XP/2000:  This value is not supported. */
SM_DIGITIZER: 94,
/** Nonzero if Input Method Manager/Input Method Editor features are enabled; otherwise, 0.
 SM_IMMENABLED indicates whether the system is ready to use a Unicode-based IME on a Unicode application. To ensure that a language-dependent IME works, check SM_DBCSENABLED and the system ANSI code page. Otherwise the ANSI-to-Unicode conversion may not be performed correctly, or some components like fonts or registry settings may not be present. */
SM_IMMENABLED: 82,
/** Nonzero if there are digitizers in the system; otherwise, 0.
 SM_MAXIMUMTOUCHES returns the aggregate maximum of the maximum number of contacts supported by every digitizer in the system. If the system has only single-touch digitizers, the return value is 1. If the system has multi-touch digitizers, the return value is the number of simultaneous contacts the hardware can provide.
 Windows Server 2008, Windows Vista and Windows XP/2000:  This value is not supported. */
SM_MAXIMUMTOUCHES: 95,
/** Nonzero if the current operating system is the Windows XP, Media Center Edition, 0 if not. */
SM_MEDIACENTER: 87,
/** Nonzero if drop-down menus are right-aligned with the corresponding menu-bar item; 0 if the menus are left-aligned. */
SM_MENUDROPALIGNMENT: 40,
/** Nonzero if the system is enabled for Hebrew and Arabic languages, 0 if not. */
SM_MIDEASTENABLED: 74,
/** Nonzero if a mouse is installed; otherwise, 0. This value is rarely zero, because of support for virtual mice and because some systems detect the presence of the port instead of the presence of a mouse. */
SM_MOUSEPRESENT: 19,
/** Nonzero if a mouse with a horizontal scroll wheel is installed; otherwise 0. */
SM_MOUSEHORIZONTALWHEELPRESENT: 91,
/** Nonzero if a mouse with a vertical scroll wheel is installed; otherwise 0. */
SM_MOUSEWHEELPRESENT: 75,
/** The least significant bit is set if a network is present; otherwise, it is cleared. The other bits are reserved for future use. */
SM_NETWORK: 63,
/** Nonzero if the Microsoft Windows for Pen computing extensions are installed; zero otherwise. */
SM_PENWINDOWS: 41,
/** This system metric is used in a Terminal Services environment to determine if the current Terminal Server session is being remotely controlled. Its value is nonzero if the current session is remotely controlled; otherwise, 0.
 You can use terminal services management tools such as Terminal Services Manager (tsadmin.msc) and shadow.exe to control a remote session. When a session is being remotely controlled, another user can view the contents of that session and potentially interact with it. */
 SM_REMOTECONTROL: 0x2001,
/** This system metric is used in a Terminal Services environment. If the calling process is associated with a Terminal Services client session, the return value is nonzero. If the calling process is associated with the Terminal Services console session, the return value is 0. Windows Server 2003 and Windows XP:  The console session is not necessarily the physical console. For more information, see WTSGetActiveConsoleSessionId. */
SM_REMOTESESSION: 0x1000,
/** Nonzero if all the display monitors have the same color format, otherwise, 0. Two displays can have the same bit depth, but different color formats. For example, the red, green, and blue pixels can be encoded with different numbers of bits, or those bits can be located in different places in a pixel color value. */
SM_SAMEDISPLAYFORMAT: 81,
/** This system metric should be ignored; it always returns 0. */
SM_SECURE: 44,
/** The build number if the system is Windows Server 2003 R2; otherwise, 0. */
SM_SERVERR2: 89,
/** Nonzero if the user requires an application to present information visually in situations where it would otherwise present the information only in audible form; otherwise, 0. */
SM_SHOWSOUNDS: 70,
/** Nonzero if the current session is shutting down; otherwise, 0.
 Windows 2000: This value is not supported. */
SM_SHUTTINGDOWN: 0x2000,
/** Nonzero if the computer has a low-end (slow) processor; otherwise, 0. */
SM_SLOWMACHINE: 73,
/** Nonzero if the current operating system is Windows 7 Starter Edition, Windows Vista Starter, or Windows XP Starter Edition; otherwise, 0. */
SM_STARTER: 88,
/** Nonzero if the meanings of the left and right mouse buttons are swapped; otherwise, 0. */
SM_SWAPBUTTON: 23,
/** Reflects the state of the docking mode, 0 for Undocked Mode and non-zero otherwise. When this system metric changes, the system sends a broadcast message via WM_SETTINGCHANGE with "SystemDockMode" in the LPARAM. */
SM_SYSTEMDOCKED: 0x2004,
/** Nonzero if the current operating system is the Windows XP Tablet PC edition or if the current operating system is Windows Vista or Windows 7 and the Tablet PC Input service is started; otherwise, 0. The SM_DIGITIZER setting indicates the type of digitizer input supported by a device running Windows 7 or Windows Server 2008 R2. For more information, see Remarks. */
SM_TABLETPC: 86,
/** The coordinates for the left side of the virtual screen. The virtual screen is the bounding rectangle of all display monitors. The SM_CXVIRTUALSCREEN metric is the width of the virtual screen. */
SM_XVIRTUALSCREEN: 76,
/** The coordinates for the top of the virtual screen. The virtual screen is the bounding rectangle of all display monitors. The SM_CYVIRTUALSCREEN metric is the height of the virtual screen. */
SM_YVIRTUALSCREEN: 77,
});

export type SystemMetric = Enum<typeof SystemMetric>;