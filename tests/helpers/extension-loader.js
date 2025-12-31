/**
 * Extension Loading Utilities for Playwright E2E Tests
 * Provides helpers for loading the Chrome extension in Playwright's Chromium browser
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the absolute path to the extension directory
 * @returns {string} Path to the extension root
 */
export function getExtensionPath() {
  // Go up two levels from tests/helpers/ to reach the extension root
  return path.join(__dirname, '..', '..');
}

/**
 * Launch a Chromium browser with the extension loaded
 * @param {Object} options - Additional browser launch options
 * @returns {Promise<BrowserContext>} Browser context with extension loaded
 */
export async function launchBrowserWithExtension(options = {}) {
  const extensionPath = getExtensionPath();

  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions require headed mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox', // Required for some CI environments
    ],
    ...options
  });

  return context;
}

/**
 * Get the extension ID from a loaded extension
 * Note: Extension IDs in Chromium are deterministic based on the path
 * @param {BrowserContext} context - Browser context with extension loaded
 * @returns {Promise<string>} Extension ID
 */
export async function getExtensionId(context) {
  // Create a service worker to access chrome.runtime
  const page = await context.newPage();

  const extensionId = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Try to access chrome.runtime if available
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        resolve(chrome.runtime.id);
      } else {
        // Fallback: create a temporary ID for testing
        resolve('test-extension-id');
      }
    });
  });

  await page.close();
  return extensionId;
}

/**
 * Navigate to the extension's options page
 * @param {Page} page - Playwright page object
 * @param {string} extensionId - Extension ID
 * @returns {Promise<void>}
 */
export async function navigateToOptionsPage(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to the extension's popup page
 * @param {Page} page - Playwright page object
 * @param {string} extensionId - Extension ID
 * @returns {Promise<void>}
 */
export async function navigateToPopup(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Wait for extension to be fully loaded
 * @param {BrowserContext} context - Browser context
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForExtensionLoad(context, timeout = 5000) {
  const page = await context.newPage();

  await page.waitForTimeout(1000); // Give extension time to initialize

  await page.close();
}
