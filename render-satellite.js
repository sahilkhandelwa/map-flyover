const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const FPS = 15;
const DURATION = 36;
const TOTAL = FPS * DURATION;
const W = 1280, H = 720;
const FRAME_SLEEP = 80; // ms between frames (allows tiles to render from cache)

const xvfb = spawn('Xvfb', [':99', '-screen', '0', `${W}x${H}x24`, '-ac'], {});
process.env.DISPLAY = ':99';

(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const tmp = '/tmp/frames-satellite';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();

  const dir = __dirname;
  console.log('Opening satellite.html, warming tiles...');
  console.time('warmup');
  await page.goto(`file://${dir}/satellite.html`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForFunction(() => window.warmupDone === true, { timeout: 120000 });
  console.timeEnd('warmup');

  console.log(`Capturing ${TOTAL} frames at ${FPS}fps...`);
  console.time('render');
  for (let f = 0; f < TOTAL; f++) {
    await page.evaluate(({ f, t }) => { window.setFrame(f, t); }, { f, t: TOTAL });
    await new Promise(r => setTimeout(r, FRAME_SLEEP));
    await page.screenshot({
      path: `${tmp}/${String(f).padStart(5, '0')}.png`,
      type: 'png'
    });
    if (f % 54 === 0) console.log(`  ${Math.round(f / TOTAL * 100)}% (${f}/${TOTAL})`);
  }
  console.timeEnd('render');

  await ctx.close();

  const out = `${dir}/satellite.mp4`;
  console.log('Encoding video...');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${out}"`,
    { stdio: 'inherit' }
  );
  console.log(`Saved: ${out}`);
  fs.rmSync(tmp, { recursive: true, force: true });

  await browser.close();
  xvfb.kill();
  console.log('Done!');
})();
