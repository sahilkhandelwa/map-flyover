const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const styles = [
  { name: 'streets',   file: 'streets.html' },
  { name: 'satellite', file: 'satellite.html' },
  { name: 'outdoors',  file: 'outdoors.html' },
];

const FPS = 15;
const DURATION = 24;
const TOTAL = FPS * DURATION;
const W = 1280, H = 720;

const xvfb = spawn('Xvfb', [':99', '-screen', '0', `${W}x${H}x24`, '-ac'], {});
process.env.DISPLAY = ':99';

async function renderOne(browser, { name, file }) {
  console.log(`\n=== ${name} ===`);
  const tmp = `/tmp/frames-${name}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();

  await page.goto(`file://${__dirname}/${file}`, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for tiles to load
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 });
  await page.waitForTimeout(3000);

  for (let f = 0; f < TOTAL; f++) {
    await page.screenshot({
      path: `${tmp}/${String(f).padStart(5, '0')}.png`,
      type: 'png'
    });
    if (f % 15 === 0) console.log(`  Frame ${f}/${TOTAL}`);
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }

  await ctx.close();

  const sz = fs.statSync(`${tmp}/00000.png`).size;
  console.log(`  Frame size: ${sz} bytes`);

  const out = `${__dirname}/${name}.mp4`;
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${tmp}/%05d.png -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${out}"`,
    { stdio: 'inherit' }
  );
  console.log(`  Saved: ${name}.mp4`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  for (const s of styles) { await renderOne(browser, s); }
  await browser.close();
  xvfb.kill();
  console.log('\n=== All 3 done! ===');
})();
