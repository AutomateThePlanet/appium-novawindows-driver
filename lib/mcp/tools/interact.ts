import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const elementIdSchema = z.string().min(1).describe('Element ID returned by find_element');
const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

export function registerInteractTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'click_element',
        {
            description: 'Click a UI element by its element ID.',
            inputSchema: { elementId: elementIdSchema },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                await el.click();
                return { content: [{ type: 'text' as const, text: 'clicked' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'set_value',
        {
            description: 'Set the text value of an input element (clears first then types).',
            inputSchema: {
                elementId: elementIdSchema,
                value: z.string().describe('The text value to set'),
            },
        },
        async ({ elementId, value }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                await el.setValue(value);
                return { content: [{ type: 'text' as const, text: 'value set' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'clear_element',
        {
            description: 'Clear the text content of an input element.',
            inputSchema: { elementId: elementIdSchema },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                await el.clearValue();
                return { content: [{ type: 'text' as const, text: 'cleared' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_text',
        {
            description: 'Get the visible text content of a UI element.',
            inputSchema: { elementId: elementIdSchema },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                const text = await el.getText();
                return { content: [{ type: 'text' as const, text }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_attribute',
        {
            description: 'Get an attribute or property of a UI element. Common attributes: Name, AutomationId, ClassName, IsEnabled, IsOffscreen, ControlType, Value.Value.',
            inputSchema: {
                elementId: elementIdSchema,
                attribute: z.string().min(1).describe('Attribute name, e.g. "Name", "IsEnabled", "ControlType"'),
            },
        },
        async ({ elementId, attribute }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                const value = await el.getAttribute(attribute);
                return { content: [{ type: 'text' as const, text: value ?? 'null' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'is_element_displayed',
        {
            description: 'Check whether a UI element is visible on screen (not off-screen).',
            inputSchema: { elementId: elementIdSchema },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                const displayed = await el.isDisplayed();
                return { content: [{ type: 'text' as const, text: String(displayed) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'is_element_enabled',
        {
            description: 'Check whether a UI element is enabled and interactable.',
            inputSchema: { elementId: elementIdSchema },
        },
        async ({ elementId }) => {
            try {
                const driver = session.getDriver();
                const el = await driver.$({ [ELEMENT_KEY]: elementId });
                const enabled = await el.isEnabled();
                return { content: [{ type: 'text' as const, text: String(enabled) }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
