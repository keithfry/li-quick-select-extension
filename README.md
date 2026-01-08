# LinkedIn Job Quick Select

A Chrome extension that allows you to quickly select the "About the job" section on LinkedIn job postings using a customizable keyboard shortcut.

## Features

- **Customizable Keyboard Shortcuts**: Configure any keyboard combination that suits your workflow
- **Smart Text Selection**: Automatically finds and selects the job description content
- **SPA Navigation Support**: Works seamlessly as you navigate between jobs on LinkedIn
- **Fallback Selection Methods**: Multiple strategies to ensure reliable text selection

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. Navigate to any LinkedIn job posting to use the extension

## Default Keyboard Shortcut

- **Mac**: `⌥⇧S` (Option + Shift + S)
- **Windows/Linux**: `Alt + Shift + S`

## Customizing the Keyboard Shortcut

1. Right-click the extension icon and select "Options"
2. Click on the shortcut display field
3. Press your desired key combination
4. The shortcut will be validated and saved automatically

### Shortcut Requirements

- Must include at least one modifier key (Ctrl, Alt, Shift, or Cmd/Win)
- Cannot use browser-reserved shortcuts (like Ctrl+T, Ctrl+W, etc.)
- Function keys (F1-F12) can be used without modifiers

## Usage

1. Navigate to any LinkedIn job posting
2. Press your configured keyboard shortcut
3. The "About the job" section will be selected and scrolled into view
4. You can now copy the text with Ctrl+C (or Cmd+C on Mac)

## Debug Logging

The extension includes comprehensive debug logging to help troubleshoot issues.

### Enabling/Disabling Debug Logs

Debug logging is **disabled by default**. To control it:

#### From the Browser Console

1. Open the browser console on a LinkedIn page:
   - **Mac**: `Cmd + Option + I`
   - **Windows/Linux**: `F12` or `Ctrl + Shift + I`

2. Type one of the following commands:

```javascript
// Enable all debug logging
window.LinkedInJobQuickSelect.debugEnabled = true

// Disable all debug logging
window.LinkedInJobQuickSelect.debugEnabled = false
```

#### Permanent Configuration

To permanently enable debug logging, edit the files:

**In `storage.js` and `options.js`:**

Change:
```javascript
window.LinkedInJobQuickSelect.debugEnabled = false;
```

To:
```javascript
window.LinkedInJobQuickSelect.debugEnabled = true;
```

### Understanding Debug Logs

All debug logs are prefixed with `LinkedIn Job Quick Select:` to make them easy to filter.

#### Common Log Messages

**On Page Load:**
- `storage.js loaded` - Storage utilities are loaded
- `DEFAULT_SHORTCUT defined` - Default keyboard shortcut is set up
- `Content script loaded!` - Main content script is running
- `Starting initialization...` - Extension is initializing
- `Listeners registered (count: X)` - Keyboard listeners are active

**When Using the Shortcut:**
- `Keyboard event received` - A key was pressed (shows which keys)
- `Shortcut activated` - Your shortcut was recognized
- `Text selected successfully` - Job description was selected

**During Navigation:**
- `URL changed` - Detected navigation to a different page
- `Navigated to job page, re-initializing...` - Refreshing on a new job page

**Periodic Health Checks:**
- `Health check` - Shows current state every 30 seconds

#### Filtering Logs in Console

To see only extension logs, use the Console filter:
```
LinkedIn Job Quick Select
```

### Console Helper Functions

The extension exposes helper functions for debugging:

#### Check Extension Status

```javascript
LinkedInJobQuickSelect.checkStatus()
```

This displays:
- Whether listeners are registered
- Current keyboard shortcut
- Active element details
- Document focus status
- Current URL and page type

#### Force Re-register Listeners

If the shortcut stops working after navigation:

```javascript
LinkedInJobQuickSelect.forceReregister()
```

This manually re-registers the keyboard listeners.

## File Structure

```
li-quick-select-extension/
├── manifest.json          # Extension configuration
├── storage.js            # Keyboard shortcut storage utilities
├── content.js            # Main content script (runs on LinkedIn pages)
├── options.js            # Options page logic
├── options.html          # Options page UI
├── popup.html            # Extension popup UI
├── popup.js              # Extension popup logic
└── README.md            # This file
```

## Troubleshooting

### The shortcut isn't working

1. **Check if the extension is loaded**:
   - Open console on a LinkedIn page
   - Look for `Content script loaded!` message
   - If missing, reload the extension at `chrome://extensions/`

2. **Verify keyboard events are being captured**:
   - With debug logging enabled, press any key
   - You should see `Keyboard event received` in the console
   - Within 5 seconds of page load, you should see `TEST - Key event detected!`

3. **Check the shortcut configuration**:
   - Look at the `Health check` log (appears every 30 seconds)
   - Verify `hasShortcut: true` and check the `shortcut` object

4. **Ensure you're on a job page**:
   - The extension works on URLs containing `/jobs/`
   - Check the `isJobPage` field in health check logs

### The extension loaded but keyboard events aren't detected

This typically happens after SPA (Single Page Application) navigation when no element has focus.

**Automatic Fix**: The extension now automatically focuses the document body after navigation to enable keyboard event capture.

If it still doesn't work:

1. **Click anywhere on the page** - This gives focus and enables keyboard events
2. **Reload the LinkedIn page** - Sometimes initial load fails
3. **Use the console helper**: Run `LinkedInJobQuickSelect.forceReregister()` to manually re-register
4. **Check for conflicting extensions** - Disable other keyboard shortcut extensions temporarily
5. **Try a different shortcut** - Some shortcuts may be captured by other software

### Listener registration count is very high

If you see `Listeners registered (count: 42)` or higher:
- This was a bug that has been fixed
- Reload the extension at `chrome://extensions/`
- The count should be 1 or 2 after reload

## Development

### Testing Changes

1. Make your code changes
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension
4. Navigate to a LinkedIn job page
5. Open console to view debug logs

### Debug Logging Best Practices

When adding new features, use the `debugLog()` function:

```javascript
// Log levels: 'log', 'warn', 'error'
debugLog('log', 'Your message here');
debugLog('log', 'Your message with data', { key: 'value' });
debugLog('warn', 'Warning message');
debugLog('error', 'Error message', errorObject);
```

All logging will respect the `window.LinkedInJobQuickSelect.debugEnabled` flag.

## Privacy

This extension:
- Only runs on linkedin.com domains
- Does not collect or transmit any data
- Stores only your keyboard shortcut preference locally
- Does not track your browsing or job search activity

## License

MIT License - Feel free to modify and distribute as needed.

## Contributing

Issues and pull requests are welcome! Please ensure debug logging is used appropriately for any new features.
