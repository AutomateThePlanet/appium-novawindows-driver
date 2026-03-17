import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

const modifierKeys = z.array(z.enum(['shift', 'ctrl', 'alt', 'win'])).default([]);

export function registerAdvancedTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'advanced_click',
        {
            description: 'Perform an advanced click with modifier keys, multiple clicks, or custom duration. Use this for right-click, Ctrl+click, double-click, etc.',
            annotations: { destructiveHint: false },
            inputSchema: {
                elementId: z.string().optional().describe('Element to click (its center). Provide either elementId or x+y.'),
                x: z.number().int().optional().describe('Absolute screen x coordinate'),
                y: z.number().int().optional().describe('Absolute screen y coordinate'),
                button: z.enum(['left', 'right', 'middle', 'back', 'forward']).default('left'),
                modifierKeys,
                durationMs: z.number().int().min(0).default(0).describe('Hold duration in ms (for long-press)'),
                times: z.number().int().min(1).default(1).describe('Number of clicks (2 = double-click)'),
                interClickDelayMs: z.number().int().min(0).default(100),
            },
        },
        async (args) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: click', [args]);
                return { content: [{ type: 'text' as const, text: 'clicked' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'send_keys',
        {
            description: 'Send keyboard input. Each action can be a pause (ms delay), text to type, or a virtual key code press/release.',
            annotations: { destructiveHint: false },
            inputSchema: {
                actions: z.array(z.object({
                    pause: z.number().int().optional().describe('Pause in milliseconds'),
                    text: z.string().optional().describe('Text to type (unicode supported)'),
                    virtualKeyCode: z.number().int().optional().describe('Windows Virtual Key code (e.g. 13 = Enter, 27 = Escape)'),
                    down: z.boolean().optional().describe('true = key down only, false = key up only, omit = press and release'),
                })).describe('Sequence of keyboard actions to perform'),
                forceUnicode: z.boolean().default(false).describe('Use Unicode input method for special characters'),
            },
        },
        async (args) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: keys', [args]);
                return { content: [{ type: 'text' as const, text: 'keys sent' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'hover',
        {
            description: 'Move the mouse pointer from one position to another, optionally with modifier keys held. Useful for hover effects and drag-without-click.',
            inputSchema: {
                startElementId: z.string().optional().describe('Element to start hover from (uses element center)'),
                startX: z.number().int().optional(),
                startY: z.number().int().optional(),
                endElementId: z.string().optional().describe('Element to hover to'),
                endX: z.number().int().optional(),
                endY: z.number().int().optional(),
                modifierKeys,
                durationMs: z.number().int().min(0).default(500).describe('Duration of the hover movement in ms'),
            },
        },
        async (args) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: hover', [args]);
                return { content: [{ type: 'text' as const, text: 'hovered' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'scroll',
        {
            description: 'Scroll the mouse wheel at an element or screen coordinate.',
            inputSchema: {
                elementId: z.string().optional().describe('Element to scroll over (uses element center)'),
                x: z.number().int().optional().describe('Absolute screen x coordinate'),
                y: z.number().int().optional().describe('Absolute screen y coordinate'),
                deltaX: z.number().int().default(0).describe('Horizontal scroll amount (positive = right)'),
                deltaY: z.number().int().default(0).describe('Vertical scroll amount (positive = down)'),
                modifierKeys,
            },
        },
        async (args) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: scroll', [args]);
                return { content: [{ type: 'text' as const, text: 'scrolled' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'click_and_drag',
        {
            description: 'Click and drag from one position to another. Useful for resizing, reordering, or moving elements.',
            inputSchema: {
                startElementId: z.string().optional().describe('Element to start drag from'),
                startX: z.number().int().optional(),
                startY: z.number().int().optional(),
                endElementId: z.string().optional().describe('Element to drag to'),
                endX: z.number().int().optional(),
                endY: z.number().int().optional(),
                modifierKeys,
                durationMs: z.number().int().min(0).default(500),
                button: z.enum(['left', 'right', 'middle']).default('left'),
            },
        },
        async (args) => {
            try {
                const driver = session.getDriver();
                await driver.executeScript('windows: clickAndDrag', [args]);
                return { content: [{ type: 'text' as const, text: 'drag completed' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );
}
