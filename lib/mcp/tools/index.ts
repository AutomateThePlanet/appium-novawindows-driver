import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppiumSession } from '../session.js';
import { registerSessionTools } from './session.js';
import { registerFindTools } from './find.js';
import { registerInteractTools } from './interact.js';
import { registerInspectTools } from './inspect.js';
import { registerWindowTools } from './window.js';
import { registerAdvancedTools } from './advanced.js';
import { registerPatternTools } from './patterns.js';
import { registerAppTools } from './app.js';
import { registerClipboardTools } from './clipboard.js';

export function registerAllTools(server: McpServer, session: AppiumSession): void {
    registerSessionTools(server, session);
    registerFindTools(server, session);
    registerInteractTools(server, session);
    registerInspectTools(server, session);
    registerWindowTools(server, session);
    registerAdvancedTools(server, session);
    registerPatternTools(server, session);
    registerAppTools(server, session);
    registerClipboardTools(server, session);
}
