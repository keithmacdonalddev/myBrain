const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setViewport({ width: 1440, height: 900 });
  
  try {
    console.log('Step 1: Go to home page');
    await page.goto('https://my-brain-gules.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
    
    let url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('login')) {
      console.log('Step 2: Fill login form');
      
      // Get input fields
      const inputs = await page.$$('input');
      console.log('Found', inputs.length, 'input fields');
      
      if (inputs.length >= 2) {
        // Email
        await inputs[0].click({ count: 3 });
        await page.keyboard.type('claude-test-user@mybrain.test');
        
        // Password
        await inputs[1].click({ count: 3 });
        await page.keyboard.type('ClaudeTest123');
        
        console.log('Step 3: Click submit button');
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text && text.toLowerCase().includes('log in')) {
            await btn.click();
            break;
          }
        }
        
        // Wait for page to navigate
        await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));
        url = page.url();
        console.log('After login URL:', url);
      }
    }
    
    // Wait for content to load
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
    
    console.log('Step 4: Look for Complete/Pause/Skip buttons');
    const buttons = await page.$$('button');
    console.log('Total buttons:', buttons.length);
    
    let foundTarget = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText || el.textContent, btn);
      if (['Complete', 'Pause', 'Skip'].some(t => (text || '').includes(t))) {
        console.log('Found target button:', text.trim());
        foundTarget = true;
      }
    }
    
    if (!foundTarget) {
      console.log('Target buttons not found. Taking full screenshot...');
    }
    
    await page.screenshot({ path: 'button-area-closeup-clear.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
