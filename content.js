// State tracking for debugging
let listenerState = {
  registered: false,
  lastEventTime: null,
  registrationCount: 0
};

// Main keyboard handler function
function handleKeyboardShortcut(e) {
  console.log('LinkedIn Job Quick Select: Keyboard event received', {
    key: e.key,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    activeElement: document.activeElement?.tagName
  });

  listenerState.lastEventTime = Date.now();

  // Check for Option (Alt) + Shift + S
  if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS')) {
    // Don't interfere if user is typing in input fields
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      console.log('LinkedIn Job Quick Select: Ignoring - user is typing');
      return;
    }

    console.log('LinkedIn Job Quick Select: Shortcut activated');
    e.preventDefault();
    e.stopPropagation(); // Prevent LinkedIn handlers from interfering
    e.stopImmediatePropagation(); // Stop other listeners on same element
    selectAboutTheJobSection();
  }
}

// Register keyboard listener with capturing phase
function registerKeyboardListener() {
  // Remove existing listeners to avoid duplicates
  document.removeEventListener('keydown', handleKeyboardShortcut, true);
  window.removeEventListener('keydown', handleKeyboardShortcut, true);

  // Register in CAPTURE phase (runs before LinkedIn's bubble-phase handlers)
  document.addEventListener('keydown', handleKeyboardShortcut, {
    capture: true,  // Critical: intercept before LinkedIn
    passive: false  // Allow preventDefault()
  });

  // Redundant listener on window as fallback
  window.addEventListener('keydown', handleKeyboardShortcut, {
    capture: true,
    passive: false
  });

  listenerState.registered = true;
  listenerState.registrationCount++;

  console.log('LinkedIn Job Quick Select: Listeners registered (count: ' +
    listenerState.registrationCount + ')');
}

// Initial registration
registerKeyboardListener();

// Monitor DOM changes to detect SPA navigation
function setupSpaNavigationMonitoring() {
  const targetNode = document.body;

  const observer = new MutationObserver((mutations) => {
    // Check if significant DOM changes occurred
    const hasSignificantChanges = mutations.some(mutation =>
      mutation.type === 'childList' && mutation.addedNodes.length > 0
    );

    if (hasSignificantChanges) {
      console.log('LinkedIn Job Quick Select: DOM mutation detected, re-registering');
      registerKeyboardListener();
    }
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });

  console.log('LinkedIn Job Quick Select: SPA monitoring active');
}

// Start monitoring after brief delay
setTimeout(setupSpaNavigationMonitoring, 1000);

// Periodic health check
function startListenerHealthCheck() {
  setInterval(() => {
    console.log('LinkedIn Job Quick Select: Health check', {
      registered: listenerState.registered,
      registrationCount: listenerState.registrationCount,
      lastEventTime: listenerState.lastEventTime
    });

    // Preemptive re-registration if we're on a job page
    if (listenerState.registrationCount === 1 &&
        document.querySelector('[data-testid="expandable-text-box"]')) {
      console.log('LinkedIn Job Quick Select: Preemptive re-registration');
      registerKeyboardListener();
    }
  }, 30000); // Every 30 seconds
}

startListenerHealthCheck();

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

      console.log('LinkedIn Job Quick Select: Text selected successfully (primary method)');
      return;
    }

    // Fallback method: look for jobs-description content divs
    console.log('LinkedIn Job Quick Select: Trying fallback method...');

    const descriptionDiv = document.querySelector('div.jobs-description__content, div.jobs-description-content');

    if (!descriptionDiv) {
      console.warn('LinkedIn Job Quick Select: Could not find job description content with either method');
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

    console.log('LinkedIn Job Quick Select: Text selected successfully (fallback method)');

  } catch (error) {
    console.error('LinkedIn Job Quick Select: Error selecting text', error);
  }
}
