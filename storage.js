// Storage utilities for keyboard shortcut management

const DEFAULT_SHORTCUT = {
  key: 'S',
  code: 'KeyS',
  altKey: true,
  ctrlKey: false,
  shiftKey: true,
  metaKey: false
};

// Reserved browser shortcuts that should be blocked
const BLOCKED_SHORTCUTS = [
  { ctrlKey: true, key: 'T' },  // New tab
  { ctrlKey: true, key: 't' },
  { ctrlKey: true, key: 'W' },  // Close tab
  { ctrlKey: true, key: 'w' },
  { ctrlKey: true, key: 'N' },  // New window
  { ctrlKey: true, key: 'n' },
  { ctrlKey: true, key: 'R' },  // Reload
  { ctrlKey: true, key: 'r' },
  { ctrlKey: true, key: 'Q' },  // Quit
  { ctrlKey: true, key: 'q' },
  { metaKey: true, key: ' ' },  // Spotlight (Mac)
  { ctrlKey: true, shiftKey: true, key: 'T' },  // Reopen closed tab
  { ctrlKey: true, shiftKey: true, key: 't' },
  { ctrlKey: true, key: 'Tab' },  // Switch tabs
];

/**
 * Get the keyboard shortcut from storage
 * @returns {Promise<Object>} The keyboard shortcut object
 */
async function getShortcut() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['keyboardShortcut'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Error loading shortcut, using default:', chrome.runtime.lastError);
        resolve(DEFAULT_SHORTCUT);
      } else {
        resolve(result.keyboardShortcut || DEFAULT_SHORTCUT);
      }
    });
  });
}

/**
 * Save the keyboard shortcut to storage
 * @param {Object} shortcut - The keyboard shortcut object
 * @returns {Promise<void>}
 */
async function saveShortcut(shortcut) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ keyboardShortcut: shortcut }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Check if two shortcuts match
 * @param {Object} shortcut1
 * @param {Object} shortcut2
 * @returns {boolean}
 */
function shortcutsMatch(shortcut1, shortcut2) {
  // Treat undefined as false for modifier keys
  const s1Alt = shortcut1.altKey || false;
  const s1Ctrl = shortcut1.ctrlKey || false;
  const s1Shift = shortcut1.shiftKey || false;
  const s1Meta = shortcut1.metaKey || false;

  const s2Alt = shortcut2.altKey || false;
  const s2Ctrl = shortcut2.ctrlKey || false;
  const s2Shift = shortcut2.shiftKey || false;
  const s2Meta = shortcut2.metaKey || false;

  return (
    s1Alt === s2Alt &&
    s1Ctrl === s2Ctrl &&
    s1Shift === s2Shift &&
    s1Meta === s2Meta &&
    (shortcut1.key.toLowerCase() === shortcut2.key.toLowerCase() ||
     shortcut1.code === shortcut2.code)
  );
}

/**
 * Validate a keyboard shortcut
 * @param {Object} shortcut - The keyboard shortcut to validate
 * @returns {Object} { valid: boolean, reason: string }
 */
function isValidShortcut(shortcut) {
  // Modifier keys that should not be used as the main key
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS', 'Option', 'Command'];

  // Rule 1: Key must not be a modifier itself
  if (modifierKeys.includes(shortcut.key)) {
    return { valid: false, reason: 'Cannot use modifier keys alone' };
  }

  // Rule 2: Must have at least one modifier OR be a function key
  const hasModifier = shortcut.altKey || shortcut.ctrlKey ||
                      shortcut.shiftKey || shortcut.metaKey;
  const isFunctionKey = /^F([1-9]|1[0-2])$/.test(shortcut.key);

  if (!hasModifier && !isFunctionKey) {
    return { valid: false, reason: 'At least one modifier key required (Ctrl, Alt, Shift, or Cmd)' };
  }

  // Rule 3: Check against blocked browser shortcuts
  for (const blocked of BLOCKED_SHORTCUTS) {
    if (shortcutsMatch(shortcut, blocked)) {
      return { valid: false, reason: 'This shortcut is reserved by the browser' };
    }
  }

  return { valid: true, reason: '' };
}
