const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  console.error('ERROR: MAPBOX_TOKEN environment variable is required');
  process.exit(1);
}

fs.writeFileSync(`${__dirname}/config.js`,
  `const MAPBOX_TOKEN = ${JSON.stringify(MAPBOX_TOKEN)};\n`
);

const styles = [
  { name: 'streets',   file: 'streets.html' },
  { name: 'satellite', file: 'satellite.html' },
  { name: 'outdoors',  file: 'outdoors.html' },
];

const FPS = 30;
const DURATION = 24;
const TOTAL_FRAMES = FPS * DURATION;
const W = 1920, H = 1080;

async function renderOne(browser, { name, file }) {
  console.log(`\n=== Rendering ${name} ===`);
  const tmpDir = `/tmp/frames-${name}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  const pageUrl = `file://${__dirname}/${file}`;
  await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 45000 });

  await page.waitForFunction(() => {
    const c = document.querySelector('.mapboxgl-canvas');
    return c && c.width > 100 && c.height > 100;
  }, { timeout: 30000 });
  console.log('  Map loaded, capturing...');

  await new Promise(r => setTimeout(r, 1500));

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    await page.screenshot({
      path: `${tmpDir}/${String(f).padStart(5, '0')}.png`
    });
    if (f % 30 === 0) {
      console.log(`  Frame ${f}/${TOTAL_FRAMES}`);
    }
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }

  await page.close();

  const outputPath = `${__dirname}/${name}.mp4`;
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${tmpDir}/%05d.png ` +
    `-c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "${outputPath}"`,
    { stdio: 'inherit' }
  );
  console.log(`  Video saved: ${name}.mp4`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader'
    ]
  });
  for (const s of styles) {
    await renderOne(browser, s);
  }
  await browser.close();
  console.log('\n=== All 3 videos rendered successfully! ===');
})();
