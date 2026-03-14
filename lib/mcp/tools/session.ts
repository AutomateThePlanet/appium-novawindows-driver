import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppiumSession } from '../session.js';
import { formatError } from '../errors.js';

export function registerSessionTools(server: McpServer, session: AppiumSession): void {
    server.registerTool(
        'create_session',
        {
            description:
                'Start an Appium session by launching a Windows application. Must be called before any other tool. ' +
                'Provide either an executable path (e.g. "C:\\\\Windows\\\\notepad.exe") or a UWP App ID (e.g. "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App").',
            inputSchema: {
                app: z.string().min(1).describe(
                    'Executable path (e.g. "C:\\\\Windows\\\\notepad.exe") or UWP App ID ' +
                    '(e.g. "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App") or "Root" to attach to the desktop root.'
                ),
                appArguments: z.string().optional().describe('Command-line arguments to pass to the app'),
                appWorkingDir: z.string().optional().describe('Working directory for the app process'),
                waitForAppLaunch: z.number().int().min(0).optional().describe('Milliseconds to wait after app launch before interacting'),
                shouldCloseApp: z.boolean().optional().default(true).describe('Whether to close the app when delete_session is called'),
                implicitTimeout: z.number().int().min(0).optional().default(1500).describe('Implicit element wait timeout in milliseconds'),
                delayAfterClick: z.number().int().min(0).optional().describe('Milliseconds to wait after each click'),
                delayBeforeClick: z.number().int().min(0).optional().describe('Milliseconds to wait before each click'),
                smoothPointerMove: z.string().optional().describe('Easing function name for smooth pointer movement'),
            },
        },
        async (params) => {
            try {
                await session.create(params);
                return { content: [{ type: 'text' as const, text: `Session created. App "${params.app}" is ready for interaction.` }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'delete_session',
        {
            description: 'End the current Appium session. Closes the app (unless shouldCloseApp was set to false when creating the session). Call this when testing is complete.',
        },
        async () => {
            try {
                if (!session.isActive()) {
                    return { content: [{ type: 'text' as const, text: 'No active session to delete.' }] };
                }
                await session.delete();
                return { content: [{ type: 'text' as const, text: 'Session deleted successfully.' }] };
            } catch (err) {
                return { isError: true, content: [{ type: 'text' as const, text: formatError(err) }] };
            }
        }
    );

    server.registerTool(
        'get_session_status',
        {
            description: 'Check whether a session is currently active.',
        },
        async () => {
            const active = session.isActive();
            return { content: [{ type: 'text' as const, text: active ? 'Session is active.' : 'No active session. Call create_session to start one.' }] };
        }
    );
}
