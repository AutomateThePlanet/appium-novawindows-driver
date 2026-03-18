import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const elementIdSchema = z.string().min(1).describe('Element ID returned by find_element');
const elementIdInput = { elementId: elementIdSchema };

export function registerPatternTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'invoke_element',
        {
            description: 'Invoke the default action of an element via the UIA Invoke pattern (e.g. click a button programmatically without mouse input).',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: invoke', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'invoked' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'expand_element',
        {
            description: 'Expand a collapsible element (tree node, combo box, menu) via the UIA ExpandCollapse pattern.',
            inputSchema: elementIdInput,
            annotations: { idempotentHint: true },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: expand', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'expanded' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'collapse_element',
        {
            description: 'Collapse an expanded element via the UIA ExpandCollapse pattern.',
            inputSchema: elementIdInput,
            annotations: { idempotentHint: true },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: collapse', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'collapsed' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'toggle_element',
        {
            description: 'Toggle a checkbox or toggle button via the UIA Toggle pattern. To confirm the resulting state, call get_toggle_state after this.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: toggle', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'toggled' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_toggle_state',
        {
            description: 'Get the toggle state of a checkbox or toggle button via the UIA Toggle pattern. Returns "On", "Off", or "Indeterminate".',
            inputSchema: elementIdInput,
            annotations: { readOnlyHint: true },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const result = await driver.executeScript('windows: getToggleState', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: String(result) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'set_element_value',
        {
            description: 'Set the value of an element via the UIA Value or RangeValue pattern (e.g. sliders, spin boxes).',
            inputSchema: {
                elementId: elementIdSchema,
                value: z.string().describe('The value to set'),
            },
            annotations: { destructiveHint: false },
        },
        async ({ elementId, value }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: setValue', [{ elementId, value }]);
                return { content: [{ type: 'text' as const, text: 'value set' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_element_value',
        {
            description: 'Get the value of an element via the UIA Value pattern.',
            inputSchema: elementIdInput,
            annotations: { readOnlyHint: true },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const result = await driver.executeScript('windows: getValue', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: String(result) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'focus_element',
        {
            description: 'Set focus to an element via the UIA Focus pattern (windows: setFocus). Required before keyboard-driven interactions such as send_keys on a specific control.',
            inputSchema: elementIdInput,
            annotations: { idempotentHint: true },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: setFocus', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'focused' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'select_item',
        {
            description: 'Select an item in a list box, tab control, or combo box via the UIA SelectionItem pattern (windows: select). Use when click does not trigger selection.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: select', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'selected' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
