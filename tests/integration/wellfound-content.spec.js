import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: load a fixture page with Chrome mocks + content script injected
async function loadFixture(browser, fixtureName, url) {
  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, `../fixtures/${fixtureName}`);
  const html = fs.readFileSync(htmlPath, 'utf-8');

  await page.addInitScript(() => {
    class ChromeStorageMock {
      get(keys, callback) {
        callback({
          keyboardShortcut: { key: 'S', code: 'KeyS', altKey: true, ctrlKey: false, shiftKey: true, metaKey: false }
        });
      }
    }

    window.chrome = {
      storage: {
        local: new ChromeStorageMock(),
        onChanged: { addListener: () => {} }
      },
      runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {} }
    };
  });

  // Route the wellfound URL to serve our fixture HTML
  await page.route(url, route => {
    route.fulfill({ body: html, contentType: 'text/html' });
  });

  // Navigate to the actual URL so window.location.hostname is correct
  await page.goto(url);

  await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
  await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
  await page.waitForTimeout(500);

  return page;
}

test.describe('Wellfound - Dedicated Job Page (Type 2)', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await loadFixture(browser, 'wellfound-dedicated-job-page.html',
      'https://wellfound.com/jobs/3991112-engineering-manager');
  });

  test.afterEach(async () => { await page.close(); });

  test('selects job description on Alt+Shift+S', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toContain('Engineering Manager');
    expect(selectedText).toContain('lead our Data/AI team');
  });

  test('ignores shortcut when typing in input', async () => {
    await page.locator('#search-input').click();

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
  });
});

test.describe('Wellfound - Search Panel (Type 1)', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await loadFixture(browser, 'wellfound-search-panel.html',
      'https://wellfound.com/jobs?job_listing_slug=3991112-engineering-manager');
  });

  test.afterEach(async () => { await page.close(); });

  test('selects #job-description on Alt+Shift+S', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toContain('Engineering Manager');
    expect(selectedText).toContain('lead our Data/AI team');
  });

  test('ignores shortcut when typing in input', async () => {
    await page.locator('#search-input').click();

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
  });
});
