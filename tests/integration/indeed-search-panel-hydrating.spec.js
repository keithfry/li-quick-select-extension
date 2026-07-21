import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Indeed Search Panel - async content hydration race', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/indeed-job-search-panel-hydrating.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    await page.route('https://www.indeed.com/**', route => {
      route.fulfill({ body: html, contentType: 'text/html' });
    });

    await page.addInitScript(() => {
      window.chrome = {
        storage: {
          local: {
            get(keys, callback) {
              callback({
                keyboardShortcut: {
                  key: 'S', code: 'KeyS',
                  altKey: true, ctrlKey: false, shiftKey: true, metaKey: false
                }
              });
            }
          },
          onChanged: { addListener: () => {} }
        },
        runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {} }
      };
    });

    await page.goto('https://www.indeed.com/?vjk=abc123test');

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    // Fire the shortcut immediately, before the fixture's 400ms hydration
    // timeout populates #jobDescriptionText — this is the race being tested.
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects job description once it hydrates, even if shortcut fires early', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    // Give the retry loop time to catch the post-hydration content.
    await page.waitForTimeout(1500);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).toContain('About the Role');
    expect(selectedText).toContain('Responsibilities');
  });
});
