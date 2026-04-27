const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().startsWith('BENCHMARK_RESULT')) {
      console.log(msg.text());
    }
  });

  await page.goto(`file://${process.cwd()}/benchmark.html`);
  await page.waitForTimeout(2000); // give it time to run
  await browser.close();
})();
