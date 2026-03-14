import { describe, it, expect, vi } from 'vitest';
import { registerInteractTools } from '../../../lib/mcp/tools/interact.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const ELEM_ID = 'abc-123';

describe('interact tools', () => {
    describe('click_element', () => {
        it('calls driver.$({elementKey: id}).click() and returns "clicked"', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            registerInteractTools(server, session);

            const result = await server.call('click_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith({ [ELEMENT_KEY]: ELEM_ID });
            expect(mockElement.click).toHaveBeenCalled();
            expect(result.content[0].text).toBe('clicked');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError when click throws', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.click = vi.fn().mockRejectedValue(new Error('Element stale'));
            registerInteractTools(server, session);

            const result = await server.call('click_element', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Element stale');
        });
    });

    describe('set_value', () => {
        it('calls el.setValue() with the provided value', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            registerInteractTools(server, session);

            const result = await server.call('set_value', { elementId: ELEM_ID, value: 'hello world' }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith({ [ELEMENT_KEY]: ELEM_ID });
            expect(mockElement.setValue).toHaveBeenCalledWith('hello world');
            expect(result.content[0].text).toBe('value set');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.setValue = vi.fn().mockRejectedValue(new Error('setValue failed'));
            registerInteractTools(server, session);

            const result = await server.call('set_value', { elementId: ELEM_ID, value: 'x' }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('clear_element', () => {
        it('calls el.clearValue() and returns "cleared"', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            registerInteractTools(server, session);

            const result = await server.call('clear_element', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith({ [ELEMENT_KEY]: ELEM_ID });
            expect(mockElement.clearValue).toHaveBeenCalled();
            expect(result.content[0].text).toBe('cleared');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.clearValue = vi.fn().mockRejectedValue(new Error('clearValue failed'));
            registerInteractTools(server, session);

            const result = await server.call('clear_element', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_text', () => {
        it('calls el.getText() and returns the text', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.getText = vi.fn().mockResolvedValue('Hello World');
            registerInteractTools(server, session);

            const result = await server.call('get_text', { elementId: ELEM_ID }) as any;

            expect(mockElement.getText).toHaveBeenCalled();
            expect(result.content[0].text).toBe('Hello World');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.getText = vi.fn().mockRejectedValue(new Error('getText failed'));
            registerInteractTools(server, session);

            const result = await server.call('get_text', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });

    describe('get_attribute', () => {
        it('calls el.getAttribute() with the attribute name and returns the value', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.getAttribute = vi.fn().mockResolvedValue('MyButton');
            registerInteractTools(server, session);

            const result = await server.call('get_attribute', { elementId: ELEM_ID, attribute: 'Name' }) as any;

            expect(mockElement.getAttribute).toHaveBeenCalledWith('Name');
            expect(result.content[0].text).toBe('MyButton');
        });

        it('returns "null" string when attribute value is null', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.getAttribute = vi.fn().mockResolvedValue(null);
            registerInteractTools(server, session);

            const result = await server.call('get_attribute', { elementId: ELEM_ID, attribute: 'AutomationId' }) as any;

            expect(result.content[0].text).toBe('null');
        });
    });

    describe('is_element_displayed', () => {
        it('calls el.isDisplayed() and returns "true"', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.isDisplayed = vi.fn().mockResolvedValue(true);
            registerInteractTools(server, session);

            const result = await server.call('is_element_displayed', { elementId: ELEM_ID }) as any;

            expect(mockElement.isDisplayed).toHaveBeenCalled();
            expect(result.content[0].text).toBe('true');
        });

        it('returns "false" when not displayed', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.isDisplayed = vi.fn().mockResolvedValue(false);
            registerInteractTools(server, session);

            const result = await server.call('is_element_displayed', { elementId: ELEM_ID }) as any;

            expect(result.content[0].text).toBe('false');
        });
    });

    describe('is_element_enabled', () => {
        it('calls el.isEnabled() and returns "true"', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.isEnabled = vi.fn().mockResolvedValue(true);
            registerInteractTools(server, session);

            const result = await server.call('is_element_enabled', { elementId: ELEM_ID }) as any;

            expect(mockElement.isEnabled).toHaveBeenCalled();
            expect(result.content[0].text).toBe('true');
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.isEnabled = vi.fn().mockRejectedValue(new Error('isEnabled failed'));
            registerInteractTools(server, session);

            const result = await server.call('is_element_enabled', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
        });
    });
});
