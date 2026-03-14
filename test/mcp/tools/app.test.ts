import { describe, it, expect, vi } from 'vitest';
import { registerAppTools } from '../../../lib/mcp/tools/app.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

describe('app tools', () => {
    describe('get_window_element', () => {
        it('calls executeScript("windows: getWindowElement") and extracts element ID from result', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue({ [ELEMENT_KEY]: 'window-el-id' });
            registerAppTools(server, session);

            const result = await server.call('get_window_element') as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: getWindowElement', [{}]);
            expect(result.content[0].text).toBe('window-el-id');
            expect(result.isError).toBeUndefined();
        });

        it('falls back to ELEMENT key if element-6066 key is absent', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue({ ELEMENT: 'legacy-el-id' });
            registerAppTools(server, session);

            const result = await server.call('get_window_element') as any;

            expect(result.content[0].text).toBe('legacy-el-id');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('getWindowElement failed'));
            registerAppTools(server, session);

            const result = await server.call('get_window_element') as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('getWindowElement failed');
        });
    });

    describe('launch_app', () => {
        it('calls executeScript("windows: launchApp") and returns "app launched"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAppTools(server, session);

            const result = await server.call('launch_app') as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: launchApp', [{}]);
            expect(result.content[0].text).toBe('app launched');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('launch failed'));
            registerAppTools(server, session);

            const result = await server.call('launch_app') as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('close_app', () => {
        it('calls executeScript("windows: closeApp") and returns "app closed"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerAppTools(server, session);

            const result = await server.call('close_app') as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: closeApp', [{}]);
            expect(result.content[0].text).toBe('app closed');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('close failed'));
            registerAppTools(server, session);

            const result = await server.call('close_app') as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_device_time', () => {
        it('calls executeScript("windows: getDeviceTime") and returns stringified result', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue('2026-03-13T10:00:00');
            registerAppTools(server, session);

            const result = await server.call('get_device_time') as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: getDeviceTime', [{}]);
            expect(result.content[0].text).toBe('2026-03-13T10:00:00');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('time failed'));
            registerAppTools(server, session);

            const result = await server.call('get_device_time') as any;

            expect(result.isError).toBe(true);
        });
    });
});
