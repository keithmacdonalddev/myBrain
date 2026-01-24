/**
 * Shared test fixtures for E2E tests
 *
 * Provides:
 * - authenticatedPage: A page that's already logged in
 * - testUser: Info about the test user for this run
 */
import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTH_STATE_PATH = path.join(__dirname, '.auth-state.json');
const TEST_RUN_INFO_PATH = path.join(__dirname, '.test-run-info.json');

/**
 * Extended test fixture with authentication
 */
export const test = base.extend({
  // Authenticated page - starts logged in
  authenticatedPage: async ({ browser }, use) => {
    // Create context with saved auth state
    const context = await browser.newContext({
      storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();

    await use(page);

    await context.close();
  },

  // Test user info for this run
  testUser: async ({}, use) => {
    const info = JSON.parse(fs.readFileSync(TEST_RUN_INFO_PATH, 'utf-8'));
    await use(info.user);
  },
});

export { expect } from '@playwright/test';
