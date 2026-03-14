import { describe, it, expect, vi } from 'vitest';
import { registerFindTools } from '../../../lib/mcp/tools/find.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

describe('find tools', () => {
    describe('find_element', () => {
        it('calls driver.$() with accessibility id selector and returns elementId', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            mockElement.elementId = 'found-el-id';
            registerFindTools(server, session);

            const result = await server.call('find_element', { strategy: 'accessibility id', selector: 'MyButton' }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith('~MyButton');
            expect(mockElement.isExisting).toHaveBeenCalled();
            expect(result.content[0].text).toBe('found-el-id');
            expect(result.isError).toBeUndefined();
        });

        it('calls driver.$() with xpath selector', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerFindTools(server, session);

            await server.call('find_element', { strategy: 'xpath', selector: '//Button[@Name="OK"]' });

            expect(mockBrowser.$).toHaveBeenCalledWith('//Button[@Name="OK"]');
        });

        it('returns isError when element does not exist', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.isExisting = vi.fn().mockResolvedValue(false);
            registerFindTools(server, session);

            const result = await server.call('find_element', { strategy: 'accessibility id', selector: 'Missing' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not found');
        });

        it('returns isError when driver throws', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.$ = vi.fn().mockRejectedValue(new Error('Driver error'));
            registerFindTools(server, session);

            const result = await server.call('find_element', { strategy: 'accessibility id', selector: 'x' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Driver error');
        });
    });

    describe('find_elements', () => {
        it('calls driver.$$() and returns JSON array of element IDs', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            mockElement.elementId = 'el-1';
            const el2 = { elementId: 'el-2' };
            mockBrowser.$$ = vi.fn().mockResolvedValue([mockElement, el2]);
            registerFindTools(server, session);

            const result = await server.call('find_elements', { strategy: 'xpath', selector: '//Button' }) as any;

            expect(mockBrowser.$$).toHaveBeenCalledWith('//Button');
            const ids = JSON.parse(result.content[0].text);
            expect(ids).toEqual(['el-1', 'el-2']);
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.$$ = vi.fn().mockRejectedValue(new Error('find failed'));
            registerFindTools(server, session);

            const result = await server.call('find_elements', { strategy: 'xpath', selector: '//Button' }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('find_child_element', () => {
        it('finds parent by element key then child by built selector', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            registerFindTools(server, session);

            const result = await server.call('find_child_element', {
                parentElementId: 'parent-id',
                strategy: 'name',
                selector: 'ChildItem',
            }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith({ [ELEMENT_KEY]: 'parent-id' });
            expect(mockElement.$).toHaveBeenCalledWith('*[name="ChildItem"]');
            expect(result.content[0].text).toBe('child-element-id');
        });

        it('returns isError when child does not exist', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            const childEl = { elementId: 'c', isExisting: vi.fn().mockResolvedValue(false) };
            mockElement.$ = vi.fn().mockResolvedValue(childEl);
            registerFindTools(server, session);

            const result = await server.call('find_child_element', {
                parentElementId: 'p',
                strategy: 'accessibility id',
                selector: 'Missing',
            }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not found');
        });
    });
});
