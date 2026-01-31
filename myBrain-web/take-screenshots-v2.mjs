import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, '../.claude/design/screenshots/phase5-visual-verify');
const TEST_EMAIL = 'claude-test-user@mybrain.test';
const TEST_PASSWORD = 'ClaudeTest123';
const AUTH_STORAGE_FILE = path.join(SCREENSHOT_DIR, '.auth.json');

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

async function login(page) {
  console.log('[Auth] Attempting to fill login form...');
  
  // Try to fill email
  const emailInputs = await page.$$('input[type="email"]');
  if (emailInputs.length > 0) {
    await emailInputs[0].fill(TEST_EMAIL);
    console.log('[Auth] Email filled');
  }
  
  // Try to fill password
  const passwordInputs = await page.$$('input[type="password"]');
  if (passwordInputs.length > 0) {
    await passwordInputs[0].fill(TEST_PASSWORD);
    console.log('[Auth] Password filled');
  }
  
  // Click sign in button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text && text.includes('Sign In')) {
      await btn.click();
      console.log('[Auth] Sign In button clicked');
      break;
    }
  }
  
  // Wait for navigation
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
    console.log('[Auth] Navigation successful');
  } catch (e) {
    console.log('[Auth] Navigation timeout - might be on login page');
  }
  
  // Wait a bit for page to settle
  await page.waitForTimeout(2000);
}

async function takeScreenshots() {
  let browser;
  try {
    console.log('Launching Chromium...');
    browser = await chromium.launch();
    
    // Create context with light mode
    const context = await browser.newContext({
      colorScheme: 'light'
    });
    const page = await context.newPage();
    
    // Set viewport to standard desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('\n[Step 1] Navigating to login page...');
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Take login page screenshot
    console.log('[Step 2] Taking login page screenshot...');
    const loginPath = path.join(SCREENSHOT_DIR, '00-login-light.png');
    await page.screenshot({ path: loginPath, fullPage: true });
    console.log('  ✓ Login page saved\n');
    
    // Try to login
    console.log('[Step 3] Attempting login...');
    await login(page);
    
    // Check if we're still on login page
    const url = page.url();
    console.log('[Auth] Current URL:', url);
    
    if (url.includes('/auth/login') || url.includes('/auth')) {
      console.log('[Auth] Still on auth page, attempting alternative login method...');
      
      // Try clicking elements differently
      await page.click('input[type="email"]');
      await page.keyboard.type(TEST_EMAIL);
      await page.click('input[type="password"]');
      await page.keyboard.type(TEST_PASSWORD);
      
      await page.click('button[type="submit"]');
      
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 });
      } catch (e) {
        console.log('[Auth] Navigation still timing out');
      }
      
      await page.waitForTimeout(2000);
    }
    
    const finalUrl = page.url();
    console.log('[Auth] Final URL:', finalUrl);
    console.log('[Auth] On app pages?', finalUrl.includes('/app'));
    
    console.log('\n=== Taking Screenshots of All Phase 5 Pages ===\n');
    
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      try {
        console.log(`[${i + 1}/${pages.length}] ${pageInfo.name}`);
        const fullUrl = `http://localhost:5173${pageInfo.path}`;
        console.log(`  URL: ${fullUrl}`);
        
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Check if we got redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login')) {
          console.log(`  ⚠ Redirected to login (auth required)`);
        }
        
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
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    console.log(`\nCreated ${files.length} screenshots:`);
    files.sort().forEach(f => {
      const stat = fs.statSync(path.join(SCREENSHOT_DIR, f));
      console.log(`  - ${f} (${Math.round(stat.size / 1024)}KB)`);
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
