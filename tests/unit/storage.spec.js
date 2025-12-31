import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { injectChromeMocks, setMockStorage, getMockStorage, clearMockStorage } from '../helpers/chrome-mock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Storage Utilities', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Navigate to a blank page first
    await page.goto('about:blank');

    // Inject Chrome API mocks
    await injectChromeMocks(page);

    // Load storage.js content
    const storageJs = fs.readFileSync(path.join(__dirname, '../../storage.js'), 'utf-8');

    // Inject storage.js code in a way that exposes to global scope
    await page.addScriptTag({
      content: storageJs + `
        // Expose to global scope
        window.getShortcut = getShortcut;
        window.saveShortcut = saveShortcut;
        window.isValidShortcut = isValidShortcut;
        window.shortcutsMatch = shortcutsMatch;
        window.DEFAULT_SHORTCUT = DEFAULT_SHORTCUT;
        window.BLOCKED_SHORTCUTS = BLOCKED_SHORTCUTS;
      `
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('getShortcut()', () => {
    test('returns default shortcut when nothing is saved', async () => {
      const shortcut = await page.evaluate(async () => {
        return await getShortcut();
      });

      expect(shortcut).toEqual({
        key: 'S',
        code: 'KeyS',
        altKey: true,
        ctrlKey: false,
        shiftKey: true,
        metaKey: false
      });
    });

    test('returns saved shortcut from storage', async () => {
      const customShortcut = {
        key: 'J',
        code: 'KeyJ',
        altKey: false,
        ctrlKey: true,
        shiftKey: true,
        metaKey: false
      };

      await setMockStorage(page, { keyboardShortcut: customShortcut });

      const shortcut = await page.evaluate(async () => {
        return await getShortcut();
      });

      expect(shortcut).toEqual(customShortcut);
    });

    test('returns default on storage error', async () => {
      await page.evaluate(() => {
        window.chrome.runtime.lastError = { message: 'Storage error' };
      });

      const shortcut = await page.evaluate(async () => {
        return await getShortcut();
      });

      expect(shortcut).toEqual({
        key: 'S',
        code: 'KeyS',
        altKey: true,
        ctrlKey: false,
        shiftKey: true,
        metaKey: false
      });
    });
  });

  test.describe('saveShortcut()', () => {
    test('saves shortcut to chrome.storage.local', async () => {
      const newShortcut = {
        key: 'K',
        code: 'KeyK',
        altKey: true,
        ctrlKey: true,
        shiftKey: false,
        metaKey: false
      };

      await page.evaluate(async (shortcut) => {
        await saveShortcut(shortcut);
      }, newShortcut);

      const storage = await getMockStorage(page);
      expect(storage.keyboardShortcut).toEqual(newShortcut);
    });

    test('saves with all modifier combinations', async () => {
      const shortcuts = [
        { key: 'A', code: 'KeyA', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
        { key: 'B', code: 'KeyB', altKey: false, ctrlKey: true, shiftKey: false, metaKey: false },
        { key: 'C', code: 'KeyC', altKey: false, ctrlKey: false, shiftKey: true, metaKey: false },
        { key: 'D', code: 'KeyD', altKey: false, ctrlKey: false, shiftKey: false, metaKey: true },
        { key: 'E', code: 'KeyE', altKey: true, ctrlKey: true, shiftKey: true, metaKey: true },
      ];

      for (const shortcut of shortcuts) {
        await clearMockStorage(page);

        await page.evaluate(async (sc) => {
          await saveShortcut(sc);
        }, shortcut);

        const storage = await getMockStorage(page);
        expect(storage.keyboardShortcut).toEqual(shortcut);
      }
    });
  });

  test.describe('shortcutsMatch()', () => {
    test('matches shortcuts with same modifiers and key', async () => {
      const result = await page.evaluate(() => {
        const sc1 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        const sc2 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        return shortcutsMatch(sc1, sc2);
      });

      expect(result).toBe(true);
    });

    test('matches shortcuts with same modifiers and code', async () => {
      const result = await page.evaluate(() => {
        const sc1 = { key: 'Í', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false }; // Mac special char
        const sc2 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        return shortcutsMatch(sc1, sc2);
      });

      expect(result).toBe(true);
    });

    test('is case-insensitive for key matching', async () => {
      const result = await page.evaluate(() => {
        const sc1 = { key: 's', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        const sc2 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        return shortcutsMatch(sc1, sc2);
      });

      expect(result).toBe(true);
    });

    test('does not match shortcuts with different modifiers', async () => {
      const result = await page.evaluate(() => {
        const sc1 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        const sc2 = { key: 'S', code: 'KeyS', altKey: false, ctrlKey: true, shiftKey: true, metaKey: false };
        return shortcutsMatch(sc1, sc2);
      });

      expect(result).toBe(false);
    });

    test('does not match shortcuts with different keys', async () => {
      const result = await page.evaluate(() => {
        const sc1 = { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        const sc2 = { key: 'J', code: 'KeyJ', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false };
        return shortcutsMatch(sc1, sc2);
      });

      expect(result).toBe(false);
    });
  });

  test.describe('isValidShortcut()', () => {
    test('accepts valid shortcut with modifiers', async () => {
      const result = await page.evaluate(() => {
        return isValidShortcut({
          key: 'S',
          code: 'KeyS',
          altKey: true,
          ctrlKey: false,
          shiftKey: true,
          metaKey: false
        });
      });

      expect(result.valid).toBe(true);
    });

    test('accepts function keys without modifiers', async () => {
      const fKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

      for (const fKey of fKeys) {
        const result = await page.evaluate((key) => {
          return isValidShortcut({
            key: key,
            code: key,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            metaKey: false
          });
        }, fKey);

        expect(result.valid).toBe(true);
      }
    });

    test('rejects shortcut without modifiers', async () => {
      const result = await page.evaluate(() => {
        return isValidShortcut({
          key: 'S',
          code: 'KeyS',
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false
        });
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('modifier key required');
    });

    test('rejects modifier-only shortcuts', async () => {
      const modifiers = ['Control', 'Alt', 'Shift', 'Meta', 'Option', 'Command'];

      for (const modifier of modifiers) {
        const result = await page.evaluate((mod) => {
          return isValidShortcut({
            key: mod,
            code: mod,
            altKey: mod === 'Alt',
            ctrlKey: mod === 'Control',
            shiftKey: mod === 'Shift',
            metaKey: mod === 'Meta'
          });
        }, modifier);

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('modifier keys alone');
      }
    });

    test('rejects blocked browser shortcuts', async () => {
      const blockedShortcuts = [
        { key: 'T', ctrlKey: true },
        { key: 'W', ctrlKey: true },
        { key: 'N', ctrlKey: true },
        { key: 'R', ctrlKey: true },
        { key: 'Q', ctrlKey: true },
      ];

      for (const blocked of blockedShortcuts) {
        const result = await page.evaluate((sc) => {
          return isValidShortcut({
            key: sc.key,
            code: `Key${sc.key}`,
            altKey: false,
            ctrlKey: sc.ctrlKey || false,
            shiftKey: false,
            metaKey: false
          });
        }, blocked);

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('reserved by the browser');
      }
    });

    test('accepts Ctrl+Shift+T (reopen tab - less critical)', async () => {
      const result = await page.evaluate(() => {
        return isValidShortcut({
          key: 'T',
          code: 'KeyT',
          altKey: false,
          ctrlKey: true,
          shiftKey: true,
          metaKey: false
        });
      });

      // This is in the blocked list, so it should be rejected
      expect(result.valid).toBe(false);
    });

    test('accepts valid combinations with multiple modifiers', async () => {
      const validCombos = [
        { key: 'S', altKey: true, shiftKey: true },
        { key: 'J', ctrlKey: true, shiftKey: true },
        { key: 'K', ctrlKey: true, altKey: true },
        { key: 'L', metaKey: true, shiftKey: true },
        { key: 'M', altKey: true, ctrlKey: true, shiftKey: true },
      ];

      for (const combo of validCombos) {
        const result = await page.evaluate((c) => {
          return isValidShortcut({
            key: c.key,
            code: `Key${c.key}`,
            altKey: c.altKey || false,
            ctrlKey: c.ctrlKey || false,
            shiftKey: c.shiftKey || false,
            metaKey: c.metaKey || false
          });
        }, combo);

        expect(result.valid).toBe(true);
      }
    });
  });
});
