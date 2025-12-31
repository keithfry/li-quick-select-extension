import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Tests for Popup Page
 */

test.describe('Popup Page', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Inject Chrome API mocks
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          openOptionsPage: function() {
            // Mark that options page was opened
            window.__optionsPageOpened = true;
          }
        }
      };
    });

    // Load popup page
    const popupPath = `file://${path.join(__dirname, '../../popup.html')}`;
    await page.goto(popupPath);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('renders popup correctly', async () => {
    // Check header
    const header = page.locator('.header h1');
    await expect(header).toContainText('LinkedIn Job Quick Select');

    // Check description
    const description = page.locator('.description');
    await expect(description).toContainText('Quickly select job descriptions');

    // Check settings button
    const button = page.locator('#open-options');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Open Settings');
  });

  test('settings button is clickable', async () => {
    const button = page.locator('#open-options');

    // Button should be visible and enabled
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Should have hover styles
    await button.hover();

    // Should be clickable
    await button.click();
  });

  test('clicking settings button calls chrome.runtime.openOptionsPage()', async () => {
    const button = page.locator('#open-options');

    // Click the button
    await button.click();

    // Check that the mock was called
    const optionsPageOpened = await page.evaluate(() => window.__optionsPageOpened);
    expect(optionsPageOpened).toBe(true);
  });

  test('displays hint text', async () => {
    const hint = page.locator('.hint');
    await expect(hint).toContainText('Click settings to customize');
  });

  test('has correct layout and structure', async () => {
    // Should have header
    const header = page.locator('.header');
    await expect(header).toBeVisible();

    // Should have content section
    const content = page.locator('.content');
    await expect(content).toBeVisible();

    // Should have button container
    const button = page.locator('#open-options');
    await expect(button).toBeVisible();

    // Should have info section
    const info = page.locator('.info');
    await expect(info).toBeVisible();
  });
});
