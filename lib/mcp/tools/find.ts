import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';
import { ELEMENT_KEY } from '../constants.js';

const STRATEGIES = ['accessibility id', 'name', 'id', 'xpath', 'class name', 'tag name', '-windows uiautomation'] as const;
type Strategy = typeof STRATEGIES[number];

// 'id' is documented as an alias for 'accessibility id' (UIA AutomationId).
// All other strategies are forwarded verbatim to the Appium/WinAppDriver protocol.
function resolveStrategy(strategy: Strategy): string {
    return strategy === 'id' ? 'accessibility id' : strategy;
}

const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
    'accessibility id': 'Maps to UIA AutomationId — most stable selector, preferred for test automation. Use when the element has a non-empty AutomationId.',
    'name': 'Maps to UIA Name property (visible label/title). Reliable when text is static and not locale-dependent.',
    'id': 'Alias for accessibility id — maps to UIA AutomationId.',
    'xpath': 'Evaluates XPath against the live UIA tree. Use as fallback when no stable AutomationId or Name exists. Example: //Button[@Name="OK"]',
    'class name': 'Maps to UIA ClassName — rarely unique on its own; use to narrow results when combined with other strategies.',
    'tag name': 'Maps to UIA ControlType (e.g. "Button", "Edit", "TextBlock"). Rarely unique; useful for finding all elements of a type.',
    '-windows uiautomation': 'Raw UIA condition expression for advanced compound queries.',
};

const StrategyEnum = z.enum(STRATEGIES);

const FIND_STRATEGY_PRIORITY = [
    'Preferred strategy order for reliable automation:',
    '1) "accessibility id" (AutomationId) — most stable, use whenever available',
    '2) "name" — good for static labels not subject to localization',
    '3) "xpath" — flexible fallback, e.g. //Button[@Name="OK"]',
    '4) other strategies — use only when the above are unavailable.',
    'After interacting with an element you plan to use in generated test code, call get_element_info to capture the best locator.',
].join(' ');

export function registerFindTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'find_element',
        {
            description: `Find a single UI element in the current app window. Returns an element ID string to pass to other tools. Returns an error if not found. ${FIND_STRATEGY_PRIORITY}`,
            inputSchema: {
                strategy: StrategyEnum.describe(
                    'Locator strategy. ' +
                    Object.entries(STRATEGY_DESCRIPTIONS).map(([k, v]) => `"${k}": ${v}`).join(' | ')
                ),
                selector: z.string().min(1).describe('The selector value for the chosen strategy'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ strategy, selector }) => {
            try {
                const driver = session.getDriver();
                const rawEl = await driver.findElement(resolveStrategy(strategy as Strategy), selector);
                return { content: [{ type: 'text' as const, text: rawEl[ELEMENT_KEY] }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'find_elements',
        {
            description: `Find all UI elements matching the selector. Returns a JSON array of element ID strings. ${FIND_STRATEGY_PRIORITY}`,
            inputSchema: {
                strategy: StrategyEnum.describe(
                    'Locator strategy. ' +
                    Object.entries(STRATEGY_DESCRIPTIONS).map(([k, v]) => `"${k}": ${v}`).join(' | ')
                ),
                selector: z.string().min(1).describe('The selector value for the chosen strategy'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ strategy, selector }) => {
            try {
                const driver = session.getDriver();
                const rawEls = await driver.findElements(resolveStrategy(strategy as Strategy), selector);
                const ids = rawEls.map((el) => el[ELEMENT_KEY]);
                return { content: [{ type: 'text' as const, text: JSON.stringify(ids) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'find_child_element',
        {
            description: `Find a child element within a parent element. Returns an element ID string. ${FIND_STRATEGY_PRIORITY}`,
            inputSchema: {
                parentElementId: z.string().min(1).describe('Element ID of the parent to search within'),
                strategy: StrategyEnum.describe(
                    'Locator strategy. ' +
                    Object.entries(STRATEGY_DESCRIPTIONS).map(([k, v]) => `"${k}": ${v}`).join(' | ')
                ),
                selector: z.string().min(1).describe('The selector value for the chosen strategy'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ parentElementId, strategy, selector }) => {
            try {
                const driver = session.getDriver();
                const rawEl = await driver.findElementFromElement(
                    parentElementId,
                    resolveStrategy(strategy as Strategy),
                    selector
                );
                return { content: [{ type: 'text' as const, text: rawEl[ELEMENT_KEY] }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'wait_for_element',
        {
            description: `Wait for a UI element to appear within a configurable timeout, then return its element ID. Useful after dialog opens, page transitions, or loading spinners disappear. ${FIND_STRATEGY_PRIORITY}`,
            inputSchema: {
                strategy: StrategyEnum.describe(
                    'Locator strategy. ' +
                    Object.entries(STRATEGY_DESCRIPTIONS).map(([k, v]) => `"${k}": ${v}`).join(' | ')
                ),
                selector: z.string().min(1).describe('The selector value for the chosen strategy'),
                timeoutMs: z.number().int().min(0).default(5000).describe('Maximum time in milliseconds to wait for the element'),
                pollIntervalMs: z.number().int().min(50).default(200).describe('How often to retry in milliseconds'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ strategy, selector, timeoutMs, pollIntervalMs }) => {
            const driver = session.getDriver();
            const effectiveStrategy = resolveStrategy(strategy as Strategy);
            const deadline = Date.now() + timeoutMs;
            while (true) {
                try {
                    const rawEl = await driver.findElement(effectiveStrategy, selector);
                    return { content: [{ type: 'text' as const, text: rawEl[ELEMENT_KEY] }] };
                } catch {
                    if (Date.now() >= deadline) {
                        return {
                            isError: true,
                            content: [{ type: 'text' as const, text: `Element not found within ${timeoutMs}ms: ${strategy}="${selector}"` }],
                        };
                    }
                    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                }
            }
        }
    );
}
