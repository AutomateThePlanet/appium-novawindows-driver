/**
 * Unit tests for lib/powershell/elements.ts
 */
import { describe, it, expect } from 'vitest';
import {
    AutomationElement,
    FoundAutomationElement,
    AutomationElementGroup,
    TreeScope,
} from '../../lib/powershell/elements';
import { TrueCondition } from '../../lib/powershell/conditions';

/**
 * Decode the outermost base64 Invoke-Expression wrapper to reveal the PS command template.
 * Only decodes one level so the caller sees the full command including any inner references.
 */
function decodeCommand(cmd: string): string {
    const match = cmd.match(/FromBase64String\('([^']+)'\)/);
    if (!match) {return cmd;}
    return Buffer.from(match[1], 'base64').toString('utf8');
}

const trueCondition = new TrueCondition();

describe('AutomationElement static getters', () => {
    it('automationRoot returns $rootElement', () => {
        expect(AutomationElement.automationRoot.toString()).toBe('$rootElement');
    });

    it('rootElement returns [AutomationElement]::RootElement', () => {
        expect(AutomationElement.rootElement.toString()).toBe('[AutomationElement]::RootElement');
    });

    it('focusedElement returns [AutomationElement]::FocusedElement', () => {
        expect(AutomationElement.focusedElement.toString()).toBe('[AutomationElement]::FocusedElement');
    });
});

describe('AutomationElement.buildCommand', () => {
    it('wraps element in save-to-table-and-return-id command', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildCommand());
        expect(cmd).toContain('$elementTable');
        expect(cmd).toContain('$rootElement');
    });
});

describe('AutomationElement.buildGetPropertyCommand', () => {
    it('returns runtime ID command when property is runtimeid', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildGetPropertyCommand('runtimeid'));
        expect(cmd).toContain('RuntimeIdProperty');
    });

    it('returns tag name command when property is controltype', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildGetPropertyCommand('controltype'));
        expect(cmd).toContain('ControlType');
        expect(cmd).toContain('ProgrammaticName');
    });

    it('returns GetCurrentPropertyValue for other properties', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildGetPropertyCommand('name'));
        expect(cmd).toContain('GetCurrentPropertyValue');
        expect(cmd).toContain('nameProperty');
    });
});

describe('AutomationElement.buildGetElementRectCommand', () => {
    it('returns BoundingRectangle command', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildGetElementRectCommand());
        expect(cmd).toContain('BoundingRectangle');
        expect(cmd).toContain('ConvertTo-Json');
    });
});

describe('AutomationElement.buildSetFocusCommand', () => {
    it('returns SetFocus() command', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.buildSetFocusCommand());
        expect(cmd).toContain('SetFocus');
    });
});

describe('AutomationElement.findFirst', () => {
    it('uses FindFirst for standard CHILDREN scope', () => {
        const cmd = decodeCommand(AutomationElement.rootElement.findFirst(TreeScope.CHILDREN, trueCondition).toString());
        expect(cmd).toContain('FindFirst');
        expect(cmd).toContain('children');
    });

    it('uses FIND_FIRST_ANCESTOR_OR_SELF for ANCESTORS_OR_SELF scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.ANCESTORS_OR_SELF, trueCondition).toString());
        expect(cmd).toContain('GetParent');
    });

    it('uses FIND_DESCENDANTS for DESCENDANTS scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.DESCENDANTS, trueCondition).toString());
        expect(cmd).toContain('Find-ChildrenRecursively');
    });

    it('uses FIND_DESCENDANTS_OR_SELF for SUBTREE scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.SUBTREE, trueCondition).toString());
        expect(cmd).toContain('includeSelf');
    });

    it('uses FIND_FOLLOWING for FOLLOWING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.FOLLOWING, trueCondition).toString());
        expect(cmd).toContain('GetNextSibling');
    });

    it('uses FIND_PRECEDING for PRECEDING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.PRECEDING, trueCondition).toString());
        expect(cmd).toContain('GetPreviousSibling');
    });

    it('uses FIND_PARENT for PARENT scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.PARENT, trueCondition).toString());
        expect(cmd).toContain('GetParent');
    });

    it('uses FIND_FOLLOWING_SIBLING for FOLLOWING_SIBLING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.FOLLOWING_SIBLING, trueCondition).toString());
        expect(cmd).toContain('GetNextSibling');
    });

    it('uses FIND_PRECEDING_SIBLING for PRECEDING_SIBLING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.PRECEDING_SIBLING, trueCondition).toString());
        expect(cmd).toContain('GetPreviousSibling');
    });

    it('uses FIND_CHILDREN_OR_SELF for CHILDREN_OR_SELF scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findFirst(TreeScope.CHILDREN_OR_SELF, trueCondition).toString());
        expect(cmd).toContain('FindFirst');
    });
});

