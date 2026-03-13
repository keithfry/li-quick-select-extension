// Options page logic for keyboard shortcut recorder

// Debug configuration
window.LinkedInJobQuickSelect = window.LinkedInJobQuickSelect || {};
if (typeof window.LinkedInJobQuickSelect.debugEnabled === 'undefined') {
  window.LinkedInJobQuickSelect.debugEnabled = false; // Set to true to enable debug logging
}

/**
 * Centralized debug logging function
 * @param {string} level - Log level: 'log', 'warn', 'error'
 * @param {string} message - The message to log
 * @param {*} data - Optional data to log
 */
function debugLog(level, message, data = null) {
  if (!window.LinkedInJobQuickSelect.debugEnabled) return;

  const prefix = 'LinkedIn Job Quick Select:';
  const fullMessage = `${prefix} ${message}`;

  if (data !== null) {
    console[level](fullMessage, data);
  } else {
    console[level](fullMessage);
  }
}

let isRecording = false;
let currentShortcut = null;
let isTitleRecording = false;
let currentTitleShortcut = null;
let isCombinedRecording = false;
let currentCombinedShortcut = null;

// Detect platform
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// DOM elements
const shortcutDisplay = document.getElementById('shortcut-display');
const clearBtn = document.getElementById('clear-btn');
const hintText = document.getElementById('hint-text');
const titleShortcutDisplay = document.getElementById('title-shortcut-display');
const titleClearBtn = document.getElementById('title-clear-btn');
const titleHintText = document.getElementById('title-hint-text');
const combinedShortcutDisplay = document.getElementById('combined-shortcut-display');
const combinedClearBtn = document.getElementById('combined-clear-btn');
const combinedHintText = document.getElementById('combined-hint-text');
const combinedLabel = document.getElementById('combined-label');
const openTargetRadios = document.querySelectorAll('input[name="open-target"]');
const statusMessage = document.getElementById('status-message');
const modifierDisplay = document.getElementById('modifier-display');

/**
 * Format shortcut for display based on platform
 */
function formatShortcutDisplay(shortcut) {
  const parts = [];

  if (isMac) {
    // Mac: Use symbols
    if (shortcut.metaKey) parts.push('⌘');
    if (shortcut.ctrlKey) parts.push('⌃');
    if (shortcut.altKey) parts.push('⌥');
    if (shortcut.shiftKey) parts.push('⇧');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('');
  } else {
    // Windows/Linux: Use text
    if (shortcut.metaKey) parts.push('Win');
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  }
}

/**
 * Display platform-specific modifier keys
 */
