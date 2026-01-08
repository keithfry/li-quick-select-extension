// Debug logging is defined in storage.js (loaded first)
// debugLog(level, message, data) is available

// IMMEDIATE LOG: Prove the script is loaded
debugLog('log', 'Content script loaded!', {
  url: window.location.href,
  readyState: document.readyState,
  timestamp: new Date().toISOString()
});

// Check if we're on a job page
function isJobPage() {
  const url = window.location.href;
  // Match /jobs, /jobs/, /jobs?, /jobs#, etc.
  return url.includes('/jobs/') || url.includes('/jobs?') || url.includes('/jobs#') || url.match(/\/jobs$/);
}

// Log page type
debugLog('log', 'Page type check', {
  isJobPage: isJobPage(),
  pathname: window.location.pathname
});

// State tracking for debugging
let listenerState = {
  registered: false,
  lastEventTime: null,
  registrationCount: 0
};

// Current keyboard shortcut (loaded from storage)
let currentShortcut = null;

// Load keyboard shortcut from storage
async function initializeShortcut() {
  try {
    debugLog('log', 'Attempting to load shortcut from storage...');
    currentShortcut = await getShortcut();
    debugLog('log', 'Loaded shortcut', currentShortcut);
  } catch (error) {
    debugLog('error', 'Error loading shortcut, using default', error);
    currentShortcut = DEFAULT_SHORTCUT;
  }
}

// Main keyboard handler function
function handleKeyboardShortcut(e) {
  const activeElement = document.activeElement;

  debugLog('log', 'Keyboard event received', {
    key: e.key,
    code: e.code,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey,
    activeElement: activeElement?.tagName,
    activeElementId: activeElement?.id,
    activeElementClass: activeElement?.className,
    isContentEditable: activeElement?.isContentEditable
  });

  listenerState.lastEventTime = Date.now();

  // Safety check - ensure shortcut is loaded
  if (!currentShortcut) {
    debugLog('warn', 'Shortcut not yet loaded');
    return;
  }

  // Check if current key combination matches the configured shortcut
  const matches = (
    e.key === currentShortcut.key || e.code === currentShortcut.code
  ) && (
    e.altKey === currentShortcut.altKey &&
    e.ctrlKey === currentShortcut.ctrlKey &&
    e.shiftKey === currentShortcut.shiftKey &&
    e.metaKey === currentShortcut.metaKey
  );

  if (matches) {
    // Don't interfere if user is typing in input fields
    // BUT: Allow the shortcut if user is just on a search field that's not being actively edited
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      debugLog('log', 'Ignoring - user is in an editable field', {
        tag: activeElement.tagName,
        type: activeElement.type,
        id: activeElement.id,
        class: activeElement.className
      });
      return;
    }

    debugLog('log', 'Shortcut activated');
    e.preventDefault();
    e.stopPropagation(); // Prevent LinkedIn handlers from interfering
    e.stopImmediatePropagation(); // Stop other listeners on same element
    selectAboutTheJobSection();
  }
}

// Listener options (reuse for proper add/remove)
const listenerOptions = {
  capture: true,  // Critical: intercept before LinkedIn
  passive: false  // Allow preventDefault()
};

// Register keyboard listener with capturing phase
function registerKeyboardListener() {
  // Remove existing listeners to avoid duplicates (must use same options)
  document.removeEventListener('keydown', handleKeyboardShortcut, listenerOptions);
  window.removeEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  // Register in CAPTURE phase (runs before LinkedIn's bubble-phase handlers)
  document.addEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  // Redundant listener on window as fallback
  window.addEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  listenerState.registered = true;
  listenerState.registrationCount++;

  debugLog('log', `Listeners registered (count: ${listenerState.registrationCount})`);
  debugLog('log', 'Current shortcut:', currentShortcut);
  debugLog('log', 'Testing listener... Press any key to verify');

  // Add a simple test listener to verify events are being captured
  const testListener = (e) => {
    debugLog('log', `TEST - Key event detected! ${e.key} ${e.code}`);
  };
  document.addEventListener('keydown', testListener, listenerOptions);

  // Remove test listener after 5 seconds
  setTimeout(() => {
    document.removeEventListener('keydown', testListener, listenerOptions);
    debugLog('log', 'Test listener removed');
  }, 5000);
}

