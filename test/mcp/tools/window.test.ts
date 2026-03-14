import { describe, it, expect, vi } from 'vitest';
import { registerWindowTools } from '../../../lib/mcp/tools/window.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

describe('window tools', () => {
    describe('take_screenshot', () => {
        it('calls driver.takeScreenshot() and returns base64 string', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.takeScreenshot = vi.fn().mockResolvedValue('base64encodedpng');
            registerWindowTools(server, session);

            const result = await server.call('take_screenshot') as any;

            expect(mockBrowser.takeScreenshot).toHaveBeenCalled();
            expect(result.content[0].text).toBe('base64encodedpng');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.takeScreenshot = vi.fn().mockRejectedValue(new Error('screenshot failed'));
            registerWindowTools(server, session);

            const result = await server.call('take_screenshot') as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('screenshot failed');
        });
    });

    describe('get_page_source', () => {
        it('calls driver.getPageSource() and returns XML string', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.getPageSource = vi.fn().mockResolvedValue('<AppiumAUT><Window Name="App"/></AppiumAUT>');
            registerWindowTools(server, session);

            const result = await server.call('get_page_source') as any;

            expect(mockBrowser.getPageSource).toHaveBeenCalled();
            expect(result.content[0].text).toContain('<Window');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.getPageSource = vi.fn().mockRejectedValue(new Error('page source failed'));
            registerWindowTools(server, session);

            const result = await server.call('get_page_source') as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_window_rect', () => {
        it('calls driver.getWindowRect() and returns JSON', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            const rect = { x: 10, y: 20, width: 800, height: 600 };
            mockBrowser.getWindowRect = vi.fn().mockResolvedValue(rect);
            registerWindowTools(server, session);

            const result = await server.call('get_window_rect') as any;

            expect(mockBrowser.getWindowRect).toHaveBeenCalled();
            expect(JSON.parse(result.content[0].text)).toEqual(rect);
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.getWindowRect = vi.fn().mockRejectedValue(new Error('rect failed'));
            registerWindowTools(server, session);

            const result = await server.call('get_window_rect') as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_window_handles', () => {
        it('calls driver.getWindowHandles() and returns JSON array', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.getWindowHandles = vi.fn().mockResolvedValue(['h1', 'h2', 'h3']);
            registerWindowTools(server, session);

            const result = await server.call('get_window_handles') as any;

            expect(mockBrowser.getWindowHandles).toHaveBeenCalled();
            expect(JSON.parse(result.content[0].text)).toEqual(['h1', 'h2', 'h3']);
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.getWindowHandles = vi.fn().mockRejectedValue(new Error('handles failed'));
            registerWindowTools(server, session);

            const result = await server.call('get_window_handles') as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('switch_to_window', () => {
        it('calls driver.switchToWindow() with the handle', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerWindowTools(server, session);

            const result = await server.call('switch_to_window', { handle: 'h2' }) as any;

            expect(mockBrowser.switchToWindow).toHaveBeenCalledWith('h2');
            expect(result.content[0].text).toContain('h2');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.switchToWindow = vi.fn().mockRejectedValue(new Error('switch failed'));
            registerWindowTools(server, session);

            const result = await server.call('switch_to_window', { handle: 'bad' }) as any;

            expect(result.isError).toBe(true);
        });
    });
});
