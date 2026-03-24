# Indeed Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Indeed.com support for all three keyboard shortcuts (select, open, combined) to the LinkedIn Job Quick Select extension.

**Architecture:** Mirror the existing Wellfound pattern — add `isIndeed()` and `isIndeedDedicatedPage()` helpers, then add Indeed branches in `isJobPage()`, `selectAboutTheJobSection()`, `findJobTitleUrl()`, and `waitForContentAndSelect()`. Add `*://*.indeed.com/*` to the manifest. No refactoring of existing code.

**Tech Stack:** Vanilla JS browser extension (Manifest V3), Playwright for tests.

---

### Task 1: Add Indeed fixture HTML

**Files:**
- Create: `tests/fixtures/indeed-job-search-panel.html`
- Create: `tests/fixtures/indeed-job-dedicated-page.html`

These fixtures are used by integration tests. They need the minimum DOM structure that `selectIndeedDescription()` and `findJobTitleUrl()` operate on.

**Step 1: Create the search panel fixture**

Create `tests/fixtures/indeed-job-search-panel.html`:

```html
<!DOCTYPE html>
<html>
<head><title>Indeed Job Search</title></head>
<body>
  <input id="search-input" type="text" />
  <textarea id="message-textarea"></textarea>
  <div contenteditable="true" class="contenteditable-div">Edit me</div>

  <div id="vjs-container">
    <h2 data-testid="jobsearch-JobInfoHeader-title">
      <span>Senior Software Engineer</span>
    </h2>

    <div id="jobDescriptionTitle">
      <h2 tabindex="-1" id="jobDescriptionTitleHeading">Full job description</h2>
    </div>

    <div id="jobDescriptionText">
      <div>
        <p>About the Role</p>
        <p>We are looking for a Senior Software Engineer to join our team.</p>
        <ul>
          <li>Responsibilities: Build great software</li>
          <li>Qualifications: 5+ years experience</li>
        </ul>
      </div>
    </div>

    <div id="competitorsJobsCarouselWrapper">
      <h2>Explore other jobs</h2>
      <p>Other jobs content that should NOT be selected</p>
    </div>
  </div>
</body>
</html>
```

**Step 2: Create the dedicated page fixture**

Create `tests/fixtures/indeed-job-dedicated-page.html`:

```html
<!DOCTYPE html>
<html>
<head><title>Indeed Job - Senior Software Engineer</title></head>
<body>
  <input id="search-input" type="text" />
  <textarea id="message-textarea"></textarea>
  <div contenteditable="true" class="contenteditable-div">Edit me</div>

  <div class="jobsearch-JobComponent">
    <h1 data-testid="jobsearch-JobInfoHeader-title">
      <span>Senior Software Engineer</span>
    </h1>

    <div id="jobDescriptionTitle">
      <h2 tabindex="-1" id="jobDescriptionTitleHeading">Full job description</h2>
    </div>

    <div id="jobDescriptionText">
      <div>
        <p>About the Role</p>
        <p>We are looking for a Senior Software Engineer to join our team.</p>
        <ul>
          <li>Responsibilities: Build great software</li>
          <li>Qualifications: 5+ years experience</li>
        </ul>
      </div>
    </div>

    <div id="competitorsJobsCarouselWrapper">
      <h2>Explore other jobs</h2>
      <p>Other jobs content that should NOT be selected</p>
    </div>
  </div>
</body>
</html>
```

**Step 3: Commit**

```bash
git add tests/fixtures/indeed-job-search-panel.html tests/fixtures/indeed-job-dedicated-page.html
git commit -m "test: add Indeed fixture HTML files"
```

---

### Task 2: Add Indeed integration tests (search panel)

**Files:**
- Create: `tests/integration/indeed-search-panel.spec.js`

**Step 1: Write the failing tests**

Create `tests/integration/indeed-search-panel.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Indeed Search Panel - DOM Selection', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Set URL to simulate Indeed search panel (vjk param = job key)
    await page.route('**', route => route.continue());

    const htmlPath = path.join(__dirname, '../fixtures/indeed-job-search-panel.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Set content with Indeed search panel URL
    await page.goto('about:blank');
    await page.evaluate((html) => {
      document.open();
      document.write(html);
      document.close();
      // Simulate Indeed search panel URL with vjk param
      window.history.replaceState({}, '', 'https://www.indeed.com/?vjk=abc123test');
    }, html);

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

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects job description on keyboard shortcut', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).toContain('About the Role');
    expect(selectedText).toContain('Responsibilities');
    expect(selectedText).toContain('Qualifications');
  });

  test('does not select "Explore other jobs" carousel', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).not.toContain('Other jobs content that should NOT be selected');
  });

  test('ignores shortcut when typing in input field', async () => {
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

  test('findJobTitleUrl returns viewjob URL from vjk param', async () => {
    const url = await page.evaluate(() => {
      // Override location to simulate search panel URL
      return window.LinkedInJobQuickSelect?.findJobTitleUrl?.() ?? null;
    });

    expect(url).toBe('https://www.indeed.com/viewjob?jk=abc123test');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/integration/indeed-search-panel.spec.js
```

