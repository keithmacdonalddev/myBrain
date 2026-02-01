const { chromium } = require('playwright');

const API_URL = 'http://localhost:5000';
const BASE_URL = 'http://localhost:5173';

// Create and login as test user
(async () => {
  const TEST_USER = {
    email: `screenshot-test-${Date.now()}@mybrain.test`,
    password: 'ScreenshotTest123!',
    name: 'Screenshot Test User',
  };

  // Step 1: Create user via API
  console.log('Creating test user:', TEST_USER.email);
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
      console.log('Registration response:', error);
      if (error.code !== 'USER_EXISTS') {
        throw new Error(`Signup failed: ${JSON.stringify(error)}`);
      }
    }
  } catch (err) {
    console.error('Registration error:', err.message);
    // Continue anyway - might be CORS or network issue
  }

  // Step 2: Login via browser
  console.log('Logging in...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to app
  await page.waitForURL('**/app', { timeout: 10000 });
  await page.waitForTimeout(2000); // Wait for UI to settle

  // Take screenshot
  await page.screenshot({ path: '../.claude/design/screenshots/temp/feedback-logged-in.png' });
  console.log('Screenshot saved!');

  await browser.close();
})();