describe('AutomationElement.findAll', () => {
    it('uses FindAll for standard CHILDREN scope', () => {
        const cmd = decodeCommand(AutomationElement.rootElement.findAll(TreeScope.CHILDREN, trueCondition).toString());
        expect(cmd).toContain('FindAll');
        expect(cmd).toContain('children');
    });

    it('uses FIND_ALL_DESCENDANTS for DESCENDANTS scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findAll(TreeScope.DESCENDANTS, trueCondition).toString());
        expect(cmd).toContain('Find-AllChildrenRecursively');
    });

    it('uses FIND_ALL_ANCESTOR_OR_SELF for ANCESTORS_OR_SELF scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findAll(TreeScope.ANCESTORS_OR_SELF, trueCondition).toString());
        expect(cmd).toContain('GetParent');
    });

    it('uses FIND_ALL_FOLLOWING for FOLLOWING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findAll(TreeScope.FOLLOWING, trueCondition).toString());
        expect(cmd).toContain('GetNextSibling');
    });

    it('uses FIND_ALL_PRECEDING for PRECEDING scope', () => {
        const cmd = decodeCommand(AutomationElement.automationRoot.findAll(TreeScope.PRECEDING, trueCondition).toString());
        expect(cmd).toContain('GetPreviousSibling');
    });
});

