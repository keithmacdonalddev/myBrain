/**
 * Global Teardown for E2E Tests
 *
 * This runs ONCE after all tests complete. It:
 * 1. Reads test run info from global setup
 * 2. Deletes the test user via API (cascades to all their data)
 * 3. Cleans up local files
 *
 * This ensures complete data isolation between test runs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_RUN_INFO_PATH = path.join(__dirname, '.test-run-info.json');
const AUTH_STATE_PATH = path.join(__dirname, '.auth-state.json');

export default async function globalTeardown() {
  console.log('\n🧹 E2E Global Teardown Starting...\n');

  // Step 1: Read test run info
  let testRunInfo;
  try {
    if (!fs.existsSync(TEST_RUN_INFO_PATH)) {
      console.log('⚠️ No test run info found, skipping cleanup');
      return;
    }
    testRunInfo = JSON.parse(fs.readFileSync(TEST_RUN_INFO_PATH, 'utf-8'));
  } catch (error) {
    console.error('❌ Failed to read test run info:', error.message);
    return;
  }

  console.log(`📋 Test Run: ${testRunInfo.runId}`);
  console.log(`👤 User: ${testRunInfo.user.email}\n`);

  // Step 2: Delete test user via API
  // This uses a special cleanup endpoint that requires the user's credentials
  console.log('🗑️ Deleting test user and all their data...');
  try {
    // First, login to get auth token
    const loginResponse = await fetch(`${testRunInfo.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testRunInfo.user.email,
        password: testRunInfo.user.password,
      }),
    });

    if (!loginResponse.ok) {
      // User might already be deleted or doesn't exist
      console.log('   User not found or already deleted, skipping...');
    } else {
      // Get the auth cookie from response
      const cookies = loginResponse.headers.get('set-cookie');

      // Delete the user account (this should cascade delete all user data)
      const deleteResponse = await fetch(`${testRunInfo.apiUrl}/users/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies || '',
        },
      });

      if (deleteResponse.ok) {
        console.log('✅ Test user deleted!\n');
      } else {
        // If delete endpoint doesn't exist, log for manual cleanup
        const error = await deleteResponse.json().catch(() => ({}));
        console.log('⚠️ Could not auto-delete user:', error.message || deleteResponse.status);
        console.log('   Manual cleanup may be needed for:', testRunInfo.user.email);
      }
    }
  } catch (error) {
    console.error('⚠️ Cleanup API call failed:', error.message);
    console.log('   Manual cleanup may be needed for:', testRunInfo.user.email);
  }

  // Step 3: Clean up local files
  console.log('🧹 Cleaning up local files...');
  try {
    if (fs.existsSync(AUTH_STATE_PATH)) {
      fs.unlinkSync(AUTH_STATE_PATH);
      console.log('   Deleted auth state file');
    }
    if (fs.existsSync(TEST_RUN_INFO_PATH)) {
      fs.unlinkSync(TEST_RUN_INFO_PATH);
      console.log('   Deleted test run info file');
    }
    // Clean up any failure screenshots
    const loginFailureScreenshot = path.join(__dirname, 'login-failure.png');
    if (fs.existsSync(loginFailureScreenshot)) {
      fs.unlinkSync(loginFailureScreenshot);
    }
  } catch (error) {
    console.error('⚠️ File cleanup failed:', error.message);
  }

  console.log('\n✅ Global teardown complete!\n');
}
