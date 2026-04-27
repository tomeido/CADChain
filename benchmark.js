import { chromium } from 'playwright';
import fs from 'fs';
import http from 'http';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // We'll create a simple HTML with canvas to test CADEditor
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body>
        <div style="width: 800px; height: 600px;"><canvas id="cadCanvas"></canvas></div>
        <script type="module">
          import { CADEditor } from './js/cadEditor.js';

          const editor = new CADEditor('cadCanvas');

          // Generate 10000 shapes
          for (let i = 0; i < 10000; i++) {
            editor.shapes.push({
              type: 'rect',
              x: Math.random() * 800,
              y: Math.random() * 600,
              w: 10 + Math.random() * 50,
              h: 10 + Math.random() * 50,
              stroke: '#06d6a0',
              lineWidth: 2
            });
          }

          // Benchmark render() which is called on mouse move
          const start = performance.now();
          for (let i = 0; i < 100; i++) {
            editor.render();
          }
          const end = performance.now();

          console.log('BENCHMARK_RESULT:' + (end - start));
        </script>
      </body>
    </html>
  `;

  page.on('console', msg => {
    if (msg.text().startsWith('BENCHMARK_RESULT:')) {
      console.log('100 renders took:', msg.text().split(':')[1], 'ms');
    }
  });

  fs.writeFileSync('benchmark.html', htmlContent);

  const server = http.createServer((req, res) => {
    if (req.url === '/benchmark.html') {
      res.end(fs.readFileSync('benchmark.html'));
    } else if (req.url.startsWith('/js/')) {
      try {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(fs.readFileSync('.' + req.url));
      } catch (e) {
        res.statusCode = 404;
        res.end();
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  server.listen(3001, async () => {
    await page.goto('http://localhost:3001/benchmark.html');
    await browser.close();
    server.close();
  });
})();
