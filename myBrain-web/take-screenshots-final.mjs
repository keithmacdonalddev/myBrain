import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, '../.claude/design/screenshots/phase5-visual-verify');
const TEST_EMAIL = 'claude-test-user@mybrain.test';
const TEST_PASSWORD = 'ClaudeTest123';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Clean up old light-mode screenshots
const files = fs.readdirSync(SCREENSHOT_DIR);
files.forEach(f => {
  if (f.endsWith('-light.png')) {
    fs.unlinkSync(path.join(SCREENSHOT_DIR, f));
  }
});
console.log('Cleaned up old light-mode screenshots\n');

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
    console.log('Launching Chromium with light color scheme...');
    browser = await chromium.launch();
    
    // Create context with light mode from the start
    const context = await browser.newContext({
      colorScheme: 'light'
    });
    const page = await context.newPage();
    
    // Set viewport to standard desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for page to fully load and settle
    await page.waitForTimeout(2000);
    
    // Check if we're on the dashboard
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/login')) {
      console.log('WARNING: Still on login page - authentication may not be working');
      console.log('Taking screenshots anyway (will show login page for protected routes)\n');
    } else {
      console.log('Successfully loaded authenticated page\n');
    }

    console.log('=== Taking Screenshots of All Phase 5 Pages (LIGHT MODE) ===\n');
    
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      try {
        console.log(`[${i + 1}/${pages.length}] ${pageInfo.name}`);
        const fullUrl = `http://localhost:5173${pageInfo.path}`;
        console.log(`  URL: ${fullUrl}`);
        
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for content to load
        await page.waitForTimeout(1500);
        
        const filename = `${pageInfo.name}-light.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        
        // Take full-page screenshot
        await page.screenshot({ path: filepath, fullPage: true });
        
        const stats = fs.statSync(filepath);
        const sizeKB = Math.round(stats.size / 1024);
        
        // Check file size to detect if it's just a login page
        if (sizeKB < 30) {
          console.log(`  ⚠ Screenshot small (${sizeKB}KB) - may be login redirect`);
        } else {
          console.log(`  ✓ Screenshot saved (${sizeKB}KB)`);
        }
        console.log('');
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}\n`);
      }
    }
    
    await context.close();
    console.log('\n=== Phase 5 Light Mode Screenshot Collection Complete ===\n');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}\n`);
    
    // List created files
    const lightFiles = fs.readdirSync(SCREENSHOT_DIR)
      .filter(f => f.endsWith('-light.png'))
      .sort();
    
    console.log(`Created ${lightFiles.length} light-mode screenshots:\n`);
    lightFiles.forEach(f => {
      const stat = fs.statSync(path.join(SCREENSHOT_DIR, f));
      const sizeKB = Math.round(stat.size / 1024);
      console.log(`  ✓ ${f} (${sizeKB}KB)`);
    });
    
    console.log('\n=== Visual Verification Checklist ===');
    console.log('Review each screenshot for:');
    console.log('  [ ] Text is readable (not too dark/light contrast)');
    console.log('  [ ] Backgrounds render correctly (not white-on-white or inverted)');
    console.log('  [ ] Borders are visible');
    console.log('  [ ] Components render properly');
    console.log('  [ ] No broken layouts');
    console.log('  [ ] Icons and colors display correctly\n');
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
