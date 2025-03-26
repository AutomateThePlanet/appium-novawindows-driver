import { Enum } from '../enums';

export const CultureInfoProperty = Object.freeze({
    CULTURE: 'culture',
} as const);

export const AutomationHeadingLevelProperty = Object.freeze({
    HEADING_LEVEL: 'headinglevel',
} as const);

export const PointProperty = Object.freeze({
    CLICKABLE_POINT: 'clickablepoint',
} as const);

export const ControlTypeProperty = Object.freeze({
    CONTROL_TYPE: 'controltype',
} as const);

export const AutomationElementProperty = Object.freeze({
    LABELED_BY: 'labeledby',
} as const);

export const OrientationTypeProperty = Object.freeze({
    ORIENTATION: 'orientation',
} as const);

export const RectProperty = Object.freeze({
    BOUNDING_RECTANGLE: 'boundingrectangle',
});

export const Int32ArrayProperty = Object.freeze({
    RUNTIME_ID: 'runtimeid',
});

export const Int32Property = Object.freeze({
    SIZE_OF_SET: 'sizeofset',
    POSITION_IN_SET: 'positioninset',
    PROCESS_ID: 'processid',
    NATIVE_WINDOW_HANDLE: 'nativewindowhandle',
} as const);

export const StringProperty = Object.freeze({
    AUTOMATION_ID: 'automationid',
    ITEM_TYPE: 'itemtype',
    LOCALIZED_CONTROL_TYPE: 'localizedcontroltype',
    NAME: 'name',
    ACCELERATOR_KEY: 'acceleratorkey',
    ACCESS_KEY: 'accesskey',
    CLASS_NAME: 'classname',
    HELP_TEXT: 'helptext',
    FRAMEWORK_ID: 'frameworkid',
    ITEM_STATUS: 'itemstatus',
} as const);

export const BooleanProperty = Object.freeze({
    HAS_KEYBOARD_FOCUS: 'haskeyboardfocus',
    IS_OFFSCREEN: 'isoffscreen',
    IS_DIALOG: 'isdialog',
    IS_CONTROL_ELEMENT: 'iscontrolelement',
    IS_CONTENT_ELEMENT: 'iscontentelement',
    IS_PASSWORD: 'ispassword',
    IS_KEYBOARD_FOCUSABLE: 'iskeyboardfocusable',
    IS_ENABLED: 'isenabled',
    IS_REQUIRED_FOR_FORM: 'isrequiredforform',
    IS_DOCK_PATTERN_AVAILABLE: 'isdockpatternavailable',
    IS_EXPAND_COLLAPSE_PATTERN_AVAILABLE: 'isexpandcollapsepatternavailable',
    IS_GRID_ITEM_PATTERN_AVAILABLE: 'isgriditempatternavailable',
    IS_GRID_PATTERN_AVAILABLE: 'isgridpatternavailable',
    IS_INVOKE_PATTERN_AVAILABLE: 'isinvokepatternavailable',
    IS_MULTIPLE_VIEW_PATTERN_AVAILABLE: 'ismultipleviewpatternavailable',
    IS_RANGE_VALUE_PATTERN_AVAILABLE: 'israngevaluepatternavailable',
    IS_SELECTION_ITEM_PATTERN_AVAILABLE: 'isselectionitempatternavailable',
    IS_SELECTION_PATTERN_AVAILABLE: 'isselectionpatternavailable',
    IS_SCROLL_PATTERN_AVAILABLE: 'isscrollpatternavailable',
    IS_SYNCHRONIZED_INPUT_PATTERN_AVAILABLE: 'issynchronizedinputpatternavailable',
    IS_SCROLL_ITEM_PATTERN_AVAILABLE: 'isscrollitempatternavailable',
    IS_VIRTUALIZED_ITEM_PATTERN_AVAILABLE: 'isvirtualizeditempatternavailable',
    IS_ITEM_CONTAINER_PATTERN_AVAILABLE: 'isitemcontainerpatternavailable',
    IS_TABLE_PATTERN_AVAILABLE: 'istablepatternavailable',
    IS_TABLE_ITEM_PATTERN_AVAILABLE: 'istableitempatternavailable',
    IS_TEXT_PATTERN_AVAILABLE: 'istextpatternavailable',
    IS_TOGGLE_PATTERN_AVAILABLE: 'istogglepatternavailable',
    IS_TRANSFORM_PATTERN_AVAILABLE: 'istransformpatternavailable',
    IS_VALUE_PATTERN_AVAILABLE: 'isvaluepatternavailable',
    IS_WINDOW_PATTERN_AVAILABLE: 'iswindowpatternavailable',
} as const);

