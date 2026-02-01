const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setViewport({ width: 1440, height: 900 });
  
  try {
    // Navigate to the site
    await page.goto('https://my-brain-gules.vercel.app', { waitUntil: 'networkidle2' });
    
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('login')) {
      console.log('Attempting login...');
      try {
        await page.type('input[type="email"]', 'claude-test-user@mybrain.test');
        await page.type('input[type="password"]', 'TestUser123!');
        
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Log In')) {
            await btn.click();
            break;
          }
        }
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      } catch (e) {
        console.log('Login error:', e.message);
      }
    }
    
    await page.waitForTimeout(3000);
    
    // Find all buttons
    const buttons = await page.$$('button');
    console.log('Found', buttons.length, 'buttons on page');
    
    let buttonArea = null;
    const targetButtons = ['Complete', 'Pause', 'Skip'];
    
    // Find buttons with target text
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      const trimmed = text.trim();
      
      if (targetButtons.some(target => trimmed.includes(target))) {
        const box = await btn.boundingBox();
        console.log('Found button:', trimmed, 'at', box);
        
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
    
    if (buttonArea) {
      console.log('Button area before padding:', buttonArea);
      // Add padding
      buttonArea.x = Math.max(0, buttonArea.x - 30);
      buttonArea.y = Math.max(0, buttonArea.y - 30);
      buttonArea.width += 60;
      buttonArea.height += 60;
      
      console.log('Button area after padding:', buttonArea);
      
      // Take screenshot of just that area
      await page.screenshot({ 
        path: 'button-area-closeup-clear.png',
        clip: buttonArea
      });
      console.log('Screenshot saved!');
    } else {
      console.log('Could not find target buttons');
      const fullScreenshot = await page.screenshot({ path: 'button-area-closeup-clear.png' });
      console.log('Saved full page screenshot');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
