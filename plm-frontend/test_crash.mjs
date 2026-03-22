import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if(msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    }
  });

  // Capture unhandled exceptions
  page.on('pageerror', err => {
    console.log(`PAGE EXCEPTION: ${err.message}`);
  });

  try {
    // Navigate to login
    await page.goto('http://localhost:5173/login');
    // We need to type in correct login credentials if needed.
    await page.type('input[type="email"]', 'admin@plm.com');
    await page.type('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    await page.waitForNavigation();

    // Navigate to a valid eco page from the DB we seeded earlier
    await page.goto('http://localhost:5173/eco/69bed4776b3a8c9fbe0e00ac');
    
    // Wait for the button
    await page.waitForSelector('button:has-text("Validate & Advance")', { timeout: 10000 });
    
    console.log('Clicking Validate & Advance...');
    const advanceBtn = await page.$('button:has-text("Validate & Advance")');
    if (advanceBtn) {
        await advanceBtn.click();
    } else {
        console.log("Could not find Validate button");
    }

    // That should open the ConfirmDialog
    await page.waitForSelector('button:has-text("Advance")', { timeout: 5000 });
    console.log('Clicking Advance inside modal...');
    const confirmBtn = await page.$('div[role="dialog"] button:has-text("Advance")');
    if (confirmBtn) {
        await confirmBtn.click();
    }

    // Wait to see if the page logs an error or exception
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Finished waiting.');

  } catch(e) {
    console.error(`SCRIPT ERROR: ${e.message}`);
  } finally {
    await browser.close();
  }
})();
