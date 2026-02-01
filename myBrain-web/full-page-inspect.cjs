const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setViewport({ width: 1440, height: 900 });
  
  try {
    await page.goto('https://my-brain-gules.vercel.app/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
    
    // Check page structure
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasNav: !!document.querySelector('nav'),
        hasSidebar: !!document.querySelector('[class*="sidebar"]'),
        bodyClasses: document.body.className,
        mainContent: document.querySelector('main')?.className || 'no main',
        textContent: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
    // Look for any text mentioning "Complete", "Pause", "Skip"
    const hasTargetText = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return {
        hasComplete: bodyText.includes('complete'),
        hasPause: bodyText.includes('pause'),
        hasSkip: bodyText.includes('skip'),
        allText: document.body.innerText
      };
    });
    
    console.log('Target text found:', {
      Complete: hasTargetText.hasComplete,
      Pause: hasTargetText.hasPause,
      Skip: hasTargetText.hasSkip
    });
    
    // Take a screenshot of the whole page
    await page.screenshot({ path: 'full-page-debug.png', fullPage: true });
    console.log('Full page screenshot saved: full-page-debug.png');
    
  } finally {
    await browser.close();
  }
})();
