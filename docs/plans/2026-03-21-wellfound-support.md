# Wellfound Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the extension to support the same select/open shortcuts on wellfound.com job pages.

**Architecture:** Add Wellfound to manifest.json matches, then refactor `content.js` to extract two shared helpers — `findJobTitleUrl()` and `selectWellfoundDescription()` — that branch on `isWellfound()`. All shortcut loading, keyboard listener registration, and messaging code is unchanged.

**Tech Stack:** Vanilla JS Chrome Extension (MV3), Playwright for tests.

---

## Wellfound URL / DOM Reference

Two page types:

**Type 1 — Search panel** (`wellfound.com/jobs?job_listing_slug=3991112-engineering-manager`):
- Description element: `#job-description`
- Job URL: constructed from `job_listing_slug` query param → `https://wellfound.com/jobs/3991112-engineering-manager`

**Type 2 — Dedicated page** (`wellfound.com/jobs/3991112-engineering-manager`):
- Description element: `[data-test="JobDetail"] [class*="styles_description__"]`
- Job URL: `window.location.href` (already on the page)

---

### Task 1: Update manifest.json

**Files:**
- Modify: `manifest.json`

**Step 1: Add wellfound.com to content_scripts matches**

Replace the single matches entry:
```json
"content_scripts": [
  {
    "matches": ["*://*.linkedin.com/*", "*://*.wellfound.com/*"],
    "js": ["storage.js", "content.js"],
    "run_at": "document_idle"
  }
]
```

**Step 2: Verify the file looks correct**

Run: `cat manifest.json`
Expected: both linkedin.com and wellfound.com in matches array.

**Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: add wellfound.com to content_scripts matches"
```

---

### Task 2: Add Wellfound fixture — dedicated job page

**Files:**
- Create: `tests/fixtures/wellfound-dedicated-job-page.html`

**Step 1: Create the fixture**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mock Wellfound Dedicated Job Page</title>
</head>
<body>
  <!-- Mimics wellfound.com/jobs/XXXX-slug — Type 2 view -->
  <div class="styles_component__isJPO" data-test="JobDetail">
    <div class="styles_component__4MnBs">
      <div class="styles_title__eBz1c">
        <div>
          <h1 class="styles-module_component__3ZI84 styles_header__ZlR7s text-4xl font-medium">
            Engineering Manager, Data/AI at Procurify
          </h1>
        </div>
      </div>
      <div class="styles_body__k1Fvd">
        <div class="styles_content__iLhPF">
          <div class="styles_description__36q7q">
            <h3><strong>Engineering Manager - Data &amp; AI</strong></h3>
            <p>About the role: lead our Data/AI team.</p>
            <ul>
              <li>Manage a team of engineers</li>
              <li>Drive technical direction</li>
            </ul>
            <p>Requirements: 6+ years experience.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Input elements for testing "ignore when typing" behavior -->
  <input type="text" id="search-input" placeholder="Type here..." />
  <textarea id="message-textarea" rows="4"></textarea>
  <div class="contenteditable-div" contenteditable="true">Editable</div>
</body>
</html>
```

**Step 2: Commit**

```bash
git add tests/fixtures/wellfound-dedicated-job-page.html
git commit -m "test: add wellfound dedicated job page fixture"
```

---

### Task 3: Add Wellfound fixture — search panel

**Files:**
- Create: `tests/fixtures/wellfound-search-panel.html`

**Step 1: Create the fixture**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mock Wellfound Search Panel</title>
</head>
<body>
  <!-- Mimics the embedded panel on wellfound.com/jobs?job_listing_slug=XXXX-slug — Type 1 view -->
  <div class="mt-6 rounded-xl border border-gray-400 px-6 py-6">
    <h2 class="mb-2 text-2xl font-semibold">About the job</h2>
    <div class="relative">
      <div class="styles_description__xjvTf inline-block text-black" id="job-description">
        <h3><strong>Engineering Manager - Data &amp; AI</strong></h3>
        <p>About the role: lead our Data/AI team.</p>
        <ul>
          <li>Manage a team of engineers</li>
          <li>Drive technical direction</li>
        </ul>
        <p>Requirements: 6+ years experience.</p>
      </div>
    </div>
  </div>

  <!-- Input elements for testing "ignore when typing" behavior -->
  <input type="text" id="search-input" placeholder="Type here..." />
  <textarea id="message-textarea" rows="4"></textarea>
  <div class="contenteditable-div" contenteditable="true">Editable</div>
</body>
</html>
```

**Step 2: Commit**

```bash
git add tests/fixtures/wellfound-search-panel.html
git commit -m "test: add wellfound search panel fixture"
```

---

### Task 4: Write failing integration tests for Wellfound dedicated page

**Files:**
- Create: `tests/integration/wellfound-content.spec.js`

**Step 1: Write the tests**

```js
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: load a fixture page with Chrome mocks + content script injected
async function loadFixture(browser, fixtureName, url = 'https://wellfound.com/jobs/3991112-engineering-manager') {
  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, `../fixtures/${fixtureName}`);
  const html = fs.readFileSync(htmlPath, 'utf-8');

  await page.addInitScript((mockUrl) => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: new URL(mockUrl),
      writable: true
    });

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
  }, url);

  await page.setContent(html);

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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/integration/wellfound-content.spec.js`
Expected: FAIL — `isWellfound()` not defined yet, or selectors not working.

**Step 3: Commit the failing tests**

```bash
git add tests/integration/wellfound-content.spec.js
git commit -m "test: add failing wellfound integration tests"
```

---

### Task 5: Add site detection helpers to content.js

**Files:**
- Modify: `content.js` (add after line 16, after `isJobPage()`)

**Step 1: Add the helpers**

Insert after the closing brace of `isJobPage()` (after line 16):

```js
// Check if we're on Wellfound
function isWellfound() {
  return window.location.hostname.includes('wellfound.com');
}