// Main initialization function
async function initialize() {
  try {
    debugLog('log', 'Starting initialization...');

    // Verify storage.js is loaded
    if (typeof getShortcut === 'undefined') {
      debugLog('error', 'ERROR - storage.js not loaded! getShortcut is undefined');
      throw new Error('storage.js not loaded');
    }

    if (typeof DEFAULT_SHORTCUT === 'undefined') {
      debugLog('error', 'ERROR - DEFAULT_SHORTCUT is undefined');
      throw new Error('DEFAULT_SHORTCUT not defined');
    }

    debugLog('log', 'Dependencies verified, initializing...');

    // Ensure body is focusable to receive keyboard events
    if (!document.body.hasAttribute('tabindex')) {
      document.body.setAttribute('tabindex', '-1');
      debugLog('log', 'Set body tabindex to -1 to enable keyboard event capture');
    }

    await initializeShortcut();
    debugLog('log', 'Shortcut initialized, registering listener...');
    registerKeyboardListener();
    debugLog('log', 'Listener registration complete');

  } catch (error) {
    debugLog('error', 'Initialization failed', error);
    // Register with default shortcut as fallback
    currentShortcut = DEFAULT_SHORTCUT;
    registerKeyboardListener();
  }
}

// Initialize on load
initialize().catch((error) => {
  debugLog('error', 'FATAL ERROR during initialization', error);
});

// Handle SPA navigation (URL changes without page reload)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    debugLog('log', 'URL changed', {
      from: lastUrl,
      to: currentUrl,
      isJobPage: isJobPage(),
      activeElement: document.activeElement?.tagName,
      hasFocus: document.hasFocus()
    });
    lastUrl = currentUrl;

    // Re-initialize when navigating to a job page
    if (isJobPage()) {
      debugLog('log', 'Navigated to job page, re-initializing...', {
        activeElement: document.activeElement?.tagName,
        activeElementId: document.activeElement?.id,
        documentHasFocus: document.hasFocus()
      });

      // CRITICAL FIX: Ensure keyboard events can be captured by giving focus to the document
      // Without focus, keyboard events don't propagate through the DOM
      if (!document.hasFocus() || !document.activeElement || document.activeElement === document.body) {
        debugLog('log', 'Document has no focus - focusing body to enable keyboard events');
        // Focus the body to ensure keyboard events are dispatched
        document.body.focus();
        // Also set tabindex to make body focusable if needed
        if (!document.body.hasAttribute('tabindex')) {
          document.body.setAttribute('tabindex', '-1');
        }
      }

      // Re-register immediately
      debugLog('log', 'Re-registering listener immediately after navigation');
      registerKeyboardListener();

      // Also re-register after a delay to ensure page is stable
      setTimeout(() => {
        debugLog('log', 'Re-registering listener after navigation delay', {
          activeElement: document.activeElement?.tagName,
          documentHasFocus: document.hasFocus()
        });

        // Double-check focus again after delay
        if (!document.hasFocus() || document.activeElement === document.body) {
          debugLog('log', 'Still no focus after delay - forcing body focus again');
          document.body.focus();
        }

        registerKeyboardListener();
      }, 500); // Reduced delay - register again after 500ms
    }
  }
});

// Start observing URL changes
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

debugLog('log', 'URL observer active');

// Add a permanent diagnostic listener to verify keyboard events are being captured
// This runs independently of our main handler
let lastDiagnosticLog = 0;
const diagnosticListener = (e) => {
  // Throttle to avoid spam (max once per second)
  const now = Date.now();
  if (now - lastDiagnosticLog < 1000) return;
  lastDiagnosticLog = now;

  debugLog('log', 'DIAGNOSTIC - Keydown event captured at document level', {
    key: e.key,
    code: e.code,
    target: e.target?.tagName,
    activeElement: document.activeElement?.tagName,
    documentHasFocus: document.hasFocus(),
    eventPhase: e.eventPhase,
    bubbles: e.bubbles
  });
};

