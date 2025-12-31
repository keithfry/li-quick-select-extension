import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: false, // Extension tests may conflict with each other

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI - extension tests need isolation */
  workers: process.env.CI ? 1 : 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list']
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Set default timeout to 10 seconds */
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  /* Test timeout */
  timeout: 10000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'extension-loaded',
      testMatch: /.*e2e.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Extension tests will use custom browser launch in test setup
      },
    },

    {
      name: 'standalone',
      testMatch: /.*unit.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'content-script',
      testMatch: /.*integration.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
