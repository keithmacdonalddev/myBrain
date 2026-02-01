const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'keith@keithmacdonald.net');
  await page.fill('input[type="password"]', 'Password1!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '../.claude/design/screenshots/temp/feedback-logged-in.png' });
  await browser.close();
})();
