const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setViewport({ width: 1440, height: 900 });
  
  try {
    console.log('Navigating directly to dashboard...');
    // Try navigating directly - might have auth cookie
    await page.goto('https://my-brain-gules.vercel.app/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    }).catch(err => console.log('Nav error (might redirect to login):', err.message));
    
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
    
    let currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // If on login, try login
    if (currentUrl.includes('login')) {
      console.log('On login page, attempting to login...');
      
      // Wait for form to be visible
      await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => {
        console.log('Email input not found');
      });
      
      // Clear and fill email
      await page.evaluate(() => document.querySelectorAll('input')[0]?.focus());
      await page.keyboard.press('Control+A');
      await page.keyboard.type('claude-test-user@mybrain.test', { delay: 30 });
      
      // Fill password
      await page.evaluate(() => document.querySelectorAll('input')[1]?.focus());
      await page.keyboard.press('Control+A');
      await page.keyboard.type('ClaudeTest123', { delay: 30 });
      
      console.log('Credentials entered, waiting 500ms...');
      await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
      
      // Find and click login button
      const allButtons = await page.$$('button');
      let clicked = false;
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.innerText || el.textContent, btn);
        if (text && text.toLowerCase().includes('log')) {
          console.log('Clicking button with text:', text.trim());
          await btn.click();
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        console.log('No login button found, trying Enter key');
        await page.keyboard.press('Enter');
      }
      
      // Wait for page to load
      console.log('Waiting for page load...');
      await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));
      currentUrl = page.url();
      console.log('New URL after login:', currentUrl);
    }
    
    // Now look for buttons
    console.log('Looking for Complete/Pause/Skip buttons...');
    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));
    
    const buttons = await page.$$('button');
    console.log('Total buttons found:', buttons.length);
    
    let buttonArea = null;
    const foundButtons = [];
    
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText || el.textContent, btn);
      const trimmed = (text || '').trim();
      
      if (['Complete', 'Pause', 'Skip'].some(target => trimmed.includes(target))) {
        const box = await btn.boundingBox();
        if (box) {
          foundButtons.push({ text: trimmed, box });
          console.log('Button found:', trimmed, '@', Math.round(box.x), Math.round(box.y));
          
          if (!buttonArea) {
            buttonArea = { ...box };
          } else {
            buttonArea.x = Math.min(buttonArea.x, box.x);
            buttonArea.y = Math.min(buttonArea.y, box.y);
            buttonArea.width = Math.max(buttonArea.x + buttonArea.width, box.x + box.width) - buttonArea.x;
            buttonArea.height = Math.max(buttonArea.y + buttonArea.height, box.y + box.height) - buttonArea.y;
          }
        }
      }
    }
    
    if (foundButtons.length > 0) {
      console.log(`Found ${foundButtons.length} target buttons, taking screenshot...`);
      
      // Add padding
      buttonArea.x = Math.max(0, buttonArea.x - 50);
      buttonArea.y = Math.max(0, buttonArea.y - 50);
      buttonArea.width += 100;
      buttonArea.height += 100;
      
      const outPath = 'button-area-closeup-clear.png';
      await page.screenshot({ 
        path: outPath,
        clip: buttonArea
      });
      console.log('✓ Screenshot saved:', outPath);
    } else {
      console.log('Buttons not found. Taking full page screenshot...');
      await page.screenshot({ path: 'button-area-closeup-clear.png' });
      console.log('✓ Full page screenshot saved');
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await browser.close();
  }
})();
