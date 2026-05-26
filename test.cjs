const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', request => console.log('PAGE LOG: Failed to load resource: ' + request.url() + ' ' + request.failure().errorText));
    page.on('response', response => {
        if (!response.ok()) console.log('PAGE LOG: 404 for: ' + response.url());
    });
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();