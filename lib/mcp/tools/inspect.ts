import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

interface SuggestedSelector {
    strategy: string;
    selector: string;
    reliability: 'high' | 'medium' | 'low';
    note: string;
}

interface ElementInfo {
    elementId: string;
    name: string | null;
    automationId: string | null;
    className: string | null;
    controlType: string | null;
    isEnabled: string | null;
    suggestedSelectors: SuggestedSelector[];
}

/**
 * Build a ranked list of suggested selectors for test automation.
 * Priority: accessibility id (AutomationId) > name > xpath combos.
 */
function buildSuggestedSelectors(
    props: Pick<ElementInfo, 'name' | 'automationId' | 'className' | 'controlType'>
): SuggestedSelector[] {
    const suggestions: SuggestedSelector[] = [];

    // Derive the XPath tag name from ControlType (strip "ControlType." prefix if present)
    const tag = props.controlType?.replace(/^ControlType\./, '') ?? null;

    // 1. AutomationId via accessibility id — most reliable
    if (props.automationId?.trim()) {
        suggestions.push({
            strategy: 'accessibility id',
            selector: props.automationId,
            reliability: 'high',
            note: 'AutomationId — stable across locales and UI layout changes. Preferred for .NET: driver.FindElement(MobileBy.AccessibilityId("' + props.automationId + '"))',
        });
    }

    // 2. XPath with AutomationId — explicit type + stable id
    if (tag && props.automationId?.trim()) {
        suggestions.push({
            strategy: 'xpath',
            selector: `//${tag}[@AutomationId="${props.automationId}"]`,
            reliability: 'high',
            note: 'XPath using AutomationId — use when you also want to assert the control type',
        });
    }

    // 3. Name via name strategy — medium reliability (may change with locale)
    if (props.name?.trim()) {
        suggestions.push({
            strategy: 'name',
            selector: props.name,
            reliability: 'medium',
            note: 'Element Name — may change with localization or dynamic text. .NET: driver.FindElement(MobileBy.Name("' + props.name + '"))',
        });
    }

    // 4. XPath with Name + ControlType
    if (tag && props.name?.trim()) {
        suggestions.push({
            strategy: 'xpath',
            selector: `//${tag}[@Name="${props.name}"]`,
            reliability: 'medium',
            note: 'XPath using Name — readable but locale-sensitive',
        });
    }

    // 5. ClassName as fallback (rarely unique on its own)
    if (props.className?.trim()) {
        suggestions.push({
            strategy: 'class name',
            selector: props.className,
            reliability: 'low',
            note: 'ClassName — often shared by many elements; combine with other strategies in XPath',
        });
    }

    return suggestions;
}

export function registerInspectTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'get_element_info',
        {
            description: [
                'Retrieve all key UIA properties of an element and get ranked selector suggestions for test automation.',
                'Returns: Name, AutomationId, ClassName, ControlType, IsEnabled, and a prioritized list of selectors.',
                'ALWAYS call this after find_element when generating automated test code — it gives you the best locator to use.',
                'Selector reliability order: accessibility id (AutomationId) = highest → name → xpath → class name = lowest.',
                'For .NET/C# Appium: use MobileBy.AccessibilityId(automationId) when AutomationId is non-empty.',
            ].join(' '),
            inputSchema: {
                elementId: z.string().min(1).describe('Element ID returned by find_element'),
            },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });

                // Fetch all relevant UIA properties in parallel
                const [name, automationId, className, controlType, isEnabled] = await Promise.all([
                    el.getAttribute('Name').catch(() => null),
                    el.getAttribute('AutomationId').catch(() => null),
                    el.getAttribute('ClassName').catch(() => null),
                    el.getAttribute('ControlType').catch(() => null),
                    el.getAttribute('IsEnabled').catch(() => null),
                ]);

                const props = {
                    name: name || null,
                    automationId: automationId || null,
                    className: className || null,
                    controlType: controlType || null,
                    isEnabled: isEnabled || null,
                };

                const result: ElementInfo = {
                    elementId,
                    ...props,
                    suggestedSelectors: buildSuggestedSelectors(props),
                };

                return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
