// Background service worker for JD Grab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openWindow') {
    if (message.target === 'tab') {
      chrome.tabs.create({ url: message.url });
    } else {
      chrome.windows.create({ url: message.url, type: 'normal' });
    }
    return false;
  }

  if (message.action === 'openWindowAndSelect') {
    handleOpenAndSelect(message.url, message.target);
    return false;
  }
});

async function handleOpenAndSelect(url, target) {
  let tabId;

  if (target === 'tab') {
    const tab = await chrome.tabs.create({ url });
    tabId = tab.id;
  } else {
    const win = await chrome.windows.create({ url, type: 'normal' });
    tabId = win.tabs[0].id;
  }

  await waitForTabComplete(tabId);

  // Ensure the new window/tab has focus so selection is visible
  if (target !== 'tab') {
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
  }

  // Content script may still be initializing — retry with backoff
  await sendWithRetry(tabId, { action: 'selectJobDescription' });
}

async function sendWithRetry(tabId, message, attempts = 5, delayMs = 800) {
  for (let i = 0; i < attempts; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch {
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.warn('JD Grab: Could not reach content script after retries');
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab && tab.status === 'complete') {
        resolve();
        return;
      }

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

// Context menu — same actions as the keyboard shortcuts.
// Patterns must match content_scripts.matches in manifest.json so the
// menu only appears where the content script is injected.
const SUPPORTED_SITE_PATTERNS = [
  '*://*.linkedin.com/*',
  '*://*.wellfound.com/*',
  '*://*.indeed.com/*',
  '*://*.glassdoor.com/*',
  '*://*.welcometothejungle.com/*',
];

const CONTEXT_MENU_ACTIONS = {
  'select-description': 'selectDescription',
  'open-title': 'openTitle',
  'open-title-and-select': 'openTitleAndSelect',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'jd-grab',
      title: 'JD Grab',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'select-description',
      parentId: 'jd-grab',
      title: 'Select Job Description',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'open-title',
      parentId: 'jd-grab',
      title: 'Open Job Title in New Window/Tab',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'open-title-and-select',
      parentId: 'jd-grab',
      title: 'Open Job Title & Select Description',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const name = CONTEXT_MENU_ACTIONS[info.menuItemId];
  if (!name || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'runContextMenuAction', name })
    .catch(() => {
      console.warn('JD Grab: content script unavailable for context menu action');
    });
});