Expected: All tests FAIL — Indeed support doesn't exist yet.

**Step 3: Commit the failing tests**

```bash
git add tests/integration/indeed-search-panel.spec.js
git commit -m "test: add failing Indeed search panel integration tests"
```

---

### Task 3: Add Indeed integration tests (dedicated page)

**Files:**
- Create: `tests/integration/indeed-dedicated-page.spec.js`

**Step 1: Write the failing tests**

Create `tests/integration/indeed-dedicated-page.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Indeed Dedicated Job Page - DOM Selection', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/indeed-job-dedicated-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    await page.goto('about:blank');
    await page.evaluate((html) => {
      document.open();
      document.write(html);
      document.close();
      // Simulate Indeed dedicated page URL
      window.history.replaceState({}, '', 'https://www.indeed.com/viewjob?jk=abc123test');
    }, html);

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

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects job description on keyboard shortcut', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).toContain('About the Role');
    expect(selectedText).toContain('Responsibilities');
    expect(selectedText).toContain('Qualifications');
  });

  test('does not select "Explore other jobs" carousel', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).not.toContain('Other jobs content that should NOT be selected');
  });

  test('findJobTitleUrl returns current URL on dedicated page', async () => {
    const url = await page.evaluate(() => {
      return window.LinkedInJobQuickSelect?.findJobTitleUrl?.() ?? null;
    });

    expect(url).toContain('/viewjob?jk=abc123test');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- tests/integration/indeed-dedicated-page.spec.js
```

Expected: All tests FAIL.

**Step 3: Commit the failing tests**

```bash
git add tests/integration/indeed-dedicated-page.spec.js
git commit -m "test: add failing Indeed dedicated page integration tests"
```

---

### Task 4: Update manifest.json

**Files:**
- Modify: `manifest.json`

**Step 1: Add Indeed to content_scripts matches**

In `manifest.json`, the `content_scripts` section currently reads:

```json
"matches": ["*://*.linkedin.com/*", "*://*.wellfound.com/*"]
```

Change it to:

```json
"matches": ["*://*.linkedin.com/*", "*://*.wellfound.com/*", "*://*.indeed.com/*"]
```

**Step 2: Verify the file looks correct**

```bash
cat manifest.json
```

Expected: `matches` array has three entries including `*://*.indeed.com/*`.

**Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: add indeed.com to content_scripts manifest"
```

---

### Task 5: Add isIndeed() helpers and update isJobPage() in content.js

**Files:**
- Modify: `content.js`

The current `content.js` has `isWellfound()` at line 12 and `isJobPage()` at line 22. Add Indeed helpers immediately after `isWellfound()`.

**Step 1: Add isIndeed() and isIndeedDedicatedPage() after isWellfound()**

After the `isWellfoundDedicatedPage()` function (around line 19), add:

```javascript
// Check if we're on Indeed
function isIndeed() {
  return window.location.hostname.includes('indeed.com');
}

