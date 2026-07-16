# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Manifest V3 Chrome extension ("JD Grab"). Lets user select/copy a job description on one keystroke across 10 job sites (LinkedIn, Indeed, Glassdoor, Wellfound, Welcome to the Jungle, Greenhouse incl. `my.greenhouse.io` modal variant, Lever, Ashby, ZipRecruiter, We Work Remotely). Plain JS, no bundler, no framework — files are loaded directly as listed in `manifest.json`.

## Commands

```bash
npm test              # full playwright suite
npm run test:unit     # tests/unit — pure functions (storage.js validation etc), no browser DOM needed
npm run test:integration  # tests/integration — content.js selection logic against saved HTML fixtures
npm run test:e2e      # tests/e2e — real extension loaded into Chromium (options/popup pages)
npm run test:debug    # playwright --debug (step through)
npm run test:ui       # playwright UI mode
npx playwright test tests/integration/lever-dedicated-page.spec.js   # run a single file
npm run build         # ./build.sh — zips shippable files into build/jd-grab.zip, extracts to build/extract/
```

No lint/typecheck script configured. `fullyParallel: false` and `workers: 1` in `playwright.config.js` — extension tests must run serially, don't try to parallelize test runs.

## Architecture

**File loading order matters**: `storage.js` then `content.js` are injected together per `manifest.json` `content_scripts`. `storage.js` defines `debugLog()`, `window.JDGrab`, and shortcut defaults/getters that `content.js` assumes exist at load time.

**content.js is one big per-site dispatch table.** Every capability follows the same three-function pattern per site:
- `isX()` / `isXDedicatedPage()` — hostname + pathname/DOM sniffing to detect the site and whether a job is currently loaded (some sites show the description in a search-results side panel rather than a dedicated URL — Wellfound, ZipRecruiter, Glassdoor's search panel — so page detection isn't just a path regex)
- `findJobTitleUrl()` — site branch returning the canonical job URL (used to open the listing in a new tab/window)
- `selectXDescription()` — site branch that finds the description DOM node, builds a `Range` over it, applies it via `window.getSelection()`, and scrolls it into view

`isJobPage()` and `selectAboutTheJobSection()` are the top-level dispatchers — adding a new site means adding a branch to both, plus the three functions above, plus registering the domain in `manifest.json` `content_scripts.matches` and `background.js` `SUPPORTED_SITE_PATTERNS`.

**Three independent keyboard shortcuts** (main select, open-title, combined open+select), each stored/loaded via `storage.js` and matched in `content.js`'s `handleKeyboardShortcut`. All are also exposed as context-menu items dispatched through `background.js` → `runContextMenuAction` messages.

**SPA navigation handling**: content.js runs a `MutationObserver` on `document.body` to detect client-side URL changes (most of these sites are SPAs) and re-registers keyboard listeners + refocuses `document.body` on navigation, since losing focus after a route change silently breaks keydown capture.

**Open-and-select cross-tab flow**: `openAndSelectInNewWindow()` (content script) messages `background.js`, which opens a new tab/window, polls until it's loaded, then sends `selectJobDescription` back to the new tab's content script, which polls (`waitForContentAndSelect`) for the description DOM to exist before selecting — necessary because SPA job pages hydrate content asynchronously after the initial page load event.

**ZipRecruiter selection guard**: `guardZipRecruiterSelection()` polls (not event-driven — see comment in content.js) to re-apply the selection because ZipRecruiter's rating widget re-renders on scroll and silently clears `window.getSelection()` without touching the DOM nodes.

**Debug logging**: gated behind `window.JDGrab.debugEnabled` (default `false`), toggle live via browser console: `window.JDGrab.debugEnabled = true`. All logs prefixed `JD Grab:`. Helper console functions: `JDGrab.checkStatus()`, `JDGrab.forceReregister()`.

## Testing approach

- `tests/unit/` — pure logic (shortcut validation, storage helpers), runs in plain browser context, no fixtures.
- `tests/integration/` — loads a static HTML fixture from `tests/fixtures/` via `page.setContent()`, mocks `window.chrome.storage`/`window.chrome.runtime` inline, injects `storage.js` then `content.js` via `page.addScriptTag`, then exercises `window.JDGrab` / selection behavior directly. This is the pattern to copy when adding a new site: add a fixture HTML file capturing that site's real DOM structure, then a spec that mirrors an existing one (e.g. `tests/integration/lever-dedicated-page.spec.js`).
- `tests/e2e/` — loads the real unpacked extension into Chromium via `tests/helpers/extension-loader.js` (`launchBrowserWithExtension`) to test options/popup pages end-to-end.
- `tests/helpers/chrome-mock.js` — reusable `chrome.storage`/`chrome.runtime` mocks for integration tests.

## Adding a new supported site

Requires changes in all of: `manifest.json` (`content_scripts.matches`), `background.js` (`SUPPORTED_SITE_PATTERNS`), `content.js` (the `isX`/`findJobTitleUrl`/`selectXDescription` triad plus dispatch branches in `isJobPage()` and `selectAboutTheJobSection()`), a new fixture + integration spec, and the site list in `README.md` / `manifest.json` description / `store-assets/description.txt`.

## Other directories

- `docs/plans/`, `docs/specs/` — dated design docs for past features; check before re-designing something similar.
- `docs/chrome-store-credentials.md` — Chrome Web Store publishing credentials/notes.
- `store-assets/`, `scripts/generate-screenshots.mjs`, `scripts/generate-promo-tiles.mjs` — Chrome Web Store listing assets.
- `site/` — GitHub Pages site (changelog, landing page).
