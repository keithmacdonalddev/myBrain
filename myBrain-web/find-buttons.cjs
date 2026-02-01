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
    
    // Get all button-like elements
    const elements = await page.evaluate(() => {
      const all = document.querySelectorAll('button, [role="button"], input[type="button"]');
      return Array.from(all).map((el, i) => ({
        index: i,
        tag: el.tagName,
        text: el.innerText || el.textContent || el.value,
        class: el.className,
        id: el.id,
        role: el.getAttribute('role'),
        visible: el.offsetHeight > 0 && el.offsetWidth > 0
      })).slice(0, 20);
    });
    
    console.log('Button elements found:');
    elements.forEach(el => {
      if (el.visible) {
        console.log(`[${el.index}] ${el.tag} - "${el.text.substring(0, 50)}" class="${el.class}" visible=true`);
      }
    });
    
    // Now look for task-related containers
    const taskInfo = await page.evaluate(() => {
      const classes = [
        'v2-current-task', 'current-task', 'task', 'action', 'button',
        'CurrentTask', 'TaskActions', 'TaskButton'
      ];
      
      const found = [];
      for (const cls of classes) {
        const els = document.querySelectorAll(`[class*="${cls}"]`);
        if (els.length > 0) {
          found.push({
            pattern: cls,
            count: els.length,
            elements: Array.from(els).slice(0, 3).map((el, i) => ({
              index: i,
              class: el.className,
              html: el.innerHTML.substring(0, 100)
            }))
          });
        }
      }
      return found;
    });
    
    console.log('\nTask-related containers:');
    console.log(JSON.stringify(taskInfo, null, 2));
    
  } finally {
    await browser.close();
  }
})();