// Check if we're on a dedicated Indeed job page (e.g. /viewjob?jk=...)
function isIndeedDedicatedPage() {
  return isIndeed() && window.location.pathname === '/viewjob';
}
```

**Step 2: Update isJobPage() to handle Indeed**

The current `isJobPage()` function reads:

```javascript
function isJobPage() {
  if (isWellfound()) {
    return window.location.pathname.includes('/jobs');
  }
  const url = window.location.href;
  return url.includes('/jobs/') || url.includes('/jobs?') || url.includes('/jobs#') || url.match(/\/jobs$/);
}
```

Change it to:

```javascript
function isJobPage() {
  if (isWellfound()) {
    return window.location.pathname.includes('/jobs');
  }
  if (isIndeed()) {
    const params = new URLSearchParams(window.location.search);
    return params.has('vjk') || window.location.pathname === '/viewjob';
  }
  const url = window.location.href;
  return url.includes('/jobs/') || url.includes('/jobs?') || url.includes('/jobs#') || url.match(/\/jobs$/);
}
```

**Step 3: Run existing tests to make sure nothing broke**

```bash
npm test -- tests/integration/content.spec.js
```

Expected: All existing LinkedIn tests still PASS.

---

### Task 6: Add selectIndeedDescription() and update selectAboutTheJobSection()

**Files:**
- Modify: `content.js`

**Step 1: Add selectIndeedDescription() after selectWellfoundDescription()**

The `selectWellfoundDescription()` function ends around line 530. Add the new function immediately after it:

```javascript
function selectIndeedDescription() {
  try {
    const el = document.querySelector('#jobDescriptionText');

    if (!el) {
      debugLog('warn', 'Could not find Indeed job description element (#jobDescriptionText)');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const heading = document.querySelector('#jobDescriptionTitleHeading');
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    debugLog('log', 'Indeed description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Indeed description', error);
  }
}
```

**Step 2: Update selectAboutTheJobSection() to call selectIndeedDescription()**

The current `selectAboutTheJobSection()` function starts with:

```javascript
function selectAboutTheJobSection() {
  try {
    if (isWellfound()) {
      selectWellfoundDescription();
      return;
    }
```

Change it to:

```javascript
function selectAboutTheJobSection() {
  try {
    if (isWellfound()) {
      selectWellfoundDescription();
      return;
    }

    if (isIndeed()) {
      selectIndeedDescription();
      return;
    }
```

**Step 3: Run the Indeed tests**

```bash
npm test -- tests/integration/indeed-search-panel.spec.js tests/integration/indeed-dedicated-page.spec.js
```

Expected: The selection tests PASS. The `findJobTitleUrl` tests still FAIL (not implemented yet).

---

### Task 7: Update findJobTitleUrl() for Indeed

**Files:**
- Modify: `content.js`

**Step 1: Add Indeed branch to findJobTitleUrl()**

The current `findJobTitleUrl()` function starts with a Wellfound check. Add an Indeed check right after it:

```javascript
function findJobTitleUrl() {
  if (isWellfound()) {
    // ... existing Wellfound code (don't touch) ...
  }

  if (isIndeed()) {
    if (isIndeedDedicatedPage()) {
      // Already on the dedicated job page — return current URL
      return window.location.href;
    }
    // Search panel: extract vjk param and construct viewjob URL
    const params = new URLSearchParams(window.location.search);
    const vjk = params.get('vjk');
    if (vjk) {
      return `https://www.indeed.com/viewjob?jk=${vjk}`;
    }
    debugLog('warn', 'Could not find Indeed job key in URL params');
    return null;
  }

  // LinkedIn selectors (existing code below — don't touch)
```

**Step 2: Run all Indeed tests**

```bash
npm test -- tests/integration/indeed-search-panel.spec.js tests/integration/indeed-dedicated-page.spec.js
```

Expected: All Indeed tests PASS.

**Step 3: Run all tests to verify no regressions**

```bash
npm test
```

Expected: All tests PASS.

---

### Task 8: Update waitForContentAndSelect() for Indeed

**Files:**
- Modify: `content.js`

This function polls for content readiness after the background script opens a new window. It needs to recognise `#jobDescriptionText` as a ready signal.

**Step 1: Add #jobDescriptionText to the content-ready check**

The current `waitForContentAndSelect()` has:

```javascript
const contentReady = !!(
  document.querySelector('span[data-testid="expandable-text-box"]') ||
  document.querySelector('div.jobs-description__content') ||
  document.querySelector('div.jobs-description-content') ||
  document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]') ||
  document.querySelector('#job-description')
);
```

Change it to:

```javascript
const contentReady = !!(
  document.querySelector('span[data-testid="expandable-text-box"]') ||
  document.querySelector('div.jobs-description__content') ||
  document.querySelector('div.jobs-description-content') ||
  document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]') ||
  document.querySelector('#job-description') ||
  document.querySelector('#jobDescriptionText')
);
```

**Step 2: Run the full test suite**

```bash
npm test
```

Expected: All tests PASS.

**Step 3: Commit everything**

```bash
git add content.js
git commit -m "feat: add Indeed.com support (select, open, combined shortcuts)"
```

---

### Task 9: Expose findJobTitleUrl on window for testability (if needed)

**Note:** Only do this task if the `findJobTitleUrl` tests in Tasks 2 and 3 fail because the function isn't accessible. Check first whether `window.LinkedInJobQuickSelect.findJobTitleUrl` is already exposed.

**Step 1: Check if the function is already accessible**

Look at the bottom of `content.js` for any `window.LinkedInJobQuickSelect` assignments. If `findJobTitleUrl` is not exposed, add it near the `checkStatus` and `forceReregister` exposures:

```javascript
window.LinkedInJobQuickSelect.findJobTitleUrl = findJobTitleUrl;
```

**Step 2: Re-run the findJobTitleUrl tests**

```bash
npm test -- tests/integration/indeed-search-panel.spec.js tests/integration/indeed-dedicated-page.spec.js
```

Expected: PASS.

**Step 3: Run full suite and commit**

```bash
npm test
git add content.js
git commit -m "feat: expose findJobTitleUrl for testability"
```

---

### Task 10: Bump version

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`

**Step 1: Bump version to 1.4**

In `manifest.json`: change `"version": "1.3"` to `"version": "1.4"`

In `package.json`: change `"version": "1.3.0"` to `"version": "1.4.0"`

**Step 2: Commit**

```bash
git add manifest.json package.json
git commit -m "chore: bump version to 1.4"
```
