import { describe, it, expect, vi } from 'vitest';
import { registerFindTools } from '../../../lib/mcp/tools/find.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

describe('find tools', () => {
    describe('find_element', () => {
        it('calls driver.findElement() with accessibility id and returns elementId', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElement = vi.fn().mockResolvedValue({ [ELEMENT_KEY]: 'found-el-id' });
            registerFindTools(server, session);

            const result = await server.call('find_element', { strategy: 'accessibility id', selector: 'MyButton' }) as any;

            expect(mockBrowser.findElement).toHaveBeenCalledWith('accessibility id', 'MyButton');
            expect(result.content[0].text).toBe('found-el-id');
            expect(result.isError).toBeUndefined();
        });

        it('maps "id" strategy to "accessibility id"', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerFindTools(server, session);

            await server.call('find_element', { strategy: 'id', selector: 'MyId' });

            expect(mockBrowser.findElement).toHaveBeenCalledWith('accessibility id', 'MyId');
        });

        it('calls driver.findElement() with xpath strategy directly', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerFindTools(server, session);

            await server.call('find_element', { strategy: 'xpath', selector: '//Button[@Name="OK"]' });

            expect(mockBrowser.findElement).toHaveBeenCalledWith('xpath', '//Button[@Name="OK"]');
        });

        it('calls driver.findElement() with name strategy directly (no CSS hack)', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerFindTools(server, session);

            await server.call('find_element', { strategy: 'name', selector: 'Submit' });

            expect(mockBrowser.findElement).toHaveBeenCalledWith('name', 'Submit');
        });

        it('calls driver.findElement() with class name strategy directly (no CSS hack)', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            registerFindTools(server, session);

            await server.call('find_element', { strategy: 'class name', selector: 'Button' });

            expect(mockBrowser.findElement).toHaveBeenCalledWith('class name', 'Button');
        });

        it('returns isError when driver throws (element not found)', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElement = vi.fn().mockRejectedValue(new Error('no such element'));
            registerFindTools(server, session);

            const result = await server.call('find_element', { strategy: 'accessibility id', selector: 'Missing' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('no such element');
        });
    });

    describe('find_elements', () => {
        it('calls driver.findElements() and returns JSON array of element IDs', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElements = vi.fn().mockResolvedValue([
                { [ELEMENT_KEY]: 'el-1' },
                { [ELEMENT_KEY]: 'el-2' },
            ]);
            registerFindTools(server, session);

            const result = await server.call('find_elements', { strategy: 'xpath', selector: '//Button' }) as any;

            expect(mockBrowser.findElements).toHaveBeenCalledWith('xpath', '//Button');
            const ids = JSON.parse(result.content[0].text);
            expect(ids).toEqual(['el-1', 'el-2']);
        });

        it('returns empty array when no elements found', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElements = vi.fn().mockResolvedValue([]);
            registerFindTools(server, session);

            const result = await server.call('find_elements', { strategy: 'xpath', selector: '//Button' }) as any;

            expect(JSON.parse(result.content[0].text)).toEqual([]);
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElements = vi.fn().mockRejectedValue(new Error('find failed'));
            registerFindTools(server, session);

            const result = await server.call('find_elements', { strategy: 'xpath', selector: '//Button' }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('find_child_element', () => {
        it('calls driver.findElementFromElement() with parent id and strategy', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElementFromElement = vi.fn().mockResolvedValue({ [ELEMENT_KEY]: 'child-id' });
            registerFindTools(server, session);

            const result = await server.call('find_child_element', {
                parentElementId: 'parent-id',
                strategy: 'name',
                selector: 'ChildItem',
            }) as any;

            expect(mockBrowser.findElementFromElement).toHaveBeenCalledWith('parent-id', 'name', 'ChildItem');
            expect(result.content[0].text).toBe('child-id');
        });

        it('returns isError when child element not found', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElementFromElement = vi.fn().mockRejectedValue(new Error('no such element'));
            registerFindTools(server, session);

            const result = await server.call('find_child_element', {
                parentElementId: 'p',
                strategy: 'accessibility id',
                selector: 'Missing',
            }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('wait_for_element', () => {
        it('returns elementId immediately when element is found on first try', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElement = vi.fn().mockResolvedValue({ [ELEMENT_KEY]: 'waited-el-id' });
            registerFindTools(server, session);

            const result = await server.call('wait_for_element', {
                strategy: 'accessibility id',
                selector: 'MyBtn',
                timeoutMs: 3000,
            }) as any;

            expect(mockBrowser.findElement).toHaveBeenCalledWith('accessibility id', 'MyBtn');
            expect(result.content[0].text).toBe('waited-el-id');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError after timeout when element never appears', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.findElement = vi.fn().mockRejectedValue(new Error('no such element'));
            registerFindTools(server, session);

            const result = await server.call('wait_for_element', {
                strategy: 'accessibility id',
                selector: 'NeverAppears',
                timeoutMs: 0,
                pollIntervalMs: 50,
            }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('NeverAppears');
        });

        it('retries until element appears', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            let attempts = 0;
            mockBrowser.findElement = vi.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) { return Promise.reject(new Error('no such element')); }
                return Promise.resolve({ [ELEMENT_KEY]: 'late-el-id' });
            });
            registerFindTools(server, session);

            const result = await server.call('wait_for_element', {
                strategy: 'accessibility id',
                selector: 'LateElement',
                timeoutMs: 5000,
                pollIntervalMs: 50,
            }) as any;

            expect(attempts).toBe(3);
            expect(result.content[0].text).toBe('late-el-id');
            expect(result.isError).toBeUndefined();
        });
    });
});
