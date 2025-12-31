/**
 * Chrome API Mocks for Playwright Tests
 * Provides mock implementations of chrome.storage and chrome.runtime APIs
 */

export class ChromeStorageMock {
  constructor() {
    this.data = {};
    this.listeners = [];
  }

  get(keys, callback) {
    const result = {};
    const keyArray = Array.isArray(keys) ? keys : [keys];

    keyArray.forEach(key => {
      if (this.data[key] !== undefined) {
        result[key] = this.data[key];
      }
    });

    // Simulate async callback
    if (callback) {
      setTimeout(() => callback(result), 0);
    }

    return Promise.resolve(result);
  }

  set(items, callback) {
    const changes = {};

    Object.keys(items).forEach(key => {
      const oldValue = this.data[key];
      this.data[key] = items[key];
      changes[key] = { oldValue, newValue: items[key] };
    });

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(changes, 'local');
    });

    // Simulate async callback
    if (callback) {
      setTimeout(callback, 0);
    }

    return Promise.resolve();
  }

  clear(callback) {
    this.data = {};
    if (callback) {
      setTimeout(callback, 0);
    }
    return Promise.resolve();
  }

  remove(keys, callback) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => {
      delete this.data[key];
    });
    if (callback) {
      setTimeout(callback, 0);
    }
    return Promise.resolve();
  }

  onChanged = {
    addListener: (listener) => {
      this.listeners.push(listener);
    },
    removeListener: (listener) => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  };
}

export class ChromeRuntimeMock {
  constructor() {
    this.optionsPageOpened = false;
    this.lastError = null;
  }

  openOptionsPage() {
    this.optionsPageOpened = true;
    return Promise.resolve();
  }

  getURL(path) {
    return `chrome-extension://mock-extension-id/${path}`;
  }

  get id() {
    return 'mock-extension-id';
  }
}

/**
 * Inject Chrome API mocks into a Playwright page
 * @param {Page} page - Playwright page object
 */
export async function injectChromeMocks(page) {
  await page.addInitScript(() => {
    class ChromeStorageMock {
      constructor() {
        this.data = {};
        this.listeners = [];
      }

      get(keys, callback) {
        const result = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];

        keyArray.forEach(key => {
          if (this.data[key] !== undefined) {
            result[key] = this.data[key];
          }
        });

        if (callback) {
          setTimeout(() => callback(result), 0);
        }
      }

      set(items, callback) {
        const changes = {};

        Object.keys(items).forEach(key => {
          const oldValue = this.data[key];
          this.data[key] = items[key];
          changes[key] = { oldValue, newValue: items[key] };
        });

        this.listeners.forEach(listener => {
          listener(changes, 'local');
        });

        if (callback) {
          setTimeout(callback, 0);
        }
      }

      onChanged = {
        addListener: (listener) => {
          this.listeners.push(listener);
        }
      };
    }

    class ChromeRuntimeMock {
      constructor() {
        this.optionsPageOpened = false;
        this.lastError = null;
      }

      openOptionsPage() {
        this.optionsPageOpened = true;
      }

      getURL(path) {
        return `chrome-extension://mock-extension-id/${path}`;
      }
    }

    const storageMock = new ChromeStorageMock();
    const runtimeMock = new ChromeRuntimeMock();

    window.chrome = {
      storage: {
        local: storageMock,
        onChanged: storageMock.onChanged
      },
      runtime: runtimeMock
    };
  });
}

/**
 * Set storage data in Chrome mock
 * @param {Page} page - Playwright page object
 * @param {Object} data - Data to set
 */
export async function setMockStorage(page, data) {
  await page.evaluate((storageData) => {
    Object.assign(window.chrome.storage.local.data, storageData);
  }, data);
}

/**
 * Get storage data from Chrome mock
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Storage data
 */
export async function getMockStorage(page) {
  return await page.evaluate(() => {
    return window.chrome.storage.local.data;
  });
}

/**
 * Clear storage data in Chrome mock
 * @param {Page} page - Playwright page object
 */
export async function clearMockStorage(page) {
  await page.evaluate(() => {
    window.chrome.storage.local.data = {};
  });
}
