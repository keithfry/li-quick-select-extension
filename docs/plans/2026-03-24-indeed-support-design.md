# Indeed Support Design

**Date:** 2026-03-24
**Status:** Approved

## Goal

Add Indeed.com support to the LinkedIn Job Quick Select extension, enabling all three existing keyboard shortcuts (select job description, open in new window, combined open-and-select) to work on Indeed job pages.

## Page Types

| Page | URL pattern | Example |
|---|---|---|
| Search panel | `indeed.com/?vjk=<jk>` | `https://www.indeed.com/?vjk=7c0cc438c1d44297` |
| Dedicated job page | `indeed.com/viewjob?jk=<jk>` | `https://www.indeed.com/viewjob?jk=7c0cc438c1d44297` |

## Selectors

| Purpose | Selector | Notes |
|---|---|---|
| Job description | `#jobDescriptionText` | Same on both page types; excludes benefits section and "Explore other jobs" carousel |
| Scroll target | `#jobDescriptionTitleHeading` | "Full job description" heading |

## Job URL Construction

- **Search panel**: extract `vjk` from URL params → `https://www.indeed.com/viewjob?jk=<vjk>`
- **Dedicated page**: use `window.location.href` (already on the job page)

## Shortcut Behavior

| Shortcut | Search panel | Dedicated page |
|---|---|---|
| Select | select `#jobDescriptionText` | select `#jobDescriptionText` |
| Open title link | open `viewjob?jk=<vjk>` in new window/tab | open current URL in new window/tab |
| Combined | open + select in new window | open current URL + select |

## Files to Change

1. **`manifest.json`** — add `*://*.indeed.com/*` to `content_scripts.matches`
2. **`content.js`** — add `isIndeed()`, update `isJobPage()`, add `selectIndeedDescription()`, update `findJobTitleUrl()`, update `waitForContentAndSelect()`

## Approach

Mirror the existing Wellfound pattern: add a parallel `isIndeed()` branch in each function. No refactoring of existing code.
