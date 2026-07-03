const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const FPS = 15, DURATION = 36, TOTAL = FPS * DURATION, W = 1280, H = 720;

const xvfb = spawn('Xvfb', [':99', '-screen', '0', `${W}x${H}x24`, '-ac'], {});
process.env.DISPLAY = ':99';

(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const tmp = '/tmp/frames-satellite';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();

  console.log('Loading...');
  await page.goto('file://' + __dirname + '/demo.html', { waitUntil: 'load', timeout: 60000 });

  console.log('Waiting for image...');
  for (let i = 0; i < 600; i++) {
    const done = await page.evaluate(() => typeof window.mapImg !== 'undefined' && window.mapImg.complete && window.mapImg.naturalWidth > 0);
    if (done) { console.log('Image loaded'); break; }
    if (i % 30 === 0) console.log('  still waiting...');
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Rendering 540 frames...');
  console.time('render');
  for (let f = 0; f < TOTAL; f++) {
    await page.evaluate(f => window.setFrame(f, 540), f);
    await page.screenshot({ path: `${tmp}/${String(f).padStart(5, '0')}.png`, type: 'png' });
    if (f % 54 === 0) console.log(`  ${Math.round(f / TOTAL * 100)}% (${f}/${TOTAL})`);
  }
  console.timeEnd('render');

  await ctx.close();
  const out = __dirname + '/satellite.mp4';
  console.log('Encoding...');
  execSync(`ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${out}"`, { stdio: 'inherit' });
  console.log('Saved: ' + out);
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  xvfb.kill();
  console.log('Done!');
})();
