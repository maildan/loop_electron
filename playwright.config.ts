import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Electron end-to-end testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3002',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'electron',
      use: { 
        ...devices['Desktop Chrome'],
        // Electron-specific configuration
      },
      testMatch: '**/*.electron.spec.ts',
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Test renderer process in browser
      },
      testMatch: '**/*.browser.spec.ts',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'bash scripts/clean-cache.sh --nextjs && next dev -p 3002',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
