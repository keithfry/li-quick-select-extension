import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Context Menu Action Dispatch', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/indeed-job-dedicated-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Intercept the Indeed URL and serve our fixture HTML
    await page.route('https://www.indeed.com/**', route => {
      route.fulfill({ body: html, contentType: 'text/html' });
    });

    // Inject chrome mock before navigation; capture onMessage listeners
    // and outbound sendMessage calls for assertions
    await page.addInitScript(() => {
      window.__messageListeners = [];
      window.__sentMessages = [];
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
        runtime: {
          onMessage: {
            addListener: (fn) => window.__messageListeners.push(fn)
          },
          sendMessage: (msg) => { window.__sentMessages.push(msg); }
        }
      };
    });

    await page.goto('https://www.indeed.com/viewjob?jk=abc123test');

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // Simulates background.js delivering a context-menu message
  async function dispatch(name) {
    await page.evaluate((actionName) => {
      window.__messageListeners.forEach((fn) =>
        fn({ action: 'runContextMenuAction', name: actionName })
      );
    }, name);
    await page.waitForTimeout(100);
  }

  test('selectDescription action selects the job description', async () => {
    await dispatch('selectDescription');

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toContain('About the Role');
  });

  test('openTitle action messages background to open the job URL', async () => {
    await dispatch('openTitle');

    const sent = await page.evaluate(() => window.__sentMessages);
    const openMsg = sent.find((m) => m.action === 'openWindow');
    expect(openMsg).toBeTruthy();
    expect(openMsg.url).toBe('https://www.indeed.com/viewjob?jk=abc123test');
  });

  test('openTitleAndSelect action messages background to open and select', async () => {
    await dispatch('openTitleAndSelect');

    const sent = await page.evaluate(() => window.__sentMessages);
    const openMsg = sent.find((m) => m.action === 'openWindowAndSelect');
    expect(openMsg).toBeTruthy();
    expect(openMsg.url).toBe('https://www.indeed.com/viewjob?jk=abc123test');
  });

  test('unknown action name is a silent no-op', async () => {
    await dispatch('bogusAction');

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
    const sent = await page.evaluate(() => window.__sentMessages);
    expect(sent.filter((m) => m.action === 'openWindow')).toHaveLength(0);
    expect(sent.filter((m) => m.action === 'openWindowAndSelect')).toHaveLength(0);
  });
});