// Check if we're on a Wellfound dedicated job page (e.g. /jobs/3991112-slug)
function isWellfoundDedicatedPage() {
  return isWellfound() && /\/jobs\/\d+/.test(window.location.pathname);
}
```

**Step 2: Update `isJobPage()` to include Wellfound**

Replace the existing `isJobPage()` function:

```js
function isJobPage() {
  const url = window.location.href;
  if (url.includes('wellfound.com')) {
    return url.includes('/jobs');
  }
  return url.includes('/jobs/') || url.includes('/jobs?') || url.includes('/jobs#') || url.match(/\/jobs$/);
}
```

**Step 3: Run existing LinkedIn tests to make sure nothing broke**

Run: `npm test -- tests/integration/content.spec.js`
Expected: all PASS.

---

### Task 6: Add `findJobTitleUrl()` and refactor open functions

**Files:**
- Modify: `content.js`

**Step 1: Add `findJobTitleUrl()` above `openJobTitleLink()`**

Insert before `openJobTitleLink()`:

```js
// Returns the URL to open for the job title link (site-agnostic)
function findJobTitleUrl() {
  if (isWellfound()) {
    // Dedicated page: already on the job page
    if (isWellfoundDedicatedPage()) {
      return window.location.href;
    }
    // Search panel: construct URL from job_listing_slug query param
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('job_listing_slug');
    if (slug) {
      return `https://wellfound.com/jobs/${slug}`;
    }
    debugLog('warn', 'Could not determine Wellfound job URL from query params');
    return null;
  }

  // LinkedIn selectors
  const selectors = [
    '.job-details-jobs-unified-top-card__job-title h1 a[href*="/jobs/view/"]',
    '.jobs-unified-top-card__job-title h1 a[href*="/jobs/view/"]',
    '.job-details-jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
    '.jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
    'a[data-tracking-control-name="public_jobs_topcard-title"]',
  ];
  for (const selector of selectors) {
    const link = document.querySelector(selector);
    if (link?.href) return link.href;
  }
  const fallback = document.querySelector('a[href*="/jobs/view/"]');
  return fallback?.href || null;
}
```

**Step 2: Replace `openJobTitleLink()` to use `findJobTitleUrl()`**

Replace the entire `openJobTitleLink()` function:

```js
function openJobTitleLink() {
  try {
    const url = findJobTitleUrl();
    if (!url) {
      debugLog('warn', 'Could not find job title URL');
      return;
    }
    debugLog('log', 'Requesting background to open title link', url);
    chrome.runtime.sendMessage({ action: 'openWindow', url, target: currentOpenTarget });
  } catch (error) {
    debugLog('error', 'Error opening job title link', error);
  }
}
```

**Step 3: Replace `openAndSelectInNewWindow()` to use `findJobTitleUrl()`**

Replace the entire `openAndSelectInNewWindow()` function:

```js
function openAndSelectInNewWindow() {
  try {
    const url = findJobTitleUrl();
    if (!url) {
      debugLog('warn', 'Could not find job title URL for open-and-select');
      return;
    }
    debugLog('log', 'Requesting background to open and select', url);
    chrome.runtime.sendMessage({ action: 'openWindowAndSelect', url, target: currentOpenTarget });
  } catch (error) {
    debugLog('error', 'Error in openAndSelectInNewWindow', error);
  }
}
```

**Step 4: Run existing LinkedIn tests**

Run: `npm test -- tests/integration/content.spec.js`
Expected: all PASS.

**Step 5: Commit**

```bash
git add content.js
git commit -m "refactor: extract findJobTitleUrl() shared helper, add Wellfound open support"
```

---

### Task 7: Add Wellfound description selection to content.js

**Files:**
- Modify: `content.js`

**Step 1: Add `selectWellfoundDescription()` above `selectAboutTheJobSection()`**

Insert before `selectAboutTheJobSection()`:

```js
function selectWellfoundDescription() {
  try {
    // Type 2 (dedicated page): [data-test="JobDetail"] [class*="styles_description__"]
    // Type 1 (search panel): #job-description
    const el = document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]')
      || document.querySelector('#job-description');

    if (!el) {
      debugLog('warn', 'Could not find Wellfound job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Wellfound description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Wellfound description', error);
  }
}
```

**Step 2: Branch at the top of `selectAboutTheJobSection()`**

Add at the very start of the `selectAboutTheJobSection()` function body (after the opening `try {`):

```js
    if (isWellfound()) {
      selectWellfoundDescription();
      return;
    }
```

**Step 3: Update `waitForContentAndSelect()` to include Wellfound selectors**

In the `waitForContentAndSelect()` function, replace the `contentReady` assignment:

```js
    const contentReady = !!(
      document.querySelector('span[data-testid="expandable-text-box"]') ||
      document.querySelector('div.jobs-description__content') ||
      document.querySelector('div.jobs-description-content') ||
      document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]') ||
      document.querySelector('#job-description')
    );
```

**Step 4: Run all tests**

Run: `npm test`
Expected: all PASS including the new Wellfound tests.

**Step 5: Commit**

```bash
git add content.js
git commit -m "feat: add Wellfound job description selection"
```

---

### Task 8: Verify complete test suite passes

**Step 1: Run full test suite**

Run: `npm test`
Expected: all tests PASS — LinkedIn tests unchanged, Wellfound tests now passing.

**Step 2: Commit docs**

```bash
git add docs/
git commit -m "docs: add wellfound support implementation plan"
```