function displayModifierKeys() {
  const modifiers = isMac
    ? [
        { symbol: '⌘', name: 'Cmd' },
        { symbol: '⌃', name: 'Ctrl' },
        { symbol: '⌥', name: 'Opt' },
        { symbol: '⇧', name: 'Shift' }
      ]
    : [
        { symbol: 'Win', name: 'Windows' },
        { symbol: 'Ctrl', name: 'Control' },
        { symbol: 'Alt', name: 'Alt' },
        { symbol: 'Shift', name: 'Shift' }
      ];

  modifierDisplay.innerHTML = modifiers
    .map(mod => `<div class="modifier-key">${mod.symbol} ${mod.name}</div>`)
    .join('');
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

/**
 * Start recording mode
 */
function startRecording() {
  isRecording = true;
  shortcutDisplay.classList.add('recording');
  shortcutDisplay.value = '';
  shortcutDisplay.placeholder = 'Press your desired shortcut...';
  hintText.textContent = 'Press your desired key combination now';
  hintText.classList.add('recording-mode');
}

/**
 * Stop recording mode
 */
function stopRecording() {
  isRecording = false;
  shortcutDisplay.classList.remove('recording');
  shortcutDisplay.placeholder = 'Click to record shortcut';
  hintText.textContent = 'Click the field above and press your desired key combination';
  hintText.classList.remove('recording-mode');
}

/**
 * Start recording mode for title shortcut
 */
function startTitleRecording() {
  isTitleRecording = true;
  titleShortcutDisplay.classList.add('recording');
  titleShortcutDisplay.value = '';
  titleShortcutDisplay.placeholder = 'Press your desired shortcut...';
  titleHintText.textContent = 'Press your desired key combination now';
  titleHintText.classList.add('recording-mode');
}

/**
 * Stop recording mode for title shortcut
 */
function stopTitleRecording() {
  isTitleRecording = false;
  titleShortcutDisplay.classList.remove('recording');
  titleShortcutDisplay.placeholder = 'Click to record shortcut';
  titleHintText.textContent = 'Click the field above and press your desired key combination';
  titleHintText.classList.remove('recording-mode');
}

/**
 * Start recording mode for combined shortcut
 */
function startCombinedRecording() {
  isCombinedRecording = true;
  combinedShortcutDisplay.classList.add('recording');
  combinedShortcutDisplay.value = '';
  combinedShortcutDisplay.placeholder = 'Press your desired shortcut...';
  combinedHintText.textContent = 'Press your desired key combination now';
  combinedHintText.classList.add('recording-mode');
}

/**
 * Stop recording mode for combined shortcut
 */
function stopCombinedRecording() {
  isCombinedRecording = false;
  combinedShortcutDisplay.classList.remove('recording');
  combinedShortcutDisplay.placeholder = 'Click to record shortcut';
  combinedHintText.textContent = 'Click the field above and press your desired key combination';
  combinedHintText.classList.remove('recording-mode');
}

/**
 * Handle keyboard shortcut capture
 */
function captureShortcut(event) {
  if (!isRecording) return;

  event.preventDefault();
  event.stopPropagation();

  // Ignore if it's just a modifier key being pressed
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'];
  if (modifierKeys.includes(event.key)) {
    return;
  }

  // Extract the actual key from code to avoid special characters on Mac
  // When Option/Shift are pressed, event.key shows special chars (e.g., "Í" instead of "S")
  let actualKey = event.key;

  if (event.code.startsWith('Key')) {
    // Standard letter keys: KeyA -> A, KeyS -> S
    actualKey = event.code.replace('Key', '');
  } else if (event.code.startsWith('Digit')) {
    // Number keys: Digit1 -> 1, Digit2 -> 2
    actualKey = event.code.replace('Digit', '');
  } else if (event.code.startsWith('Arrow')) {
    // Arrow keys: ArrowUp -> Up, ArrowLeft -> Left
    actualKey = event.code.replace('Arrow', '');
  } else if (['Space', 'Enter', 'Tab', 'Escape', 'Backspace'].includes(event.code)) {
    // Special keys: use code as-is
    actualKey = event.code;
  }
  // For other keys (function keys, etc.), use event.key as-is

  // Create shortcut object
  const shortcut = {
    key: actualKey,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey
  };

  // Validate shortcut
  const validation = isValidShortcut(shortcut);
  if (!validation.valid) {
    showStatus(validation.reason, 'error');
    stopRecording();
    // Restore previous shortcut display
    if (currentShortcut) {
      shortcutDisplay.value = formatShortcutDisplay(currentShortcut);
    }
    return;
  }

  // Save shortcut
  saveShortcut(shortcut)
    .then(() => {
      currentShortcut = shortcut;
      shortcutDisplay.value = formatShortcutDisplay(shortcut);
      showStatus('Shortcut saved successfully!', 'success');
      stopRecording();
    })
    .catch((error) => {
      debugLog('error', 'Error saving shortcut:', error);
      showStatus('Failed to save shortcut. Please try again.', 'error');
      stopRecording();
    });
}

/**
 * Handle keyboard shortcut capture for title shortcut
 */
function captureTitleShortcut(event) {
  if (!isTitleRecording) return;

  event.preventDefault();
  event.stopPropagation();

  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'];
  if (modifierKeys.includes(event.key)) return;

  let actualKey = event.key;
  if (event.code.startsWith('Key')) {
    actualKey = event.code.replace('Key', '');
  } else if (event.code.startsWith('Digit')) {
    actualKey = event.code.replace('Digit', '');
  } else if (event.code.startsWith('Arrow')) {
    actualKey = event.code.replace('Arrow', '');
  } else if (['Space', 'Enter', 'Tab', 'Escape', 'Backspace'].includes(event.code)) {
    actualKey = event.code;
  }

  const shortcut = {
    key: actualKey,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey
  };

  const validation = isValidShortcut(shortcut);
  if (!validation.valid) {
    showStatus(validation.reason, 'error');
    stopTitleRecording();
    if (currentTitleShortcut) {
      titleShortcutDisplay.value = formatShortcutDisplay(currentTitleShortcut);
    }
    return;
  }

  saveTitleShortcut(shortcut)
    .then(() => {
      currentTitleShortcut = shortcut;
      titleShortcutDisplay.value = formatShortcutDisplay(shortcut);
      showStatus('Shortcut saved successfully!', 'success');
      stopTitleRecording();
    })
    .catch((error) => {
      debugLog('error', 'Error saving title shortcut:', error);
      showStatus('Failed to save shortcut. Please try again.', 'error');
      stopTitleRecording();
    });
}

/**
 * Handle keyboard shortcut capture for combined shortcut
 */
function captureCombinedShortcut(event) {
  if (!isCombinedRecording) return;

  event.preventDefault();
  event.stopPropagation();

  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'];
  if (modifierKeys.includes(event.key)) return;

  let actualKey = event.key;
  if (event.code.startsWith('Key')) {
    actualKey = event.code.replace('Key', '');
  } else if (event.code.startsWith('Digit')) {
    actualKey = event.code.replace('Digit', '');
  } else if (event.code.startsWith('Arrow')) {
    actualKey = event.code.replace('Arrow', '');
  } else if (['Space', 'Enter', 'Tab', 'Escape', 'Backspace'].includes(event.code)) {
    actualKey = event.code;
  }

  const shortcut = {
    key: actualKey,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey
  };

  const validation = isValidShortcut(shortcut);
  if (!validation.valid) {
    showStatus(validation.reason, 'error');
    stopCombinedRecording();
    if (currentCombinedShortcut) {
      combinedShortcutDisplay.value = formatShortcutDisplay(currentCombinedShortcut);
    }
    return;
  }

  saveCombinedShortcut(shortcut)
    .then(() => {
      currentCombinedShortcut = shortcut;
      combinedShortcutDisplay.value = formatShortcutDisplay(shortcut);
      showStatus('Shortcut saved successfully!', 'success');
      stopCombinedRecording();
    })
    .catch((error) => {
      debugLog('error', 'Error saving combined shortcut:', error);
      showStatus('Failed to save shortcut. Please try again.', 'error');
      stopCombinedRecording();
    });
}

/**
 * Reset to default shortcut
 */
function resetToDefault() {
  saveShortcut(DEFAULT_SHORTCUT)
    .then(() => {
      currentShortcut = DEFAULT_SHORTCUT;
      shortcutDisplay.value = formatShortcutDisplay(DEFAULT_SHORTCUT);
      showStatus('Reset to default shortcut', 'success');
    })
    .catch((error) => {
      debugLog('error', 'Error resetting shortcut:', error);
      showStatus('Failed to reset shortcut. Please try again.', 'error');
    });
}

/**
 * Reset title shortcut to default
 */
function resetTitleToDefault() {
  saveTitleShortcut(DEFAULT_TITLE_SHORTCUT)
    .then(() => {
      currentTitleShortcut = DEFAULT_TITLE_SHORTCUT;
      titleShortcutDisplay.value = formatShortcutDisplay(DEFAULT_TITLE_SHORTCUT);
      showStatus('Reset to default shortcut', 'success');
    })
    .catch((error) => {
      debugLog('error', 'Error resetting title shortcut:', error);
      showStatus('Failed to reset shortcut. Please try again.', 'error');
    });
}

/**
 * Update the combined section label to reflect the current open target
 */
function updateCombinedLabel(target) {
  const word = target === 'tab' ? 'Tab' : 'Window';
  combinedLabel.textContent = `Open Job Title in New ${word} & Select Description`;
}

/**
 * Reset combined shortcut to default
 */
function resetCombinedToDefault() {
  saveCombinedShortcut(DEFAULT_COMBINED_SHORTCUT)
    .then(() => {
      currentCombinedShortcut = DEFAULT_COMBINED_SHORTCUT;
      combinedShortcutDisplay.value = formatShortcutDisplay(DEFAULT_COMBINED_SHORTCUT);
      showStatus('Reset to default shortcut', 'success');
    })
    .catch((error) => {
      debugLog('error', 'Error resetting combined shortcut:', error);
      showStatus('Failed to reset shortcut. Please try again.', 'error');
    });
}

/**
 * Load current shortcut from storage
 */
async function loadCurrentShortcut() {
  try {
    currentShortcut = await getShortcut();
    shortcutDisplay.value = formatShortcutDisplay(currentShortcut);
  } catch (error) {
    debugLog('error', 'Error loading shortcut:', error);
    currentShortcut = DEFAULT_SHORTCUT;
    shortcutDisplay.value = formatShortcutDisplay(DEFAULT_SHORTCUT);
  }

  try {
    currentTitleShortcut = await getTitleShortcut();
    titleShortcutDisplay.value = formatShortcutDisplay(currentTitleShortcut);
  } catch (error) {
    debugLog('error', 'Error loading title shortcut:', error);
    currentTitleShortcut = DEFAULT_TITLE_SHORTCUT;
    titleShortcutDisplay.value = formatShortcutDisplay(DEFAULT_TITLE_SHORTCUT);
  }

  try {
    currentCombinedShortcut = await getCombinedShortcut();
    combinedShortcutDisplay.value = formatShortcutDisplay(currentCombinedShortcut);
  } catch (error) {
    debugLog('error', 'Error loading combined shortcut:', error);
    currentCombinedShortcut = DEFAULT_COMBINED_SHORTCUT;
    combinedShortcutDisplay.value = formatShortcutDisplay(DEFAULT_COMBINED_SHORTCUT);
  }

  try {
    const target = await getOpenTarget();
    const radio = document.querySelector(`input[name="open-target"][value="${target}"]`);
    if (radio) radio.checked = true;
    updateCombinedLabel(target);
  } catch (error) {
    debugLog('error', 'Error loading open target:', error);
  }
}

// Event listeners
shortcutDisplay.addEventListener('click', startRecording);
shortcutDisplay.addEventListener('focus', startRecording);
shortcutDisplay.addEventListener('keydown', captureShortcut);

titleShortcutDisplay.addEventListener('click', startTitleRecording);
titleShortcutDisplay.addEventListener('focus', startTitleRecording);
titleShortcutDisplay.addEventListener('keydown', captureTitleShortcut);

combinedShortcutDisplay.addEventListener('click', startCombinedRecording);
combinedShortcutDisplay.addEventListener('focus', startCombinedRecording);
combinedShortcutDisplay.addEventListener('keydown', captureCombinedShortcut);

// Allow Escape to cancel recording
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isRecording) {
      stopRecording();
      if (currentShortcut) {
        shortcutDisplay.value = formatShortcutDisplay(currentShortcut);
      }
      showStatus('Recording cancelled', 'info');
    }
    if (isTitleRecording) {
      stopTitleRecording();
      if (currentTitleShortcut) {
        titleShortcutDisplay.value = formatShortcutDisplay(currentTitleShortcut);
      }
      showStatus('Recording cancelled', 'info');
    }
    if (isCombinedRecording) {
      stopCombinedRecording();
      if (currentCombinedShortcut) {
        combinedShortcutDisplay.value = formatShortcutDisplay(currentCombinedShortcut);
      }
      showStatus('Recording cancelled', 'info');
    }
  }
});

clearBtn.addEventListener('click', resetToDefault);
titleClearBtn.addEventListener('click', resetTitleToDefault);
combinedClearBtn.addEventListener('click', resetCombinedToDefault);

openTargetRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const target = radio.value;
    updateCombinedLabel(target);
    saveOpenTarget(target).catch((err) => {
      debugLog('error', 'Error saving open target:', err);
    });
  });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displayModifierKeys();
  loadCurrentShortcut();
});
