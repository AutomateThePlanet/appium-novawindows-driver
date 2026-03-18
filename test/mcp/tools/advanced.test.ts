import { describe, it, expect, vi } from 'vitest';
import { registerAdvancedTools } from '../../../lib/mcp/tools/advanced.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

describe('advanced tools', () => {
    describe('advanced_click', () => {
        it('calls driver.executeScript("windows: click") with args and returns "clicked"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAdvancedTools(server, session);

            const params = { elementId: 'el-1', button: 'right', modifierKeys: ['ctrl'], durationMs: 0, times: 1, interClickDelayMs: 100 };
            const result = await server.call('advanced_click', params) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: click', [params]);
            expect(result.content[0].text).toBe('clicked');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('click failed'));
            registerAdvancedTools(server, session);

            const result = await server.call('advanced_click', { button: 'left', modifierKeys: [], durationMs: 0, times: 1, interClickDelayMs: 100 }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('click failed');
        });
    });

    describe('send_keys', () => {
        it('calls driver.executeScript("windows: keys") with args and returns "keys sent"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAdvancedTools(server, session);

            const params = { actions: [{ text: 'Hello' }, { virtualKeyCode: 13 }], forceUnicode: false };
            const result = await server.call('send_keys', params) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: keys', [params]);
            expect(result.content[0].text).toBe('keys sent');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('keys failed'));
            registerAdvancedTools(server, session);

            const result = await server.call('send_keys', { actions: [], forceUnicode: false }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('hover', () => {
        it('calls driver.executeScript("windows: hover") with args and returns "hovered"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAdvancedTools(server, session);

            const params = { endX: 100, endY: 200, modifierKeys: [], durationMs: 500 };
            const result = await server.call('hover', params) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: hover', [params]);
            expect(result.content[0].text).toBe('hovered');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('hover failed'));
            registerAdvancedTools(server, session);

            const result = await server.call('hover', { modifierKeys: [], durationMs: 500 }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('scroll', () => {
        it('calls driver.executeScript("windows: scroll") with args and returns "scrolled"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAdvancedTools(server, session);

            const params = { elementId: 'el-1', deltaX: 0, deltaY: 3, modifierKeys: [] };
            const result = await server.call('scroll', params) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: scroll', [params]);
            expect(result.content[0].text).toBe('scrolled');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('scroll failed'));
            registerAdvancedTools(server, session);

            const result = await server.call('scroll', { deltaX: 0, deltaY: 0, modifierKeys: [] }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('click_and_drag', () => {
        it('calls driver.executeScript("windows: clickAndDrag") with args and returns "drag completed"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAdvancedTools(server, session);

            const params = { startX: 10, startY: 10, endX: 100, endY: 100, modifierKeys: [], durationMs: 500, button: 'left' };
            const result = await server.call('click_and_drag', params) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: clickAndDrag', [params]);
            expect(result.content[0].text).toBe('drag completed');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('drag failed'));
            registerAdvancedTools(server, session);

            const result = await server.call('click_and_drag', { modifierKeys: [], durationMs: 500, button: 'left' }) as any;

            expect(result.isError).toBe(true);
        });
    });
});
