import { describe, it, expect, vi } from 'vitest';
import { registerPatternTools } from '../../../lib/mcp/tools/patterns.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEM_ID = 'pattern-el-1';

describe('pattern tools', () => {
    describe('invoke_element', () => {
        it('calls driver.executeScript("windows: invoke", [{elementId}]) and returns "invoked"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('invoke_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: invoke', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('invoked');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('invoke failed'));
            registerPatternTools(server, session);

            const result = await server.call('invoke_element', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('expand_element', () => {
        it('calls driver.executeScript("windows: expand") and returns "expanded"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('expand_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: expand', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('expanded');
        });
    });

    describe('collapse_element', () => {
        it('calls driver.executeScript("windows: collapse") and returns "collapsed"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('collapse_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: collapse', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('collapsed');
        });
    });

    describe('toggle_element', () => {
        it('calls driver.executeScript("windows: toggle") and returns "toggled"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('toggle_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: toggle', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('toggled');
        });
    });

    describe('set_element_value', () => {
        it('calls driver.executeScript("windows: setValue", [{elementId, value}]) and returns "value set"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('set_element_value', { elementId: ELEM_ID, value: '42' }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: setValue', [{ elementId: ELEM_ID, value: '42' }]);
            expect(result.content[0].text).toBe('value set');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('setValue failed'));
            registerPatternTools(server, session);

            const result = await server.call('set_element_value', { elementId: ELEM_ID, value: '1' }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_element_value', () => {
        it('calls driver.executeScript("windows: getValue") and returns stringified result', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockResolvedValue(75);
            registerPatternTools(server, session);

            const result = await server.call('get_element_value', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: getValue', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('75');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('getValue failed'));
            registerPatternTools(server, session);

            const result = await server.call('get_element_value', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('maximize_window', () => {
        it('calls driver.executeScript("windows: maximize") and returns "maximized"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('maximize_window', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: maximize', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('maximized');
        });
    });

    describe('minimize_window', () => {
        it('calls driver.executeScript("windows: minimize") and returns "minimized"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('minimize_window', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: minimize', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('minimized');
        });
    });

    describe('restore_window', () => {
        it('calls driver.executeScript("windows: restore") and returns "restored"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('restore_window', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: restore', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('restored');
        });
    });

    describe('close_window', () => {
        it('calls driver.executeScript("windows: close") and returns "closed"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerPatternTools(server, session);

            const result = await server.call('close_window', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.executeScript).toHaveBeenCalledWith('windows: close', [{ elementId: ELEM_ID }]);
            expect(result.content[0].text).toBe('closed');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.executeScript = vi.fn().mockRejectedValue(new Error('close failed'));
            registerPatternTools(server, session);

            const result = await server.call('close_window', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });
});
