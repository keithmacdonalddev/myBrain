// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for myBrain E2E tests
 *
 * Run locally: npm run test:e2e
 * Run in CI: npm run test:e2e:ci
 *
 * Tests run against local dev servers by default.
 * CI will build and serve the production build.
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially to avoid race conditions with shared state
  fullyParallel: false,
  workers: 1,

  // Fail fast in CI, allow retries for flaky tests locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // Reporter configuration
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  // Global setup and teardown for test isolation
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    // Capture trace on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (helpful for debugging)
    video: 'on-first-retry',
  },

  // Test timeout (per test)
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Configure projects for different browsers/viewports
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Mobile tests - uncomment when needed
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
  ],

  // Web server configuration
  // In CI, we'll start servers separately. Locally, use this for convenience.
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
