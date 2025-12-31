import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { injectChromeMocks } from '../helpers/chrome-mock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Keyboard Shortcut Validation', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await injectChromeMocks(page);
    await page.addScriptTag({
      path: path.join(__dirname, '../../storage.js')
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Valid Shortcuts', () => {
    test('Alt+Shift+S (default)', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false
      }));
      expect(result.valid).toBe(true);
    });

    test('Ctrl+Shift+J', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'J', code: 'KeyJ', altKey: false, ctrlKey: true, shiftKey: true, metaKey: false
      }));
      expect(result.valid).toBe(true);
    });

    test('Cmd+Shift+K (Mac)', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'K', code: 'KeyK', altKey: false, ctrlKey: false, shiftKey: true, metaKey: true
      }));
      expect(result.valid).toBe(true);
    });

    test('Function keys without modifiers', async () => {
      for (let i = 1; i <= 12; i++) {
        const result = await page.evaluate((num) => isValidShortcut({
          key: `F${num}`, code: `F${num}`, altKey: false, ctrlKey: false, shiftKey: false, metaKey: false
        }), i);
        expect(result.valid).toBe(true);
      }
    });

    test('Arrow keys with modifiers', async () => {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      for (const arrow of arrows) {
        const result = await page.evaluate((key) => isValidShortcut({
          key, code: key, altKey: true, ctrlKey: false, shiftKey: false, metaKey: false
        }), arrow);
        expect(result.valid).toBe(true);
      }
    });
  });

  test.describe('Invalid Shortcuts', () => {
    test('Single key without modifiers', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'S', code: 'KeyS', altKey: false, ctrlKey: false, shiftKey: false, metaKey: false
      }));
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/modifier key required/i);
    });

    test('Modifier keys alone', async () => {
      const modifiers = ['Control', 'Alt', 'Shift', 'Meta'];
      for (const mod of modifiers) {
        const result = await page.evaluate((modifier) => isValidShortcut({
          key: modifier, code: modifier, altKey: false, ctrlKey: false, shiftKey: false, metaKey: false
        }), mod);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/modifier keys alone/i);
      }
    });

    test('Reserved browser shortcuts - Ctrl+T (new tab)', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'T', code: 'KeyT', altKey: false, ctrlKey: true, shiftKey: false, metaKey: false
      }));
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/reserved by the browser/i);
    });

    test('Reserved browser shortcuts - Ctrl+W (close tab)', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'W', code: 'KeyW', altKey: false, ctrlKey: true, shiftKey: false, metaKey: false
      }));
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/reserved by the browser/i);
    });

    test('Reserved browser shortcuts - Ctrl+N (new window)', async () => {
      const result = await page.evaluate(() => isValidShortcut({
        key: 'N', code: 'KeyN', altKey: false, ctrlKey: true, shiftKey: false, metaKey: false
      }));
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/reserved by the browser/i);
    });
  });

  test.describe('Edge Cases', () => {
    test('Case-insensitive validation', async () => {
      const upper = await page.evaluate(() => isValidShortcut({
        key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false
      }));
      const lower = await page.evaluate(() => isValidShortcut({
        key: 's', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false
      }));
      expect(upper.valid).toBe(lower.valid);
    });

    test('Digit keys with modifiers', async () => {
      for (let i = 0; i <= 9; i++) {
        const result = await page.evaluate((num) => isValidShortcut({
          key: String(num), code: `Digit${num}`, altKey: true, ctrlKey: false, shiftKey: false, metaKey: false
        }), i);
        expect(result.valid).toBe(true);
      }
    });

    test('Special keys with modifiers', async () => {
      const special = ['Space', 'Enter', 'Escape', 'Tab', 'Backspace'];
      for (const key of special) {
        const result = await page.evaluate((k) => isValidShortcut({
          key: k, code: k, altKey: true, ctrlKey: false, shiftKey: false, metaKey: false
        }), key);
        expect(result.valid).toBe(true);
      }
    });
  });
});
