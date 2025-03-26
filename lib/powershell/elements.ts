import { Enum } from '../enums';
import { pwsh$, PSObject } from './core';
import { PSString } from './common';
import { Condition } from './conditions';

// TODO: Move the methods to a separate file, some of them are too complicated and are not easy to maintain
const FIND_ALL_ANCESTOR = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($parent = $treeWalker.GetParent($el))) {
            $el = $parent
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                $els.Add($validEl)
            }
        }
    }

    Write-Output $els
`;

const FIND_FIRST_ANCESTOR = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($parent = $treeWalker.GetParent($el))) {
            $el = $parent
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                Write-Output $el
                break
            }
        }
    }
`;

const FIND_ALL_ANCESTOR_OR_SELF = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                $els.Add($validEl)
            }

            $el = $treeWalker.GetParent($el)
        }
    }

    Write-Output $els
`;

const FIND_FIRST_ANCESTOR_OR_SELF = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                Write-Output $el
                break
            }

            $el = $treeWalker.GetParent($el)
        }
    }
`;

const FIND_PARENT = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)

    ${0} | ForEach-Object {
        $el = $_
        $el = $treeWalker.GetParent($el).FindFirst([TreeScope]::Element, ${1})
        Write-Output $el
    }
`;

const FIND_FOLLOWING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new([AndCondition]::new($cacheRequest.TreeFilter, ${1}))
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            if ($null -ne ($nextSibling = $treeWalker.GetNextSibling($el))) {
                $el = $nextSibling

                Write-Output $el
                break
            }

            $el = $treeWalker.GetParent($el)
        }
    }
`;

const FIND_ALL_FOLLOWING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            if ($null -ne ($nextSibling = $treeWalker.GetNextSibling($el))) {
                $el = $nextSibling
                $els.Add($el)
                $els.AddRange($el.FindAll([TreeScope]::Children, ${1}))
            }

            $el = $treeWalker.GetParent($el)
        }
    }

    Write-Output $els
`;

const FIND_FOLLOWING_SIBLING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($nextSibling = $treeWalker.GetNextSibling($el))) {
            $el = $nextSibling
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                Write-Output $el
                break
            }
        }
    }
`;

const FIND_ALL_FOLLOWING_SIBLING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($nextSibling = $treeWalker.GetNextSibling($el))) {
            $el = $nextSibling
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                $els.Add($validEl)
            }
        }
    }

    Write-Output $els
`;

const FIND_PRECEDING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new([AndCondition]::new($cacheRequest.TreeFilter, ${1}))

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            if ($null -ne ($previousSibling = $treeWalker.GetPreviousSibling($el))) {
                $el = $previousSibling

                Write-Output $el
                break
            }

            $el = $treeWalker.GetParent($el)
        }
    }
`;

const FIND_ALL_PRECEDING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new([AndCondition]::new($cacheRequest.TreeFilter, ${1}))
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne $el) {
            if ($null -ne ($previousSibling = $treeWalker.GetPreviousSibling($el))) {
                $el = $previousSibling
                $els.Add($el)
                $els.AddRange($el.FindAll([TreeScope]::Children, ${1}))
            }

            $el = $treeWalker.GetParent($el)
        }
    }

    Write-Output $els
`;

const FIND_PRECEDING_SIBLING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($previousSibling = $treeWalker.GetPreviousSibling($el))) {
            $el = $previousSibling
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                Write-Output $el
                break
            }
        }
    }
`;

const FIND_ALL_PRECEDING_SIBLING = pwsh$ /* ps1 */ `
    $treeWalker = [TreeWalker]::new($cacheRequest.TreeFilter)
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        while ($null -ne ($previousSibling = $treeWalker.GetPreviousSibling($el))) {
            $el = $previousSibling
            $validEl = $el.FindFirst([TreeScope]::Element, ${1})

            if ($null -ne $validEl) {
                $els.Add($validEl)
            }
        }
    }

    Write-Output $els
`;

const FIND_CHILDREN_OR_SELF = pwsh$ /* ps1 */ `
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        $validEl = $el.FindFirst([TreeScope]::Element -bor [TreeScope]::Children, ${1});

        if ($null -ne $validEl) {
            $els.Add($validEl)
        }
    }

    Write-Output $els
`;

const FIND_ALL_CHILDREN_OR_SELF = pwsh$ /* ps1 */ `
    $els = New-Object System.Collections.Generic.List[AutomationElement]

    ${0} | ForEach-Object {
        $el = $_
        $validEl = $el.FindAll([TreeScope]::Element -bor [TreeScope]::Children, ${1});

        if ($null -ne $validEl) {
            $els.Add($validEl)
        }
    }

    Write-Output $els
`;

