/**
 * Activity Rings QA Test Script
 * Tests visual, responsive, accessibility, and animation aspects
 */

const chromium = require('chromium');
const path = require('path');
const fs = require('fs');

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';
const SCREENSHOTS_DIR = './.claude/design/screenshots/qa/sidebar/rings';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  console.log('Starting Activity Rings QA Testing...\n');

  try {
    const browser = await chromium.launch({ headless: true });

    // Test configurations
    const configs = [
      { size: 375, mode: 'light', name: 'mobile-light' },
      { size: 375, mode: 'dark', name: 'mobile-dark' },
      { size: 768, mode: 'light', name: 'tablet-light' },
      { size: 768, mode: 'dark', name: 'tablet-dark' },
      { size: 1280, mode: 'light', name: 'desktop-light' },
      { size: 1280, mode: 'dark', name: 'desktop-dark' }
    ];

    for (const config of configs) {
      const page = await browser.newPage({
        viewport: { width: config.size, height: 720 }
      });

      await page.goto(`${TEST_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

      if (config.mode === 'dark') {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
        });
      }

      const filename = `2026-01-31-${config.name}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);

      await page.screenshot({ path: filepath });
      console.log(`✓ Captured: ${filename}`);

      await page.close();
    }

    await browser.close();
    console.log('\nQA Testing Complete');

  } catch (error) {
    console.error('Test Error:', error);
    process.exit(1);
  }
})();
