// Background service worker for LinkedIn Job Quick Select

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

  // Content script may still be initializing — retry once on failure
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'selectJobDescription' });
  } catch {
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'selectJobDescription' });
      } catch (e) {
        console.warn('LinkedIn Job Quick Select: Could not reach content script in new tab', e);
      }
    }, 1500);
  }
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