const FIND_DESCENDANTS = pwsh$ /* ps1 */ `Find-ChildrenRecursively -element (${0}) -condition (${1})`;
const FIND_ALL_DESCENDANTS = pwsh$ /* ps1 */ `Find-AllChildrenRecursively -element (${0}) -condition (${1})`;

const FIND_DESCENDANTS_OR_SELF = pwsh$ /* ps1 */ `Find-ChildrenRecursively -element (${0}) -condition (${1}) -includeSelf $true`;
const FIND_ALL_DESCENDANTS_OR_SELF = pwsh$ /* ps1 */ `Find-AllChildrenRecursively -element (${0}) -condition (${1}) -includeSelf $true`;

const FIND_FIRST = pwsh$ /* ps1 */ `${0}.FindFirst([TreeScope]::${1}, ${2})`;
const FIND_ALL = pwsh$ /* ps1 */ `${0}.FindAll([TreeScope]::${1}, ${2})`;

const AUTOMATION_ROOT = /* ps1 */ `$rootElement`;
const FOCUSED_ELEMENT = /* ps1 */ `[AutomationElement]::FocusedElement`;
const ROOT_ELEMENT = /* ps1 */ `[AutomationElement]::RootElement`;

const SAVE_TO_ELEMENT_TABLE_AND_RETURN_ID = pwsh$ /* ps1 */ `
    ${0} | Where-Object { $null -ne $_ } | ForEach-Object {
        $runtimeId = $_.GetCurrentPropertyValue([AutomationElement]::RuntimeIdProperty) -join '.';

        if (-not $elementTable.ContainsKey($runtimeId)) {
            $elementTable.Add($runtimeId, $_)
        };

        $runtimeId
    }
`;

const ELEMENT_TABLE_GET = pwsh$ /* ps1 */ `$elementTable['${0}']`;

// TODO: maybe encode the result first? Some properties may be on multiple lines, it may cause a problem when returning multiple element results at once
const GET_ELEMENT_PROPERTY = pwsh$ /* ps1 */ `${0}.GetCurrentPropertyValue([AutomationElement]::${1}Property)`;

const GET_ELEMENT_RUNTIME_ID = pwsh$ /* ps1 */ `
    ${0} | ForEach-Object {
        $_.GetCurrentPropertyValue([AutomationElement]::RuntimeIdProperty) -join '.'
    }
`;

const GET_ELEMENT_RECT = pwsh$ /* ps1 */ `
    ${0}.Current.BoundingRectangle |
    Select-Object X, Y, Width, Height |
    ForEach-Object { $_ | ConvertTo-Json -Compress } |
    ForEach-Object { if ($null -ne $_) { $_.ToLower() } }
`;

const GET_ELEMENT_TAG_NAME = pwsh$ /* ps1 */ `
    ${0}.Current.ControlType.ProgrammaticName |
    ForEach-Object { $_.Split('.')[-1] }
`;

const SET_FOCUS_TO_ELEMENT = pwsh$ /* ps1 */ `${0}.SetFocus()`;

const GET_ELEMENT_TEXT = pwsh$ /* ps1 */ `
    try {
        ${0}.GetCurrentPattern([TextPattern]::Pattern).DocumentRange.GetText(-1)
    } catch {
        try {
            ${0}.GetCurrentPattern([SelectionPattern]::Pattern).Current.GetSelection().Current.Name
        } catch {
            ${0}.Current.Name
        }
    }
`;

const INVOKE_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([InvokePattern]::Pattern).Invoke()`;
const EXPAND_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([ExpandCollapsePattern]::Pattern).Expand()`;
const COLLAPSE_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([ExpandCollapsePattern]::Pattern).Collapse()`;
const SCROLL_ELEMENT_INTO_VIEW = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([ScrollItemPattern]::Pattern).ScrollIntoView()`;
const IS_MULTIPLE_SELECT_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionPattern]::Pattern).Current.CanSelectMultiple`;
const GET_SELECTED_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionPattern]::Pattern).Current.GetSelection()`;
const IS_ELEMENT_SELECTED = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionItemPattern]::Pattern).Current.IsSelected`;
const ADD_ELEMENT_TO_SELECTION = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionItemPattern]::Pattern).AddToSelection()`;
const REMOVE_ELEMENT_FROM_SELECTION = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionItemPattern]::Pattern).RemoveFromSelection()`;
const SELECT_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([SelectionItemPattern]::Pattern).Select()`;
const TOGGLE_ELEMENT = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([TogglePattern]::Pattern).Toggle()`;
const SET_ELEMENT_VALUE = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([ValuePattern]::Pattern).SetValue(${1})`;
const SET_ELEMENT_RANGE_VALUE = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([RangeValuePattern]::Pattern).SetValue(${1})`;
const GET_ELEMENT_VALUE = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([ValuePattern]::Pattern).Current.Value`;
const GET_ELEMENT_TOGGLE_STATE = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([TogglePattern]::Pattern).Current.ToggleState`;
const MAXIMIZE_WINDOW = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([WindowPattern]::Pattern).SetWindowVisualState([WindowVisualState]::Maximized)`;
const MINIMIZE_WINDOW = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([WindowPattern]::Pattern).SetWindowVisualState([WindowVisualState]::Minimized)`;
const RESTORE_WINDOW = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([WindowPattern]::Pattern).SetWindowVisualState([WindowVisualState]::Normal)`;
const CLOSE_WINDOW = pwsh$ /* ps1 */ `${0}.GetCurrentPattern([WindowPattern]::Pattern).Close()`;

