import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, '../.claude/design/screenshots/phase5-visual-verify');
const TEST_EMAIL = 'claude-test-user@mybrain.test';
const TEST_PASSWORD = 'ClaudeTest123';
const API_URL = 'http://localhost:5000/api';

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

async function getAuthToken() {
  console.log('[API] Getting authentication token...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    if (!response.ok) {
      console.log('[API] Login failed:', response.status, response.statusText);
      const text = await response.text();
      console.log('[API] Response:', text.substring(0, 200));
      return null;
    }
    
    const data = await response.json();
    if (data.token) {
      console.log('[API] ✓ Authentication successful');
      return data.token;
    } else {
      console.log('[API] No token in response');
      return null;
    }
  } catch (error) {
    console.log('[API] Error:', error.message);
    return null;
  }
}

async function takeScreenshots() {
  let browser;
  try {
    // First, try to get an auth token
    const token = await getAuthToken();
    
    console.log('\nLaunching Chromium...');
    browser = await chromium.launch();
    
    // Create context with light mode
    const context = await browser.newContext({
      colorScheme: 'light'
    });
    const page = await context.newPage();
    
    // Set viewport to standard desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // If we got a token, set it in localStorage before navigating
    if (token) {
      console.log('[Auth] Setting token in localStorage...');
      await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
      await page.evaluate((tkn) => {
        localStorage.setItem('token', tkn);
        localStorage.setItem('auth_token', tkn);
      }, token);
      console.log('[Auth] Token set\n');
    }

    console.log('=== Taking Screenshots of All Phase 5 Pages ===\n');
    
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      try {
        console.log(`[${i + 1}/${pages.length}] ${pageInfo.name}`);
        const fullUrl = `http://localhost:5173${pageInfo.path}`;
        console.log(`  URL: ${fullUrl}`);
        
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Check current URL
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login')) {
          console.log(`  ⚠ Redirected to login (not authenticated)`);
        } else {
          console.log(`  ✓ Loaded successfully`);
        }
        
        await page.waitForTimeout(1500);
        
        const filename = `${pageInfo.name}-light.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        
        await page.screenshot({ path: filepath, fullPage: true });
        
        const stats = fs.statSync(filepath);
        console.log(`  ✓ Screenshot saved (${Math.round(stats.size / 1024)}KB)\n`);
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