document.addEventListener('keydown', diagnosticListener, { capture: true });
debugLog('log', 'Diagnostic listener active');

// Expose helper functions for debugging from console
window.LinkedInJobQuickSelect.checkStatus = function() {
  const status = {
    registered: listenerState.registered,
    registrationCount: listenerState.registrationCount,
    lastEventTime: listenerState.lastEventTime,
    isJobPage: isJobPage(),
    currentUrl: window.location.href,
    hasShortcut: currentShortcut !== null,
    shortcut: currentShortcut,
    activeElement: {
      tagName: document.activeElement?.tagName,
      id: document.activeElement?.id,
      className: document.activeElement?.className,
      isContentEditable: document.activeElement?.isContentEditable
    },
    documentHasFocus: document.hasFocus(),
    debugEnabled: window.LinkedInJobQuickSelect.debugEnabled
  };
  console.log('LinkedIn Job Quick Select Status:', status);
  return status;
};

window.LinkedInJobQuickSelect.forceReregister = function() {
  debugLog('log', 'Manual re-registration requested from console');
  registerKeyboardListener();
  console.log('Listeners re-registered. Try your shortcut now.');
};

debugLog('log', 'Helper functions exposed: LinkedInJobQuickSelect.checkStatus() and LinkedInJobQuickSelect.forceReregister()');

// Periodic health check
function startListenerHealthCheck() {
  setInterval(() => {
    debugLog('log', 'Health check', {
      registered: listenerState.registered,
      registrationCount: listenerState.registrationCount,
      lastEventTime: listenerState.lastEventTime,
      isJobPage: isJobPage(),
      currentUrl: window.location.href,
      hasShortcut: currentShortcut !== null,
      shortcut: currentShortcut
    });
  }, 30000); // Every 30 seconds
}

startListenerHealthCheck();

// Listen for shortcut changes from options page
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.keyboardShortcut) {
    debugLog('log', 'Shortcut changed', changes.keyboardShortcut.newValue);
    currentShortcut = changes.keyboardShortcut.newValue;
  }
});

function selectAboutTheJobSection() {
  try {
    // Find the "About the job" h2 heading
    const headings = document.querySelectorAll('h2');
    let aboutJobHeading = null;

    for (const heading of headings) {
      if (heading.textContent.trim() === 'About the job') {
        aboutJobHeading = heading;
        break;
      }
    }

    // Find the expandable text box span (the actual content)
    const contentSpan = document.querySelector('span[data-testid="expandable-text-box"]');

    // Try primary method: using heading and expandable text box
    if (aboutJobHeading && contentSpan) {
      // Look for the hr separator that marks the end of the section
      const hrSeparator = contentSpan.parentElement.querySelector('hr');

      // Create a range for the selection
      const range = document.createRange();

      // Start from the beginning of the content span
      range.setStartBefore(contentSpan.firstChild || contentSpan);

      // End at the hr separator if it exists, otherwise end of content span
      if (hrSeparator) {
        range.setEndBefore(hrSeparator);
      } else {
        range.setEndAfter(contentSpan.lastChild || contentSpan);
      }

      // Apply the selection
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Scroll to the top of the selected content
      aboutJobHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });

      debugLog('log', 'Text selected successfully (primary method)');
      return;
    }

    // Fallback method: look for jobs-description content divs
    debugLog('log', 'Trying fallback method...');

    const descriptionDiv = document.querySelector('div.jobs-description__content, div.jobs-description-content');

    if (!descriptionDiv) {
      debugLog('warn', 'Could not find job description content with either method');
      return;
    }

    // Create a range for the entire description div
    const range = document.createRange();
    range.selectNodeContents(descriptionDiv);

    // Apply the selection
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Scroll to the selected content
    descriptionDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    debugLog('log', 'Text selected successfully (fallback method)');

  } catch (error) {
    debugLog('error', 'Error selecting text', error);
  }
}