export const Property = Object.freeze(Object.assign({},
    CultureInfoProperty,
    AutomationHeadingLevelProperty,
    PointProperty,
    ControlTypeProperty,
    AutomationElementProperty,
    OrientationTypeProperty,
    RectProperty,
    Int32Property,
    Int32ArrayProperty,
    StringProperty,
    BooleanProperty,
)) as typeof CultureInfoProperty
    & typeof AutomationHeadingLevelProperty
    & typeof PointProperty
    & typeof ControlTypeProperty
    & typeof AutomationElementProperty
    & typeof OrientationTypeProperty
    & typeof RectProperty
    & typeof Int32Property
    & typeof Int32ArrayProperty
    & typeof StringProperty
    & typeof BooleanProperty;

export type CultureInfoProperty = Enum<typeof CultureInfoProperty>;
export type AutomationHeadingLevelProperty = Enum<typeof AutomationHeadingLevelProperty>;
export type PointProperty = Enum<typeof PointProperty>;
export type ControlTypeProperty = Enum<typeof ControlTypeProperty>;
export type AutomationElementProperty = Enum<typeof AutomationElementProperty>;
export type OrientationTypeProperty = Enum<typeof OrientationTypeProperty>;
export type RectProperty = Enum<typeof RectProperty>;
export type Int32ArrayProperty = Enum<typeof Int32ArrayProperty>;
export type Int32Property = Enum<typeof Int32Property>;
export type StringProperty = Enum<typeof StringProperty>;
export type BooleanProperty = Enum<typeof BooleanProperty>;

export type Property = CultureInfoProperty
    | AutomationHeadingLevelProperty
    | PointProperty
    | ControlTypeProperty
    | AutomationElementProperty
    | OrientationTypeProperty
    | RectProperty
    | Int32Property
    | Int32ArrayProperty
    | StringProperty
    | BooleanProperty;

export const OrientationType = Object.freeze({
    NONE: 'none',
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
} as const);

export type OrientationType = Enum<typeof OrientationType>;

export const AutomationHeadingLevel = Object.freeze({
    NONE: 'none',
    LEVEL1: 'level1',
    LEVEL2: 'level2',
    LEVEL3: 'level3',
    LEVEL4: 'level4',
    LEVEL5: 'level5',
    LEVEL6: 'level6',
    LEVEL7: 'level7',
    LEVEL8: 'level8',
    LEVEL9: 'level9',
} as const);

export type AutomationHeadingLevel = Enum<typeof AutomationHeadingLevel>;

export const ControlType = Object.freeze({
    BUTTON: 'button',
    CALENDAR: 'calendar',
    CHECK_BOX: 'checkbox',
    COMBO_BOX: 'combobox',
    EDIT: 'edit',
    HYPERLINK: 'hyperlink',
    IMAGE: 'image',
    LIST_ITEM: 'listitem',
    LIST: 'list',
    MENU: 'menu',
    MENU_BAR: 'menubar',
    MENU_ITEM: 'menuitem',
    PROGRESS_BAR: 'progressbar',
    RADIO_BUTTON: 'radiobutton',
    SCROLL_BAR: 'scrollbar',
    SLIDER: 'slider',
    SPINNER: 'spinner',
    STATUS_BAR: 'statusbar',
    TAB: 'tab',
    TAB_ITEM: 'tabitem',
    TEXT: 'text',
    TOOL_BAR: 'toolbar',
    TOOL_TIP: 'tooltip',
    TREE: 'tree',
    TREE_ITEM: 'treeitem',
    CUSTOM: 'custom',
    GROUP: 'group',
    THUMB: 'thumb',
    DATA_GRID: 'datagrid',
    DATA_ITEM: 'dataitem',
    DOCUMENT: 'document',
    SPLIT_BUTTON: 'splitbutton',
    WINDOW: 'window',
    PANE: 'pane',
    HEADER: 'header',
    HEADER_ITEM: 'headeritem',
    TABLE: 'table',
    TITLE_BAR: 'titlebar',
    SEPARATOR: 'separator',
} as const);

export type ControlType = Enum<typeof ControlType>;

export const ExtraControlType = Object.freeze({
    SEMANTIC_ZOOM: 'semanticzoom',
    APP_BAR: 'appbar',
} as const);

export type ExtraControlType = Enum<typeof ExtraControlType>;
