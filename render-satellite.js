const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const FPS = 15;
const DURATION = 36;
const TOTAL = FPS * DURATION;
const W = 1280, H = 720;
const PORT = 8765;

const xvfb = spawn('Xvfb', [':99', '-screen', '0', `${W}x${H}x24`, '-ac'], {});
process.env.DISPLAY = ':99';

// Simple HTTP server so Service Worker can register
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, req.url === '/' ? 'satellite.html' : req.url);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Service-Worker-Allowed': '/' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => setTimeout(r, 2000));

  server.listen(PORT, '127.0.0.1');
  await new Promise(r => server.on('listening', r));

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const tmp = '/tmp/frames-satellite';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();

  console.log(`Opening http://127.0.0.1:${PORT}/...`);
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 180000 });
  console.log('Warming tiles + caching via Service Worker...');
  await page.waitForFunction(() => window.warmupDone === true, { timeout: 180000 });
  console.log('Render starting...');
  console.time('render');

  for (let f = 0; f < TOTAL; f++) {
    await page.evaluate(async (f) => {
      await window.setFrameAndWait(f, 540);
    }, f);
    await page.screenshot({
      path: `${tmp}/${String(f).padStart(5, '0')}.png`,
      type: 'png'
    });
    if (f % 54 === 0) console.log(`  ${Math.round(f / TOTAL * 100)}% (${f}/${TOTAL})`);
  }

  console.timeEnd('render');
  await ctx.close();

  const out = `${__dirname}/satellite.mp4`;
  console.log('Encoding...');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${out}"`,
    { stdio: 'inherit' }
  );
  console.log(`Saved: ${out}`);
  fs.rmSync(tmp, { recursive: true, force: true });

  await browser.close();
  xvfb.kill();
  server.close();
  console.log('Done!');
})();
