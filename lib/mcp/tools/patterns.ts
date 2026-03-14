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
            description: 'Toggle a checkbox or toggle button via the UIA Toggle pattern.',
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
        'set_element_value',
        {
            description: 'Set the value of an element via the UIA Value or RangeValue pattern (e.g. sliders, spin boxes).',
            inputSchema: {
                elementId: elementIdSchema,
                value: z.string().describe('The value to set'),
            },
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
        'maximize_window',
        {
            description: 'Maximize a window element via the UIA Window pattern.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: maximize', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'maximized' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'minimize_window',
        {
            description: 'Minimize a window element via the UIA Window pattern.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: minimize', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'minimized' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'restore_window',
        {
            description: 'Restore a minimized or maximized window to its normal state via the UIA Window pattern.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: restore', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'restored' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'close_window',
        {
            description: 'Close a window element via the UIA Window pattern.',
            inputSchema: elementIdInput,
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: close', [{ elementId }]);
                return { content: [{ type: 'text' as const, text: 'closed' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