export const TreeScope = Object.freeze({
    ANCESTORS_OR_SELF: 'ancestors-or-self',
    FOLLOWING: 'following',
    FOLLOWING_SIBLING: 'following-sibling',
    PRECEDING: 'preceding',
    PRECEDING_SIBLING: 'preceding-sibling',
    ANCESTORS: 'ancestors',
    CHILDREN_OR_SELF: 'child-or-self',
    CHILDREN: 'children',
    DESCENDANTS: 'descendants',
    ELEMENT: 'element',
    SUBTREE: 'subtree',
    PARENT: 'parent',
} as const);

export type TreeScope = Enum<typeof TreeScope>;

export const AutomationElementMode = Object.freeze({
    NONE: 'none',
    FULL: 'full',
} as const);

export type AutomationElementMode = Enum<typeof AutomationElementMode>;

export class AutomationElement extends PSObject {
    constructor(command: string) {
        super(command);
    }

    static get automationRoot(): AutomationElement {
        return new AutomationElement(AUTOMATION_ROOT);
    }

    static get rootElement(): AutomationElement {
        return new AutomationElement(ROOT_ELEMENT);
    }

    static get focusedElement(): AutomationElement {
        return new AutomationElement(FOCUSED_ELEMENT);
    }

    findFirst(scope: TreeScope, condition: Condition): AutomationElement {
        switch (scope) {
            case TreeScope.ANCESTORS_OR_SELF:
                return new AutomationElement(FIND_FIRST_ANCESTOR_OR_SELF.format(this, condition));
            case TreeScope.ANCESTORS:
                return new AutomationElement(FIND_FIRST_ANCESTOR.format(this, condition));
            case TreeScope.PARENT:
                return new AutomationElement(FIND_PARENT.format(this, condition));
            case TreeScope.FOLLOWING:
                return new AutomationElement(FIND_FOLLOWING.format(this, condition));
            case TreeScope.FOLLOWING_SIBLING:
                return new AutomationElement(FIND_FOLLOWING_SIBLING.format(this, condition));
            case TreeScope.PRECEDING:
                return new AutomationElement(FIND_PRECEDING.format(this, condition));
            case TreeScope.PRECEDING_SIBLING:
                return new AutomationElement(FIND_PRECEDING_SIBLING.format(this, condition));
            case TreeScope.CHILDREN_OR_SELF:
                return new AutomationElement(FIND_CHILDREN_OR_SELF.format(this, condition));
            case TreeScope.DESCENDANTS:
                return new AutomationElement(FIND_DESCENDANTS.format(this, condition));
            case TreeScope.SUBTREE:
                return new AutomationElement(FIND_DESCENDANTS_OR_SELF.format(this, condition));
            default:
                return new AutomationElement(FIND_FIRST.format(this, scope, condition));
        }
    }

    findAll(scope: TreeScope, condition: Condition): AutomationElement {
        switch (scope) {
            case TreeScope.ANCESTORS_OR_SELF:
                return new AutomationElement(FIND_ALL_ANCESTOR_OR_SELF.format(this, condition));
            case TreeScope.ANCESTORS:
                return new AutomationElement(FIND_ALL_ANCESTOR.format(this, condition));
            case TreeScope.PARENT:
                return new AutomationElement(FIND_PARENT.format(this, condition));
            case TreeScope.FOLLOWING:
                return new AutomationElement(FIND_ALL_FOLLOWING.format(this, condition));
            case TreeScope.FOLLOWING_SIBLING:
                return new AutomationElement(FIND_ALL_FOLLOWING_SIBLING.format(this, condition));
            case TreeScope.PRECEDING:
                return new AutomationElement(FIND_ALL_PRECEDING.format(this, condition));
            case TreeScope.PRECEDING_SIBLING:
                return new AutomationElement(FIND_ALL_PRECEDING_SIBLING.format(this, condition));
            case TreeScope.CHILDREN_OR_SELF:
                return new AutomationElement(FIND_ALL_CHILDREN_OR_SELF.format(this, condition));
            case TreeScope.DESCENDANTS:
                return new AutomationElement(FIND_ALL_DESCENDANTS.format(this, condition));
            case TreeScope.SUBTREE:
                return new AutomationElement(FIND_ALL_DESCENDANTS_OR_SELF.format(this, condition));
            default:
                return new AutomationElement(FIND_ALL.format(this, scope, condition));
        }
    }

