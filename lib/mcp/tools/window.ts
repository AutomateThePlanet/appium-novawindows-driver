import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const elementIdSchema = z.string().min(1).describe('Element ID returned by find_element or get_window_element');
const elementIdInput = { elementId: elementIdSchema };

export function registerWindowTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'take_screenshot',
        {
            description: 'Capture a screenshot of the current app window as a PNG image.',
            annotations: { readOnlyHint: true },
        },
        async () => {
            try {
                const driver = session.getDriver();
                const base64 = await driver.takeScreenshot();
                return { content: [{ type: 'image' as const, data: base64, mimeType: 'image/png' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_page_source',
        {
            description: 'Get the XML representation of the current UI element tree. Useful for understanding the app structure before deciding what to interact with.',
            annotations: { readOnlyHint: true },
        },
        async () => {
            try {
                const driver = session.getDriver();
                const source = await driver.getPageSource();
                return { content: [{ type: 'text' as const, text: source }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_window_rect',
        {
            description: 'Get the position and size of the current app window.',
            annotations: { readOnlyHint: true },
        },
        async () => {
            try {
                const driver = session.getDriver();
                const rect = await driver.getWindowRect();
                return { content: [{ type: 'text' as const, text: JSON.stringify(rect) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_window_handles',
        {
            description: 'Get all available window handles for the current session.',
            annotations: { readOnlyHint: true },
        },
        async () => {
            try {
                const driver = session.getDriver();
                const handles = await driver.getWindowHandles();
                return { content: [{ type: 'text' as const, text: JSON.stringify(handles) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'switch_to_window',
        {
            description: 'Switch focus to a different window by its handle.',
            inputSchema: {
                handle: z.string().min(1).describe('Window handle to switch to (from get_window_handles)'),
            },
        },
        async ({ handle }) => {
            try {
                const driver = session.getDriver();
                await driver.switchToWindow(handle);
                return { content: [{ type: 'text' as const, text: `Switched to window: ${handle}` }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    // Window-pattern tools (UIA Window pattern) — operate on a window element ID

    server.registerTool(
        'maximize_window',
        {
            description: 'Maximize a window element via the UIA Window pattern.',
            inputSchema: elementIdInput,
            annotations: { idempotentHint: true },
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
            annotations: { idempotentHint: true },
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
            annotations: { idempotentHint: true },
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
            annotations: { destructiveHint: true },
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
