const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const FPS = 15;
const DURATION = 36;
const TOTAL = FPS * DURATION;
const W = 1280, H = 720;

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
  console.log('Opening satellite.html...');
  await page.goto(`file://${dir}/satellite.html`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForFunction(() => window.animationReady === true, { timeout: 60000 });
  console.log('Warmup done, starting frame capture...');

  const start = Date.now();
  for (let f = 0; f < TOTAL; f++) {
    const targetMs = start + (f * 1000 / FPS);
    const now = Date.now();
    if (targetMs > now) {
      await new Promise(r => setTimeout(r, targetMs - now));
    }
    await page.screenshot({
      path: `${tmp}/${String(f).padStart(5, '0')}.png`,
      type: 'png'
    });
    if (f % 30 === 0) console.log(`  Frame ${f}/${TOTAL}`);
  }

  await ctx.close();

  const sz = fs.statSync(`${tmp}/00000.png`).size;
  console.log(`Frame size: ${sz} bytes`);

  const out = `${dir}/satellite.mp4`;
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${out}"`,
    { stdio: 'inherit' }
  );
  console.log(`Saved: satellite.mp4`);
  fs.rmSync(tmp, { recursive: true, force: true });

  await browser.close();
  xvfb.kill();
  console.log('Done!');
})();
