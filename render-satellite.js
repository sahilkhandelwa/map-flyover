const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const FPS = 15;
const W = 1280, H = 720;
const FRAME_MS = 30;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();
  const dir = __dirname;

  const tmp = '/tmp/frames-satellite';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  console.log('Opening satellite.html, warming tiles...');
  await page.goto(`file://${dir}/satellite.html`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForFunction(() => window.warmupDone === true, { timeout: 180000 });

  const totalFrames = await page.evaluate(() => window.TF);
  console.log(`Warmup done. Rendering ${totalFrames} frames...`);
  console.time('render');

  for (let f = 0; f < totalFrames; f++) {
    await page.evaluate(f => window.setFrame(f), f);
    await new Promise(r => setTimeout(r, FRAME_MS));
    await page.screenshot({ path: `${tmp}/${String(f).padStart(5, '0')}.png`, type: 'png' });
    if (f % 69 === 0 || f === totalFrames - 1) process.stdout.write(`\r  ${Math.round(f/totalFrames*100)}%`);
  }
  console.log('\nEncoding...');
  execSync(`ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${dir}/satellite.mp4"`, { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  console.log('Done!');
})();
