import { describe, it, expect, vi } from 'vitest';
import { registerInspectTools } from '../../../lib/mcp/tools/inspect.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const ELEM_ID = 'el-inspect-1';

describe('inspect tools', () => {
    describe('get_element_info', () => {
        it('fetches UIA properties and returns structured JSON', async () => {
            const server = createMockServer();
            const { session, mockBrowser, mockElement } = createMockSession();
            mockElement.getAttribute = vi.fn()
                .mockResolvedValueOnce('OK')            // Name
                .mockResolvedValueOnce('OkButton')      // AutomationId
                .mockResolvedValueOnce('Button')        // ClassName
                .mockResolvedValueOnce('ControlType.Button') // ControlType
                .mockResolvedValueOnce('True');          // IsEnabled
            registerInspectTools(server, session);

            const result = await server.call('get_element_info', { elementId: ELEM_ID }) as any;

            expect(mockBrowser.$).toHaveBeenCalledWith({ [ELEMENT_KEY]: ELEM_ID });
            expect(mockElement.getAttribute).toHaveBeenCalledWith('Name');
            expect(mockElement.getAttribute).toHaveBeenCalledWith('AutomationId');
            expect(mockElement.getAttribute).toHaveBeenCalledWith('ClassName');
            expect(mockElement.getAttribute).toHaveBeenCalledWith('ControlType');
            expect(mockElement.getAttribute).toHaveBeenCalledWith('IsEnabled');

            const info = JSON.parse(result.content[0].text);
            expect(info.elementId).toBe(ELEM_ID);
            expect(info.name).toBe('OK');
            expect(info.automationId).toBe('OkButton');
            expect(info.className).toBe('Button');
            expect(info.controlType).toBe('ControlType.Button');
            expect(info.isEnabled).toBe('True');
            expect(Array.isArray(info.suggestedSelectors)).toBe(true);
            expect(result.isError).toBeUndefined();
        });

        it('includes accessibility id selector when AutomationId is present', async () => {
            const server = createMockServer();
            const { session, mockElement } = createMockSession();
            mockElement.getAttribute = vi.fn()
                .mockResolvedValueOnce('Submit')
                .mockResolvedValueOnce('SubmitBtn')
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce('ControlType.Button')
                .mockResolvedValueOnce('True');
            registerInspectTools(server, session);

            const result = await server.call('get_element_info', { elementId: ELEM_ID }) as any;
            const info = JSON.parse(result.content[0].text);

            const accessibilityIdSuggestion = info.suggestedSelectors.find(
                (s: any) => s.strategy === 'accessibility id'
            );
            expect(accessibilityIdSuggestion).toBeDefined();
            expect(accessibilityIdSuggestion.selector).toBe('SubmitBtn');
            expect(accessibilityIdSuggestion.reliability).toBe('high');
        });

        it('returns isError when driver throws', async () => {
            const server = createMockServer();
            const { session, mockBrowser } = createMockSession();
            mockBrowser.$ = vi.fn().mockRejectedValue(new Error('No such element'));
            registerInspectTools(server, session);

            const result = await server.call('get_element_info', { elementId: ELEM_ID }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('No such element');
        });
    });
});
