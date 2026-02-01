const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const screenshotDir = 'C:/Users/NewAdmin/Desktop/PROJECTS/myBrain/.claude/design/screenshots/verify/feedback';

  try {
    console.log('Step 1: Opening app...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '1-app-loaded.png') });
    console.log('✅ Screenshot 1: App loaded');

    console.log('\nStep 2: Logging in...');
    // Check if already logged in by looking for dashboard elements
    const isLoggedIn = await page.locator('[data-testid="dashboard"], .dashboard, main').count() > 0;

    if (!isLoggedIn) {
      // Fill login form
      await page.fill('input[type="email"]', 'claude@test.com');
      await page.fill('input[type="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(screenshotDir, '2-logged-in.png') });
    console.log('✅ Screenshot 2: Logged in');

    console.log('\nStep 3: Looking for FeedbackWidget...');
    // Look for the feedback widget button
    const feedbackWidget = page.locator('[data-feedback-widget], button:has-text("Feedback"), button:has-text("Report")').first();
    const widgetVisible = await feedbackWidget.isVisible().catch(() => false);

    if (widgetVisible) {
      console.log('✅ FeedbackWidget found and visible');
      await page.screenshot({ path: path.join(screenshotDir, '3-widget-visible.png') });
    } else {
      console.log('❌ FeedbackWidget NOT visible - checking page elements...');
      const bodyHTML = await page.locator('body').innerHTML();
      console.log('Page has buttons:', await page.locator('button').count());
      await page.screenshot({ path: path.join(screenshotDir, '3-widget-NOT-visible.png') });
    }

    console.log('\nStep 4: Opening feedback modal...');
    if (widgetVisible) {
      await feedbackWidget.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '4-modal-opened.png') });
      console.log('✅ Screenshot 4: Modal opened');

      console.log('\nStep 5: Filling feedback form...');
      // Select Bug Report
      await page.click('button:has-text("Bug Report"), input[value="bug"]');
      await page.waitForTimeout(200);

      // Fill title
      await page.fill('input[placeholder*="title"], input[name="title"]', 'Test bug report from verification');

      // Fill description
      await page.fill('textarea[placeholder*="description"], textarea[name="description"]', 'This is a test submission to verify the feedback system works');

      await page.screenshot({ path: path.join(screenshotDir, '5-form-filled.png') });
      console.log('✅ Screenshot 5: Form filled');

      console.log('\nStep 6: Submitting feedback...');
      await page.click('button:has-text("Submit"), button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '6-submitted.png') });
      console.log('✅ Screenshot 6: Submitted');
    }

    console.log('\nStep 7: Checking sidebar for "Report Issue"...');
    // Try to open sidebar if it exists
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    const menuExists = await menuButton.isVisible().catch(() => false);
    if (menuExists) {
      await menuButton.click();
      await page.waitForTimeout(500);
    }

    const reportIssueLink = await page.locator('a:has-text("Report Issue"), button:has-text("Report Issue")').isVisible().catch(() => false);
    await page.screenshot({ path: path.join(screenshotDir, '7-sidebar-check.png') });
    console.log(reportIssueLink ? '✅ "Report Issue" found in sidebar' : '❌ "Report Issue" NOT found in sidebar');

    console.log('\nStep 8: Checking dark mode...');
    // Try to toggle dark mode
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("🌙"), button:has-text("☀")').first();
    const themeToggleExists = await themeToggle.isVisible().catch(() => false);
    if (themeToggleExists) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '8-dark-mode.png') });
      console.log('✅ Screenshot 8: Dark mode toggled');
    } else {
      console.log('⚠️ Theme toggle not found');
    }

    console.log('\n✅ Verification complete! Screenshots saved to:');
    console.log(screenshotDir);

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error.png') });
  } finally {
    await browser.close();
  }
})();
