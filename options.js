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

// Detect platform
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// DOM elements
const shortcutDisplay = document.getElementById('shortcut-display');
const clearBtn = document.getElementById('clear-btn');
const hintText = document.getElementById('hint-text');
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
}

// Event listeners
shortcutDisplay.addEventListener('click', startRecording);
shortcutDisplay.addEventListener('focus', startRecording);
shortcutDisplay.addEventListener('keydown', captureShortcut);

// Allow Escape to cancel recording
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isRecording) {
    stopRecording();
    if (currentShortcut) {
      shortcutDisplay.value = formatShortcutDisplay(currentShortcut);
    }
    showStatus('Recording cancelled', 'info');
  }
});

clearBtn.addEventListener('click', resetToDefault);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displayModifierKeys();
  loadCurrentShortcut();
});
