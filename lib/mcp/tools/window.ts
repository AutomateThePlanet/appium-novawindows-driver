import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

export function registerWindowTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'take_screenshot',
        {
            description: 'Capture a screenshot of the current app window as a base64-encoded PNG string.',
        },
        async () => {
            try {
                const driver = session.getDriver();
                const base64 = await driver.takeScreenshot();
                return { content: [{ type: 'text' as const, text: base64 }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_page_source',
        {
            description: 'Get the XML representation of the current UI element tree. Useful for understanding the app structure before deciding what to interact with.',
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
}