    buildGetTagNameCommand(): string {
        return GET_ELEMENT_TAG_NAME.format(this);
    }

    buildGetPropertyCommand(property: string): string {
        if (property.toLowerCase() === 'runtimeid') {
            return GET_ELEMENT_RUNTIME_ID.format(this);
        }

        if (property.toLowerCase() === 'controltype') {
            return GET_ELEMENT_TAG_NAME.format(this);
        }

        return GET_ELEMENT_PROPERTY.format(this, property);
    }

    buildGetElementRectCommand(): string {
        return GET_ELEMENT_RECT.format(this);
    }

    buildSetFocusCommand(): string {
        return SET_FOCUS_TO_ELEMENT.format(this);
    }

    buildCommand(): string {
        return SAVE_TO_ELEMENT_TABLE_AND_RETURN_ID.format(this);
    }
}

export class AutomationElementGroup extends AutomationElement {
    readonly groups: AutomationElement[];

    constructor(...automationElements: AutomationElement[]) {
        super(`@( ${automationElements.map((el) => `(${el.buildCommand()})`).join(', ')} )`);
        this.groups = automationElements;
    }

    findAllGroups(scope: TreeScope, condition: Condition): AutomationElement[] {
        return this.groups.map((el) => el.findAll(scope, condition));
    }

    findFirstGroups(scope: TreeScope, condition: Condition): AutomationElement[] {
        return this.groups.map((el) => el.findFirst(scope, condition));
    }
}

export class FoundAutomationElement extends AutomationElement {
    readonly runtimeId: string;

    constructor(runtimeId: string) {
        super(ELEMENT_TABLE_GET.format(runtimeId));
        this.runtimeId = runtimeId;
    }

    buildGetTextCommand(): string {
        return GET_ELEMENT_TEXT.format(this);
    }

    buildInvokeCommand(): string {
        return INVOKE_ELEMENT.format(this);
    }

    buildExpandCommand(): string {
        return EXPAND_ELEMENT.format(this);
    }

    buildCollapseCommand(): string {
        return COLLAPSE_ELEMENT.format(this);
    }

    buildScrollIntoViewCommand(): string {
        return SCROLL_ELEMENT_INTO_VIEW.format(this);
    }

    buildIsMultipleSelectCommand(): string {
        return IS_MULTIPLE_SELECT_ELEMENT.format(this);
    }

    buildGetSelectionCommand(): string {
        return SAVE_TO_ELEMENT_TABLE_AND_RETURN_ID.format(GET_SELECTED_ELEMENT.format(this));
    }

    buildIsSelectedCommand(): string {
        return IS_ELEMENT_SELECTED.format(this);
    }

    buildAddToSelectionCommand(): string {
        return ADD_ELEMENT_TO_SELECTION.format(this);
    }

    buildRemoveFromSelectionCommand(): string {
        return REMOVE_ELEMENT_FROM_SELECTION.format(this);
    }

    buildSelectCommand(): string {
        return SELECT_ELEMENT.format(this);
    }

    buildToggleCommand(): string {
        return TOGGLE_ELEMENT.format(this);
    }

    buildSetValueCommand(value: string): string {
        return SET_ELEMENT_VALUE.format(this, new PSString(value).toString());
    }

    buildSetRangeValueCommand(value: string): string {
        return SET_ELEMENT_RANGE_VALUE.format(this, Number(value).toString());
    }

    buildGetValueCommand(): string {
        return GET_ELEMENT_VALUE.format(this);
    }

    buildGetToggleStateCommand(): string {
        return GET_ELEMENT_TOGGLE_STATE.format(this);
    }

    buildMaximizeCommand(): string {
        return MAXIMIZE_WINDOW.format(this);
    }

    buildMinimizeCommand(): string {
        return MINIMIZE_WINDOW.format(this);
    }

    buildRestoreCommand(): string {
        return RESTORE_WINDOW.format(this);
    }

    buildCloseCommand(): string {
        return CLOSE_WINDOW.format(this);
    }

    override buildCommand(): string {
        return this.toString();
    }
}