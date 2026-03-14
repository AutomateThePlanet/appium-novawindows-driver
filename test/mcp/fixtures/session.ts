import { vi } from 'vitest';
import type { AppiumSession } from '../../../lib/mcp/session.js';

export function createMockChildElement() {
    return {
        elementId: 'child-element-id',
        isExisting: vi.fn().mockResolvedValue(true),
    };
}

export function createMockElement() {
    const child = createMockChildElement();
    return {
        elementId: 'mock-element-id',
        click: vi.fn().mockResolvedValue(undefined),
        setValue: vi.fn().mockResolvedValue(undefined),
        clearValue: vi.fn().mockResolvedValue(undefined),
        getText: vi.fn().mockResolvedValue('mock text'),
        getAttribute: vi.fn().mockResolvedValue('mock-value'),
        isDisplayed: vi.fn().mockResolvedValue(true),
        isEnabled: vi.fn().mockResolvedValue(true),
        isExisting: vi.fn().mockResolvedValue(true),
        $: vi.fn().mockResolvedValue(child),
        _child: child,
    };
}

export function createMockBrowser() {
    const el = createMockElement();
    const browser = {
        $: vi.fn().mockResolvedValue(el),
        $$: vi.fn().mockResolvedValue([el]),
        executeScript: vi.fn().mockResolvedValue(undefined),
        takeScreenshot: vi.fn().mockResolvedValue('base64screenshot'),
        getPageSource: vi.fn().mockResolvedValue('<xml><root/></xml>'),
        getWindowRect: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 1024, height: 768 }),
        getWindowHandles: vi.fn().mockResolvedValue(['handle-1', 'handle-2']),
        switchToWindow: vi.fn().mockResolvedValue(undefined),
        _element: el,
    };
    return browser;
}

export function createMockSession() {
    const mockBrowser = createMockBrowser();
    const session = {
        getDriver: vi.fn().mockReturnValue(mockBrowser),
        isActive: vi.fn().mockReturnValue(true),
        create: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as AppiumSession;
    return { session, mockBrowser, mockElement: mockBrowser._element };
}
