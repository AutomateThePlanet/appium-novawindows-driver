import { describe, it, expect, vi } from 'vitest';
import { registerSessionTools } from '../../../lib/mcp/tools/session.js';
import { createMockServer } from '../fixtures/server.js';
import { createMockSession } from '../fixtures/session.js';

describe('session tools', () => {
    describe('create_session', () => {
        it('calls session.create() with params and returns success message', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            registerSessionTools(server, session);

            const result = await server.call('create_session', { app: 'notepad.exe' }) as any;

            expect(session.create).toHaveBeenCalledWith({ app: 'notepad.exe' });
            expect(result.content[0].text).toContain('notepad.exe');
            expect(result.isError).toBeUndefined();
        });

        it('returns isError on failure', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            vi.mocked(session.create).mockRejectedValue(new Error('Connection refused'));
            registerSessionTools(server, session);

            const result = await server.call('create_session', { app: 'notepad.exe' }) as any;

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Connection refused');
        });
    });

    describe('delete_session', () => {
        it('calls session.delete() when session is active', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            registerSessionTools(server, session);

            const result = await server.call('delete_session') as any;

            expect(session.isActive).toHaveBeenCalled();
            expect(session.delete).toHaveBeenCalled();
            expect(result.content[0].text).toContain('deleted');
            expect(result.isError).toBeUndefined();
        });

        it('returns no-op message when no session is active', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            vi.mocked(session.isActive).mockReturnValue(false);
            registerSessionTools(server, session);

            const result = await server.call('delete_session') as any;

            expect(session.delete).not.toHaveBeenCalled();
            expect(result.content[0].text).toContain('No active session');
        });
    });

    describe('get_session_status', () => {
        it('returns active message when session is active', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            registerSessionTools(server, session);

            const result = await server.call('get_session_status') as any;

            expect(result.content[0].text).toContain('active');
        });

        it('returns inactive message when no session', async () => {
            const server = createMockServer();
            const { session } = createMockSession();
            vi.mocked(session.isActive).mockReturnValue(false);
            registerSessionTools(server, session);

            const result = await server.call('get_session_status') as any;

            expect(result.content[0].text).toContain('No active session');
        });
    });
});
