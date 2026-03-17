import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const contentTypeSchema = z.enum(['plaintext', 'image']).default('plaintext');

export function registerClipboardTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'get_clipboard',
        {
            description: 'Read the current clipboard contents as a base64-encoded string.',
            inputSchema: {
                contentType: contentTypeSchema.describe('"plaintext" for text, "image" for image content'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ contentType }) => {
            try {
                const driver = session.getDriver();
                const result = await driver.executeScript('windows: getClipboard', [{ contentType }]);
                return { content: [{ type: 'text' as const, text: String(result) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'set_clipboard',
        {
            description: 'Set the clipboard contents from a base64-encoded string.',
            inputSchema: {
                b64Content: z.string().min(1).describe('Base64-encoded content to set'),
                contentType: contentTypeSchema.describe('"plaintext" for text, "image" for image content'),
            },
        },
        async ({ b64Content, contentType }) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: setClipboard', [{ b64Content, contentType }]);
                return { content: [{ type: 'text' as const, text: 'clipboard set' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
