import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMockServer() {
    const handlers = new Map<string, (params: unknown) => Promise<unknown>>();
    const server = {
        registerTool: (_name: string, _config: unknown, handler: (params: unknown) => Promise<unknown>) => {
            handlers.set(_name, handler);
        },
        call: (name: string, params: unknown = {}) => {
            const handler = handlers.get(name);
            if (!handler) { throw new Error(`Tool not registered: ${name}`); }
            return handler(params);
        },
    };
    return server as unknown as McpServer & typeof server;
}
