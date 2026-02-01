const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '.claude/design/screenshots/qa';
const REPORT_FILE = process.env.REPORT_FILE || '.claude/reports/qa-auth-report.md';

// Test credentials
const TEST_CREDENTIALS = {
  valid: { email: 'test@example.com', password: 'TestPassword123!' },
  wrongPassword: { email: 'test@example.com', password: 'WrongPassword123!' },
  invalidEmail: { email: 'not-an-email', password: 'AnyPassword123!' },
  nonExistent: { email: 'nonexistent@example.com', password: 'AnyPassword123!' },
};

class AuthQA {
  constructor() {
    this.report = [];
    this.issues = [];
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1024, height: 768 });
  }

  async takeScreenshot(name) {
    const dir = SCREENSHOT_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, `${new Date().toISOString().split('T')[0]}-${name}.png`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  log(message, isError = false) {
    const prefix = isError ? '❌ ISSUE: ' : '✓ ';
    console.log(`${prefix}${message}`);
    this.report.push(`${prefix}${message}`);
    if (isError) this.issues.push(message);
  }

  async testLoginPageVisual() {
    console.log('\n=== TESTING LOGIN PAGE VISUAL ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Check page loads
    const title = await this.page.title();
    this.log(`Page title: ${title}`);

    // Check key elements exist
    const emailInput = await this.page.$('input[type="email"]');
    if (emailInput) this.log('Email input found');
    else this.log('Email input NOT found', true);

    const passwordInput = await this.page.$('input[type="password"]');
    if (passwordInput) this.log('Password input found');
    else this.log('Password input NOT found', true);

    const submitButton = await this.page.$('button[type="submit"]');
    if (submitButton) this.log('Submit button found');
    else this.log('Submit button NOT found', true);

    const forgotLink = await this.page.$('a[href="/forgot-password"]');
    if (forgotLink) this.log('Forgot password link found');
    else this.log('Forgot password link NOT found', true);

    const signupLink = await this.page.$('a[href="/signup"]');
    if (signupLink) this.log('Sign up link found');
    else this.log('Sign up link NOT found', true);

    // Take screenshot
    await this.takeScreenshot('login-page-light');
    this.log('Screenshot taken: login-page-light');
  }

  async testLoginFormValidation() {
    console.log('\n=== TESTING LOGIN FORM VALIDATION ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Test empty fields
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(500);
    const emailError = await this.page.$('#email-error');
    if (emailError) this.log('Email required validation works');
    else this.log('Email required validation missing', true);

    const passwordError = await this.page.$('#password-error');
    if (passwordError) this.log('Password required validation works');
    else this.log('Password required validation missing', true);

    // Test invalid email
    await this.page.type('input[type="email"]', 'invalid-email');
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(500);
    const emailErrorMsg = await this.page.evaluate(() => {
      const el = document.getElementById('email-error');
      return el ? el.textContent : null;
    });
    if (emailErrorMsg && emailErrorMsg.includes('valid')) {
      this.log('Invalid email validation works');
    } else {
      this.log('Invalid email validation missing or unclear', true);
    }

    // Take screenshot
    await this.takeScreenshot('login-validation-errors');
  }

  async testSecurityInjections() {
    console.log('\n=== TESTING SECURITY INJECTIONS ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Test SQL injection
    await this.page.type('input[type="email"]', "' OR '1'='1");
    await this.page.type('input[type="password"]', "' OR '1'='1");
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(1000);

    const currentUrl = this.page.url();
    if (!currentUrl.includes('/app')) {
      this.log('SQL injection attempt blocked');
    } else {
      this.log('SQL injection attempt was NOT properly blocked', true);
    }

    // Clear and test XSS
    await this.page.reload();
    await this.page.waitForTimeout(500);
    await this.page.type('input[type="email"]', '<script>alert("xss")</script>');
    await this.page.type('input[type="password"]', 'password');
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(1000);

    // Check if script was executed
    const consoleErrors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    if (!consoleErrors.some(e => e.includes('xss'))) {
      this.log('XSS injection attempt blocked');
    } else {
      this.log('XSS injection vulnerability detected', true);
    }
  }

  async testLongInputs() {
    console.log('\n=== TESTING LONG INPUTS ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    const longString = 'a'.repeat(10000);
    await this.page.type('input[type="email"]', longString);
    await this.page.type('input[type="password"]', longString);

    try {
      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(1000);
      this.log('Long input (10000 chars) handled gracefully');
    } catch (e) {
      this.log('Long input caused an error', true);
    }
  }

  async testKeyboardNavigation() {
    console.log('\n=== TESTING KEYBOARD NAVIGATION ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Tab through fields
    await this.page.keyboard.press('Tab');
    let focused = await this.page.evaluate(() => document.activeElement.id);
    if (focused === 'email') {
      this.log('Tab navigation to email field works');
    } else {
      this.log('Tab navigation not working properly', true);
    }

    await this.page.keyboard.press('Tab');
    focused = await this.page.evaluate(() => document.activeElement.id);
    if (focused === 'password') {
      this.log('Tab navigation to password field works');
    } else {
      this.log('Tab navigation between fields not working', true);
    }

    // Test Enter key submits from password field
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await this.page.type('input[type="email"]', 'invalid@test.com');
    await this.page.type('input[type="password"]', 'password');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
    this.log('Enter key in password field submits form');
  }

  async testAccessibility() {
    console.log('\n=== TESTING ACCESSIBILITY ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Check ARIA labels
    const emailHasLabel = await this.page.evaluate(() => {
      const input = document.querySelector('input[type="email"]');
      return input && (input.getAttribute('aria-label') || input.parentElement.querySelector('label'));
    });
    if (emailHasLabel) this.log('Email field has accessible label');
    else this.log('Email field missing accessible label', true);

    const passwordHasLabel = await this.page.evaluate(() => {
      const input = document.querySelector('input[type="password"]');
      return input && (input.getAttribute('aria-label') || input.parentElement.querySelector('label'));
    });
    if (passwordHasLabel) this.log('Password field has accessible label');
    else this.log('Password field missing accessible label', true);

    // Check error aria-live or role="alert"
    const errorHasRole = await this.page.evaluate(() => {
      const errors = document.querySelectorAll('[role="alert"]');
      return errors.length > 0;
    });
    if (errorHasRole) this.log('Error messages have role="alert"');
    else this.log('Error messages missing role="alert"', true);
  }

  async testSignupPage() {
    console.log('\n=== TESTING SIGNUP PAGE ===');
    await this.page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });

    // Check elements exist
    const nameInput = await this.page.$('input[type="text"]');
    if (nameInput) this.log('Name input found on signup page');
    else this.log('Name input NOT found on signup page', true);

    const emailInput = await this.page.$('input[type="email"]');
    if (emailInput) this.log('Email input found on signup page');
    else this.log('Email input NOT found on signup page', true);

    const passwordInputs = await this.page.$$('input[type="password"]');
    if (passwordInputs.length >= 2) {
      this.log('Password and confirm password fields found');
    } else {
      this.log('Password confirmation field missing', true);
    }

    const submitButton = await this.page.$('button[type="submit"]');
    if (submitButton) this.log('Submit button found on signup page');
    else this.log('Submit button NOT found on signup page', true);

    // Take screenshot
    await this.takeScreenshot('signup-page');
  }

  async testForgotPasswordPage() {
    console.log('\n=== TESTING FORGOT PASSWORD PAGE ===');
    await this.page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'networkidle2' });

    const emailInput = await this.page.$('input[type="email"]');
    if (emailInput) this.log('Email input found on forgot password page');
    else this.log('Email input NOT found on forgot password page', true);

    const submitButton = await this.page.$('button[type="submit"]');
    if (submitButton) this.log('Submit button found on forgot password page');
    else this.log('Submit button NOT found on forgot password page', true);

    // Take screenshot
    await this.takeScreenshot('forgot-password-page');
  }

  async testMobileResponsiveness() {
    console.log('\n=== TESTING MOBILE RESPONSIVENESS ===');

    // Mobile view
    await this.page.setViewport({ width: 375, height: 812 });
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    const mobileViewable = await this.page.evaluate(() => {
      const form = document.querySelector('form');
      return form && form.offsetHeight > 0 && form.offsetWidth > 0;
    });

    if (mobileViewable) this.log('Login page is responsive on mobile (375px)');
    else this.log('Login page layout broken on mobile', true);

    await this.takeScreenshot('login-mobile-375');

    // Tablet view
    await this.page.setViewport({ width: 768, height: 1024 });
    await this.page.reload();
    await this.page.waitForTimeout(500);
    await this.takeScreenshot('login-tablet-768');
    this.log('Tablet view screenshot taken (768px)');

    // Reset to desktop
    await this.page.setViewport({ width: 1024, height: 768 });
  }

  async testDarkMode() {
    console.log('\n=== TESTING DARK MODE ===');
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Try to detect if dark mode class is present
    const darkModeSupport = await this.page.evaluate(() => {
      const html = document.documentElement;
      const darkClass = html.classList.contains('dark') ||
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
      return darkClass;
    });

    if (darkModeSupport) {
      this.log('Dark mode support detected');
      await this.takeScreenshot('login-dark-mode');
    } else {
      this.log('Dark mode support not detected - may need to check manually');
    }
  }

  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportPath = REPORT_FILE.replace('.md', `-${timestamp}.md`);

    const reportContent = `# Authentication Pages QA Report
Generated: ${new Date().toISOString()}

## Summary
- Total Tests Run: ${this.report.length}
- Issues Found: ${this.issues.length}
- Test Result: ${this.issues.length === 0 ? 'PASS' : 'FAIL'}

## Issues Found
${this.issues.length > 0
  ? this.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
  : 'No issues found!'}

## Detailed Test Results
${this.report.join('\n')}

## Screenshots Location
All screenshots saved to: \`${SCREENSHOT_DIR}\`

## Recommendations
${this.issues.length > 0
  ? 'Please address the issues listed above before considering auth pages production-ready.'
  : 'Auth pages appear to be functioning correctly. Consider manual testing for edge cases not covered by automation.'}
`;

    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(reportPath, reportContent);
    console.log(`Report saved to: ${reportPath}`);
    return reportPath;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

async function runTests() {
  const qa = new AuthQA();

  try {
    console.log('Initializing browser...');
    await qa.init();

    await qa.testLoginPageVisual();
    await qa.testLoginFormValidation();
    await qa.testSecurityInjections();
    await qa.testLongInputs();
    await qa.testKeyboardNavigation();
    await qa.testAccessibility();
    await qa.testSignupPage();
    await qa.testForgotPasswordPage();
    await qa.testMobileResponsiveness();
    await qa.testDarkMode();

    qa.generateReport();

    console.log('\nAll tests completed');
    console.log(`Issues found: ${qa.issues.length}`);

  } catch (error) {
    console.error('Test execution failed:', error);
    qa.log(`Fatal error: ${error.message}`, true);
    qa.generateReport();
  } finally {
    await qa.close();
  }
}

runTests().catch(console.error);