describe('FoundAutomationElement', () => {
    const el = new FoundAutomationElement('1.2.3.4.5');

    it('stores runtimeId', () => {
        expect(el.runtimeId).toBe('1.2.3.4.5');
    });

    it('buildCommand returns element table lookup with runtimeId', () => {
        const cmd = decodeCommand(el.buildCommand());
        expect(cmd).toContain('1.2.3.4.5');
    });

    it('buildGetTextCommand returns text retrieval command', () => {
        const cmd = decodeCommand(el.buildGetTextCommand());
        expect(cmd).toContain('TextPattern');
    });

    it('buildInvokeCommand returns InvokePattern command', () => {
        const cmd = decodeCommand(el.buildInvokeCommand());
        expect(cmd).toContain('InvokePattern');
        expect(cmd).toContain('Invoke()');
    });

    it('buildExpandCommand returns ExpandCollapsePattern.Expand command', () => {
        const cmd = decodeCommand(el.buildExpandCommand());
        expect(cmd).toContain('ExpandCollapsePattern');
        expect(cmd).toContain('Expand()');
    });

    it('buildCollapseCommand returns ExpandCollapsePattern.Collapse command', () => {
        const cmd = decodeCommand(el.buildCollapseCommand());
        expect(cmd).toContain('ExpandCollapsePattern');
        expect(cmd).toContain('Collapse()');
    });

    it('buildScrollIntoViewCommand returns ScrollItemPattern command', () => {
        const cmd = decodeCommand(el.buildScrollIntoViewCommand());
        expect(cmd).toContain('ScrollItemPattern');
    });

    it('buildIsMultipleSelectCommand returns SelectionPattern command', () => {
        const cmd = decodeCommand(el.buildIsMultipleSelectCommand());
        expect(cmd).toContain('SelectionPattern');
        expect(cmd).toContain('CanSelectMultiple');
    });

    it('buildIsSelectedCommand returns SelectionItemPattern.IsSelected command', () => {
        const cmd = decodeCommand(el.buildIsSelectedCommand());
        expect(cmd).toContain('SelectionItemPattern');
        expect(cmd).toContain('IsSelected');
    });

    it('buildAddToSelectionCommand returns AddToSelection command', () => {
        const cmd = decodeCommand(el.buildAddToSelectionCommand());
        expect(cmd).toContain('AddToSelection');
    });

    it('buildRemoveFromSelectionCommand returns RemoveFromSelection command', () => {
        const cmd = decodeCommand(el.buildRemoveFromSelectionCommand());
        expect(cmd).toContain('RemoveFromSelection');
    });

    it('buildSelectCommand returns Select command', () => {
        const cmd = decodeCommand(el.buildSelectCommand());
        expect(cmd).toContain('Select()');
    });

    it('buildToggleCommand returns TogglePattern command', () => {
        const cmd = decodeCommand(el.buildToggleCommand());
        expect(cmd).toContain('TogglePattern');
    });

    it('buildSetValueCommand embeds value string', () => {
        const cmd = decodeCommand(el.buildSetValueCommand('hello'));
        expect(cmd).toContain('ValuePattern');
        expect(cmd).toContain('SetValue');
    });

    it('buildSetRangeValueCommand embeds numeric value', () => {
        const cmd = decodeCommand(el.buildSetRangeValueCommand('3.14'));
        expect(cmd).toContain('RangeValuePattern');
        expect(cmd).toContain('SetValue');
    });

    it('buildGetValueCommand returns ValuePattern.Value', () => {
        const cmd = decodeCommand(el.buildGetValueCommand());
        expect(cmd).toContain('ValuePattern');
        expect(cmd).toContain('.Value');
    });

    it('buildGetToggleStateCommand returns ToggleState', () => {
        const cmd = decodeCommand(el.buildGetToggleStateCommand());
        expect(cmd).toContain('ToggleState');
    });

    it('buildMaximizeCommand returns Maximized window visual state', () => {
        const cmd = decodeCommand(el.buildMaximizeCommand());
        expect(cmd).toContain('Maximized');
    });

    it('buildMinimizeCommand returns Minimized window visual state', () => {
        const cmd = decodeCommand(el.buildMinimizeCommand());
        expect(cmd).toContain('Minimized');
    });

    it('buildRestoreCommand returns Normal window visual state', () => {
        const cmd = decodeCommand(el.buildRestoreCommand());
        expect(cmd).toContain('Normal');
    });

    it('buildCloseCommand returns Close() command', () => {
        const cmd = decodeCommand(el.buildCloseCommand());
        expect(cmd).toContain('WindowPattern');
        expect(cmd).toContain('Close()');
    });

    it('buildGetTagNameCommand returns ControlType.ProgrammaticName', () => {
        const cmd = decodeCommand(el.buildGetTagNameCommand());
        expect(cmd).toContain('ControlType');
        expect(cmd).toContain('ProgrammaticName');
    });
});

describe('AutomationElementGroup', () => {
    it('creates a group of automation elements', () => {
        const el1 = AutomationElement.automationRoot;
        const el2 = AutomationElement.rootElement;
        const group = new AutomationElementGroup(el1, el2);
        expect(group.groups).toHaveLength(2);
    });

    it('findAllGroups maps findAll over each element', () => {
        const el1 = AutomationElement.automationRoot;
        const el2 = AutomationElement.rootElement;
        const group = new AutomationElementGroup(el1, el2);
        const results = group.findAllGroups(TreeScope.CHILDREN, trueCondition);
        expect(results).toHaveLength(2);
    });

    it('findFirstGroups maps findFirst over each element', () => {
        const el1 = AutomationElement.automationRoot;
        const el2 = AutomationElement.rootElement;
        const group = new AutomationElementGroup(el1, el2);
        const results = group.findFirstGroups(TreeScope.CHILDREN, trueCondition);
        expect(results).toHaveLength(2);
    });
});
