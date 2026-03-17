import { describe, it, expect, vi } from 'vitest';
import { registerClipboardTools } from '../../../lib/mcp/tools/clipboard.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

describe('clipboard tools', () => {
    describe('get_clipboard', () => {
        it('calls executeScript("windows: getClipboard", [contentType]) and returns stringified result', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue('aGVsbG8=');
            registerClipboardTools(server, session);

            const result = await server.call('get_clipboard', { contentType: 'plaintext' }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: getClipboard', [{ contentType: 'plaintext' }]);
            expect(result.content[0].text).toBe('aGVsbG8=');
            expect(result.isError).toBeUndefined();
        });

        it('supports image content type', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue('imagebase64data');
            registerClipboardTools(server, session);

            const result = await server.call('get_clipboard', { contentType: 'image' }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: getClipboard', [{ contentType: 'image' }]);
            expect(result.content[0].text).toBe('imagebase64data');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('clipboard read failed'));
            registerClipboardTools(server, session);

            const result = await server.call('get_clipboard', { contentType: 'plaintext' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('clipboard read failed');
        });
    });

    describe('set_clipboard', () => {
        it('calls executeScript("windows: setClipboard", [{b64Content, contentType}]) and returns "clipboard set"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerClipboardTools(server, session);

            const result = await server.call('set_clipboard', { b64Content: 'aGVsbG8=', contentType: 'plaintext' }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith(
                'windows: setClipboard',
                [{ b64Content: 'aGVsbG8=', contentType: 'plaintext' }]
            );
            expect(result.content[0].text).toBe('clipboard set');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('clipboard write failed'));
            registerClipboardTools(server, session);

            const result = await server.call('set_clipboard', { b64Content: 'abc', contentType: 'plaintext' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('clipboard write failed');
        });
    });
});
