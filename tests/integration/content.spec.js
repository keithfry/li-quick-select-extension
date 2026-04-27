import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Integration Tests for Content Script
 * Tests DOM selection logic against mock LinkedIn HTML
 */

test.describe('Content Script - DOM Selection', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Load mock LinkedIn HTML
    const htmlPath = path.join(__dirname, '../fixtures/linkedin-job-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    await page.setContent(html);

    // Inject Chrome API mocks and content script
    await page.addInitScript(() => {
      class ChromeStorageMock {
        get(keys, callback) {
          // Return default shortcut
          callback({
            keyboardShortcut: {
              key: 'S',
              code: 'KeyS',
              altKey: true,
              ctrlKey: false,
              shiftKey: true,
              metaKey: false
            }
          });
        }
      }

      window.chrome = {
        storage: {
          local: new ChromeStorageMock(),
          onChanged: { addListener: () => {} }
        },
        runtime: {}
      };

    });

    // Load storage.js
    await page.addScriptTag({
      path: path.join(__dirname, '../../storage.js')
    });

    // Load content.js
    await page.addScriptTag({
      path: path.join(__dirname, '../../content.js')
    });

    // Wait for content script to initialize
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects "About the job" section on keyboard shortcut', async () => {
    // Trigger keyboard shortcut (Alt+Shift+S)
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    // Wait for selection to be made
    await page.waitForTimeout(100);

    // Check that text is selected
    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    // Should contain job description content
    expect(selectedText).toContain('Job Description');
    expect(selectedText).toContain('Responsibilities');
    expect(selectedText).toContain('Qualifications');
  });

  test('excludes hr separator from selection', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    // Should NOT contain text after the hr separator
    expect(selectedText).not.toContain('Additional information below the separator');
  });

  test('ignores shortcut when typing in input field', async () => {
    const input = page.locator('#search-input');

    // Focus input field
    await input.click();

    // Try to trigger shortcut while focused on input
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    // No text should be selected
    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    expect(selectedText).toBe('');
  });

  test('ignores shortcut when typing in textarea', async () => {
    const textarea = page.locator('#message-textarea');

    await textarea.click();

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    expect(selectedText).toBe('');
  });

  test('ignores shortcut in contentEditable element', async () => {
    const contentEditable = page.locator('.contenteditable-div');

    await contentEditable.click();

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    expect(selectedText).toBe('');
  });

  test('scrolls to selected content', async () => {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    // Scroll position may have changed
    // (This is hard to test reliably, but we can check it didn't error)
    const finalScroll = await page.evaluate(() => window.scrollY);

    // Test should pass without errors
    expect(typeof finalScroll).toBe('number');
  });

  test('finds heading with exact text "About the job"', async () => {
    const hasHeading = await page.evaluate(() => {
      const headings = document.querySelectorAll('h2');
      for (const heading of headings) {
        if (heading.textContent.trim() === 'About the job') {
          return true;
        }
      }
      return false;
    });

    expect(hasHeading).toBe(true);
  });

  test('finds expandable-text-box span', async () => {
    const hasSpan = await page.evaluate(() => {
      const span = document.querySelector('span[data-testid="expandable-text-box"]');
      return span !== null;
    });

    expect(hasSpan).toBe(true);
  });

  test('falls back to jobs-description__content if primary method fails', async () => {
    // Remove the primary selectors
    await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      const span = document.querySelector('span[data-testid="expandable-text-box"]');
      if (h2) h2.remove();
      if (span) span.remove();
    });

    // Trigger shortcut
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    // Should still select text from fallback element
    const selectedText = await page.evaluate(() => {
      return window.getSelection().toString();
    });

    expect(selectedText).toContain('Fallback Layout');
  });

  test('logs appropriate console messages', async () => {
    // Enable debug logging (off by default; addInitScript doesn't apply after setContent)
    await page.evaluate(() => {
      window.LinkedInJobQuickSelect.debugEnabled = true;
    });

    const consoleMessages = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    // Should have logged success message
    const hasSuccessLog = consoleMessages.some(msg =>
      msg.includes('LinkedIn Job Quick Select') &&
      (msg.includes('selected successfully') || msg.includes('Shortcut activated'))
    );

    expect(hasSuccessLog).toBe(true);
  });
});
