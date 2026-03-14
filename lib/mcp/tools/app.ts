import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

export function registerAppTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'get_window_element',
        {
            description: 'Get the root UI element of the current app window. Returns an element ID that represents the top-level window.',
        },
        async () => {
            try {
                const driver = session.getDriver();
                const result = await driver.executeScript('windows: getWindowElement', [{}]);
                const elementId = (result as Record<string, string>)['element-6066-11e4-a52e-4f735466cecf']
                    ?? (result as Record<string, string>).ELEMENT
                    ?? String(result);
                return { content: [{ type: 'text' as const, text: elementId }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'launch_app',
        {
            description: 'Launch the application configured for this session (re-launch if it was closed).',
        },
        async () => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: launchApp', [{}]);
                return { content: [{ type: 'text' as const, text: 'app launched' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'close_app',
        {
            description: 'Close the application under test without ending the session.',
        },
        async () => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: closeApp', [{}]);
                return { content: [{ type: 'text' as const, text: 'app closed' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_device_time',
        {
            description: 'Get the current date/time on the Windows device.',
        },
        async () => {
            try {
                const driver = session.getDriver();
                const result = await driver.executeScript('windows: getDeviceTime', [{}]);
                return { content: [{ type: 'text' as const, text: String(result) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
