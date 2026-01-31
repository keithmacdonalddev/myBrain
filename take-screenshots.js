const path = require('path');
const fs = require('fs');

// Let Node.js find the module naturally
const { chromium } = require('playwright-core');

const SCREENSHOT_DIR = path.resolve(__dirname, '.claude/design/screenshots/phase5-visual-verify');
const TEST_EMAIL = 'claude-test-user@mybrain.test';
const TEST_PASSWORD = 'ClaudeTest123';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const pages = [
  { name: '01-dashboard-v2', path: '/app?v2=true' },
  { name: '02-today', path: '/app/today' },
  { name: '03-tasks', path: '/app/tasks' },
  { name: '04-notes', path: '/app/notes' },
  { name: '05-projects', path: '/app/projects' },
  { name: '06-calendar', path: '/app/calendar' },
  { name: '07-settings', path: '/app/settings' },
  { name: '08-profile', path: '/app/profile' },
  { name: '09-inbox', path: '/app/inbox' },
];

async function takeScreenshots() {
  let browser;
  try {
    console.log('Launching Chromium...');
    browser = await chromium.launch();
    const context = await browser.newContext({
      colorScheme: 'light'
    });
    const page = await context.newPage();

    console.log('[Step 1] Navigating to login page...');
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });
    
    console.log('[Step 2] Logging in with test credentials...');
    try {
      await page.fill('input[type="email"]', TEST_EMAIL, { timeout: 5000 });
      await page.fill('input[type="password"]', TEST_PASSWORD, { timeout: 5000 });
      
      // Click sign in button
      await page.click('button[type="submit"]', { timeout: 5000 }).catch(async () => {
        // Try alternative button selectors
        try {
          await page.click('button:has-text("Sign In")');
        } catch {
          const buttons = await page.$$('button');
          if (buttons.length > 0) {
            await buttons[0].click();
          }
        }
      });
    } catch (err) {
      console.log('  Warning: Login interaction failed, continuing...');
    }
    
    console.log('[Step 3] Waiting for dashboard...');
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      console.log('  Navigation timeout, continuing...');
    }
    await page.waitForTimeout(2000);
    
    console.log('\n=== Taking Screenshots of All Phase 5 Pages ===\n');
    
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      try {
        console.log(`[${i + 1}/${pages.length}] ${pageInfo.name}`);
        console.log(`  URL: http://localhost:5173${pageInfo.path}`);
        await page.goto(`http://localhost:5173${pageInfo.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);
        
        const filename = `${pageInfo.name}-light.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        
        await page.screenshot({ path: filepath, fullPage: true });
        
        const stats = fs.statSync(filepath);
        console.log(`  ✓ Saved (${Math.round(stats.size / 1024)}KB)\n`);
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}\n`);
      }
    }
    
    await context.close();
    console.log('\n=== Phase 5 Screenshot Verification Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    
    // List created files
    const files = fs.readdirSync(SCREENSHOT_DIR);
    console.log(`\nCreated ${files.length} screenshots:`);
    files.forEach(f => {
      const stat = fs.statSync(path.join(SCREENSHOT_DIR, f));
      if (stat.isFile()) {
        console.log(`  - ${f} (${Math.round(stat.size / 1024)}KB)`);
      }
    });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshots();
