const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewport({ width: 1440, height: 900 });
  
  try {
    // Navigate to production
    console.log('Navigating to production dashboard...');
    await page.goto('https://my-brain-gules.vercel.app', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for any animations
    await page.waitForTimeout(2000);
    
    // Check if we're on login page
    const url = page.url();
    console.log('Current URL:', url);
    
    const screenshotDir = path.join(__dirname, '.claude/design/screenshots/verify/button-fix');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filename = path.join(screenshotDir, `${new Date().toISOString().split('T')[0]}-dashboard-buttons.png`);
    await page.screenshot({ path: filename, fullPage: false });
    
    console.log(`Screenshot saved to: ${filename}`);
    
    // If on login page, note it
    if (url.includes('login') || url.includes('auth')) {
      console.log('\nNote: App is showing login page. Buttons will be visible after login.');
      console.log('Check the production site directly at: https://my-brain-gules.vercel.app');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
