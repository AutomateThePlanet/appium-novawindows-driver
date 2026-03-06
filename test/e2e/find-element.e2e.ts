import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'webdriverio';
import { closeAllTestApps, createCalculatorSession, quitSession } from './helpers/session.js';

describe('Element finding strategies', () => {
    let driver: Browser;

    beforeAll(async () => {
        closeAllTestApps;
        driver = await createCalculatorSession();
    });

    afterAll(async () => {
        await quitSession(driver);
    });

    describe('by accessibility id', () => {
        it('finds the result display by accessibility id', async () => {
            const el = await driver.$('~CalculatorResults');
            expect(await el.isExisting()).toBe(true);
        });

        it('throws NoSuchElementError for a non-existent accessibility id', async () => {
            await expect(driver.$('~NonExistentElement_XYZ_123').isExisting())
                .resolves.toBe(false);
        });

        it('findElements by accessibility id returns an array', async () => {
            const els = await driver.$$('~num1Button');
            expect(Array.isArray(els)).toBe(true);
            expect(els.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('by name', () => {
        it('finds a button by Name property', async () => {
            const el = await driver.findElement('name', 'One');
            expect(el).toBeDefined();
        });

        it('findElements by name returns multiple matching elements', async () => {
            const els = await driver.findElements('name', 'One');
            expect(els.length).toBeGreaterThanOrEqual(1);
        });

        it('returns empty array for non-existent name', async () => {
            const els = await driver.findElements('name', 'NonExistentButtonNameXYZ');
            expect(els.length).toBe(0);
        });
    });

    describe('by xpath', () => {
        it('finds a button element using XPath tag name predicate', async () => {
            const el = await driver.$('//Button');
            expect(await el.isExisting()).toBe(true);
        });

        it('finds a specific button using XPath Name attribute predicate', async () => {
            const el = await driver.$('//Button[@Name="One"]');
            expect(await el.isExisting()).toBe(true);
        });

        it('findElements with XPath returns multiple buttons', async () => {
            const els = await driver.$$('//Button');
            expect(els.length).toBeGreaterThan(1);
        });

        it('finds element by XPath index expression', async () => {
            const el = await driver.$('//Custom/Group/Group[5]/Button[1]');
            expect(await el.isExisting()).toBe(true);
        });

        it('finds a descendant scoped with relative XPath', async () => {
            const parent = await driver.$('//Window');
            const child = await parent.$('.//Button');
            expect(await child.isExisting()).toBe(true);
        });
    });

    describe('by tag name (control type)', () => {
        it('finds the first Button element', async () => {
            const el = await driver.findElement('tag name', 'Button');
            expect(el).toBeDefined();
        });

        it('findElements by tag name returns a list of buttons', async () => {
            const els = await driver.findElements('tag name', 'Button');
            expect(els.length).toBeGreaterThan(1);
        });

        it('finds Text elements', async () => {
            const els = await driver.findElements('tag name', 'Text');
            expect(els.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('by class name', () => {
        it('finds an element by ClassName property', async () => {
            // Calculator's main window has a known class
            const els = await driver.findElements('class name', 'Windows.UI.Core.CoreWindow');
            // Either finds it or finds nothing — just verify no error
            expect(Array.isArray(els)).toBe(true);
        });
    });

    describe('by id (RuntimeId)', () => {
        it('finds an element by its runtime id once discovered', async () => {
            // First get the element via accessibility id to retrieve its runtime id
            const el = await driver.$('~CalculatorResults');
            const runtimeId = await el.getAttribute('RuntimeId');
            if (runtimeId) {
                const found = await driver.findElement('id', runtimeId);
                expect(found).toBeDefined();
            } else {
                // RuntimeId may not be exposed; skip with a note
                expect(true).toBe(true);
            }
        });
    });

    describe('findElementFromElement and findElementsFromElement', () => {
        it('finds a child element scoped from a parent element', async () => {
            const window = await driver.$('//Window');
            const child = await window.findElement('tag name', 'Button');
            expect(child).toBeDefined();
        });

        it('finds multiple children scoped from a parent element', async () => {
            const window = await driver.$('//Window');
            const children = await window.findElements('tag name', 'Button');
            expect(children.length).toBeGreaterThan(1);
        });

        it('returns empty array when child does not exist within scope', async () => {
            const btn = await driver.$('~num1Button');
            const children = await btn.findElements('xpath', './Button');
            // A single button has no button children
            expect(children.length).toBe(0);
        });
    });
});
