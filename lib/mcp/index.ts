#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { AppiumManager } from './appium-manager.js';
import { AppiumSession } from './session.js';
import { registerAllTools } from './tools/index.js';

async function main() {
    // Step 1: Load infrastructure config (host, port, auto-start only — no app required)
    let config;
    try {
        config = loadConfig();
    } catch (err) {
        process.stderr.write(`[MCP] Configuration error: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    }

    // Step 2: Ensure Appium is running
    const appiumManager = new AppiumManager();
    try {
        await appiumManager.ensureRunning(config);
    } catch (err) {
        process.stderr.write(`[MCP] Failed to start Appium: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    }

    // Step 3: Create session holder (no app launched yet — agent calls create_session)
    const session = new AppiumSession(config);

    // Step 4: Create and configure MCP server
    const server = new McpServer({
        name: 'novawindows-mcp',
        version: '1.3.0',
    });

    // Step 5: Register all tools (including create_session / delete_session)
    registerAllTools(server, session);

    // Step 6: Shutdown handler
    let shuttingDown = false;
    async function shutdown(reason: string) {
        if (shuttingDown) {return;}
        shuttingDown = true;
        process.stderr.write(`[MCP] Shutting down (${reason})...\n`);

        if (session.isActive()) {
            await Promise.race([
                session.delete(),
                new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
            ]);
        }

        await appiumManager.shutdown();
        process.exit(0);
    }

    process.on('SIGINT', () => { shutdown('SIGINT'); });
    process.on('SIGTERM', () => { shutdown('SIGTERM'); });
    process.stdin.on('end', () => { shutdown('stdin closed'); });

    // Step 7: Connect transport (stdout is owned by MCP protocol — all logs go to stderr)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('[MCP] novawindows-mcp server ready. Call create_session to launch an app.\n');
}

main();
