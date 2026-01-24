/**
 * Global Setup for E2E Tests
 *
 * This runs ONCE before all tests. It:
 * 1. Waits for servers to be ready (using wait-on instead of sleep)
 * 2. Creates a unique test user for this test run
 * 3. Logs in and saves auth state for tests to reuse
 *
 * Why unique users per run:
 * - Prevents test pollution between runs
 * - Each run gets a clean slate
 * - No conflicts if multiple people run tests
 */
import { chromium } from '@playwright/test';
import waitOn from 'wait-on';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configuration
const API_URL = process.env.E2E_API_URL || 'http://localhost:5000';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

// Generate unique test user for this run
const TEST_RUN_ID = Date.now();
const TEST_USER = {
  email: `e2e-test-${TEST_RUN_ID}@mybrain.test`,
  password: 'E2ETestPassword123!',
  name: `E2E Test User ${TEST_RUN_ID}`,
};

// Path to store auth state
const AUTH_STATE_PATH = path.join(__dirname, '.auth-state.json');
// Path to store test run info for cleanup
const TEST_RUN_INFO_PATH = path.join(__dirname, '.test-run-info.json');

export default async function globalSetup() {
  console.log('\n🚀 E2E Global Setup Starting...\n');

  // Step 1: Wait for servers to be ready
  console.log('⏳ Waiting for servers...');
  try {
    await waitOn({
      resources: [
        `${API_URL}/health`, // Backend health check
        BASE_URL, // Frontend
      ],
      timeout: 60000, // 60 second timeout
      interval: 1000, // Check every second
      validateStatus: (status) => status >= 200 && status < 400,
    });
    console.log('✅ Servers are ready!\n');
  } catch (error) {
    console.error('❌ Servers not ready. Make sure both servers are running:');
    console.error('   Backend: cd myBrain-api && npm run dev');
    console.error('   Frontend: cd myBrain-web && npm run dev');
    throw new Error(`Servers not ready: ${error.message}`);
  }

  // Step 2: Create unique test user via API
  console.log(`📝 Creating test user: ${TEST_USER.email}`);
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // If user already exists (from failed previous run), that's ok
      if (error.code !== 'USER_EXISTS') {
        throw new Error(`Signup failed: ${JSON.stringify(error)}`);
      }
      console.log('   User already exists (from previous run), continuing...');
    } else {
      console.log('✅ Test user created!\n');
    }
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    throw error;
  }

  // Step 3: Login via browser to get auth cookies
  console.log('🔐 Logging in to save auth state...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

    // Submit and wait for navigation
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    console.log('✅ Login successful!\n');

    // Save auth state (cookies, localStorage, etc.)
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`💾 Auth state saved to ${AUTH_STATE_PATH}\n`);
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    // Take screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, 'login-failure.png') });
    throw error;
  } finally {
    await browser.close();
  }

  // Step 4: Save test run info for cleanup
  fs.writeFileSync(
    TEST_RUN_INFO_PATH,
    JSON.stringify({
      runId: TEST_RUN_ID,
      user: TEST_USER,
      apiUrl: API_URL,
      createdAt: new Date().toISOString(),
    })
  );

  console.log('✅ Global setup complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Test User: ${TEST_USER.email}`);
  console.log(`Run ID: ${TEST_RUN_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
