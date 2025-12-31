import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Tests for Options Page
 *
 * Note: These tests require the extension to be loaded in Chromium.
 * For now, they test the standalone HTML page with mocked Chrome APIs.
 * To run with actual extension, see extension-loader helper.
 */

test.describe('Options Page - Standalone', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Inject Chrome API mocks
    await page.addInitScript(() => {
      class ChromeStorageMock {
        constructor() {
          this.data = {};
          this.listeners = [];
        }

        get(keys, callback) {
          const result = {};
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => {
            if (this.data[key]) result[key] = this.data[key];
          });
          if (callback) setTimeout(() => callback(result), 0);
        }

        set(items, callback) {
          Object.assign(this.data, items);
          const changes = {};
          Object.keys(items).forEach(key => {
            changes[key] = { newValue: items[key] };
          });
          this.listeners.forEach(listener => listener(changes, 'local'));
          if (callback) setTimeout(callback, 0);
        }

        onChanged = {
          addListener: (listener) => this.listeners.push(listener)
        };
      }

      const storageMock = new ChromeStorageMock();
      window.chrome = {
        storage: {
          local: storageMock,
          onChanged: storageMock.onChanged
        },
        runtime: {}
      };
    });

    // Load options page
    const optionsPath = `file://${path.join(__dirname, '../../options.html')}`;
    await page.goto(optionsPath);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('loads and displays default shortcut', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');

    // Should show either Mac symbols or Windows text
    const value = await shortcutDisplay.inputValue();

    // Accept either ⌥⇧S (Mac) or Alt+Shift+S (Windows)
    expect(value).toMatch(/[⌥⇧S]|Alt\+Shift\+S/);
  });

  test('enters recording mode when shortcut field is clicked', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');

    await shortcutDisplay.click();

    // Should have "recording" class
    await expect(shortcutDisplay).toHaveClass(/recording/);

    // Hint text should update
    const hintText = page.locator('#hint-text');
    await expect(hintText).toContainText(/Press your desired/i);
  });

  test('captures and saves valid keyboard shortcut', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');
    const statusMessage = page.locator('#status-message');

    // Click to start recording
    await shortcutDisplay.click();

    // Press Ctrl+Shift+J
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('J');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');

    // Should show success message
    await expect(statusMessage).toContainText(/saved successfully/i);
    await expect(statusMessage).toHaveClass(/success/);

    // Should update display
    const value = await shortcutDisplay.inputValue();
    expect(value).toContain('J');
  });

  test('shows validation error for modifier-only shortcut', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');
    const statusMessage = page.locator('#status-message');

    await shortcutDisplay.click();

    // Try to press just Shift (modifier only)
    // Note: This is tricky in Playwright, we'll simulate it
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'A', // Press A without modifiers
        code: 'KeyA',
        bubbles: true
      });
      document.getElementById('shortcut-display').dispatchEvent(event);
    });

    // Should show error for no modifiers
    await expect(statusMessage).toContainText(/modifier key required/i);
    await expect(statusMessage).toHaveClass(/error/);
  });

  test('shows validation error for blocked shortcut Ctrl+T', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');
    const statusMessage = page.locator('#status-message');

    await shortcutDisplay.click();

    // Press Ctrl+T (blocked)
    await page.keyboard.down('Control');
    await page.keyboard.press('T');
    await page.keyboard.up('Control');

    // Should show error
    await expect(statusMessage).toContainText(/reserved by the browser/i);
    await expect(statusMessage).toHaveClass(/error/);
  });

  test('cancels recording on Escape key', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');

    await shortcutDisplay.click();

    // Should be in recording mode
    await expect(shortcutDisplay).toHaveClass(/recording/);

    // Press Escape
    await page.keyboard.press('Escape');

    // Should exit recording mode
    await expect(shortcutDisplay).not.toHaveClass(/recording/);
  });

  test('reset button restores default shortcut', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');
    const clearBtn = page.locator('#clear-btn');
    const statusMessage = page.locator('#status-message');

    // First, set a custom shortcut
    await shortcutDisplay.click();
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('J');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');

    // Wait for success message
    await expect(statusMessage).toContainText(/saved successfully/i);

    // Verify it changed
    await expect(shortcutDisplay).toHaveValue(/J/);

    // Click reset button
    await clearBtn.click();

    // Should show reset message
    await expect(statusMessage).toContainText(/Reset to default/i);

    // Should restore default
    await expect(shortcutDisplay).toHaveValue(/[⌥⇧S]|Alt\+Shift\+S/);
  });

  test('displays platform-specific modifier keys', async () => {
    const modifierDisplay = page.locator('#modifier-display');

    // Should have modifier key elements
    const modifiers = modifierDisplay.locator('.modifier-key');
    const count = await modifiers.count();

    // Should have 4 modifiers displayed
    expect(count).toBe(4);

    // Check that text contains expected modifiers
    const text = await modifierDisplay.textContent();

    // Should contain at least "Shift" on all platforms
    expect(text).toMatch(/Shift/i);
  });

  test('handles Option+Shift+key on Mac (extracts actual letter)', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');

    await shortcutDisplay.click();

    // Simulate Option+Shift+S which produces special character on Mac
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Í', // Mac special character
        code: 'KeyS', // But code is KeyS
        altKey: true,
        shiftKey: true,
        bubbles: true
      });
      document.getElementById('shortcut-display').dispatchEvent(event);
    });

    // Should extract 'S' from code and display correctly
    const value = await shortcutDisplay.inputValue();
    expect(value).toContain('S');
    expect(value).not.toContain('Í');
  });

  test('status message disappears after timeout', async () => {
    const shortcutDisplay = page.locator('#shortcut-display');
    const statusMessage = page.locator('#status-message');

    // Trigger a save
    await shortcutDisplay.click();
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('K');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');

    // Should be visible
    await expect(statusMessage).toHaveClass(/show/);

    // Wait for timeout (3 seconds + buffer)
    await page.waitForTimeout(3500);

    // Should be hidden
    await expect(statusMessage).not.toHaveClass(/show/);
  });
});
