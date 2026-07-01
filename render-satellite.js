const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const FPS = 15;
const W = 1280, H = 720;
const RECORD_SECONDS = 50;

const xvfb = spawn('Xvfb', [':99', '-screen', '0', `${W}x${H}x24`, '-ac'], {});
process.env.DISPLAY = ':99';

(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const ctx = await browser.newContext({ viewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await ctx.newPage();
  const dir = __dirname;

  console.log('Opening satellite.html, warming tiles...');
  await page.goto(`file://${dir}/satellite.html`, { waitUntil: 'networkidle', timeout: 180000 });
  console.log('Waiting for warmup...');
  await page.waitForFunction(() => window.animationReady === true, { timeout: 120000 });
  console.log('Warmup done, starting recording...');

  const out = `${dir}/satellite.mp4`;
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'x11grab', '-draw_mouse', '0',
    '-framerate', String(FPS),
    '-video_size', `${W}x${H}`,
    '-i', ':99',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-preset', 'medium', '-crf', '20',
    '-t', String(RECORD_SECONDS),
    out
  ], { stdio: ['ignore', 'inherit', 'inherit'] });

  await page.waitForFunction(() => window.animationDone === true, { timeout: 120000 });
  console.log('Animation complete, waiting for ffmpeg...');

  await new Promise(resolve => {
    ffmpeg.on('exit', code => {
      console.log(`ffmpeg exit code: ${code}`);
      resolve();
    });
  });

  await browser.close();
  xvfb.kill();
  console.log(`Done! Saved: ${out}`);
})();
