// Uso: node render.js logo.svg [cartella_output]
// Registra anim.html fotogramma per fotogramma (PNG trasparenti) e crea i video.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FPS = 30;
const svgPath = process.argv[2] || path.join(__dirname, 'logo.svg');
const out = path.resolve(process.argv[3] || path.join(__dirname, 'output'));
const frames = path.join(out, 'frames');

(async () => {
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'anim.html'));
  const n = await page.evaluate(s => window.setup(s), fs.readFileSync(svgPath, 'utf8'));
  console.log(`forme animate: ${n}`);
  const dur = await page.evaluate(() => window.DUR);
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, '0')}.png`), omitBackground: true });
  }
  await browser.close();
  // fotogramma finale anche come sticker statico
  fs.copyFileSync(path.join(frames, `f${String(total - 1).padStart(4, '0')}.png`), path.join(out, 'logo-finale.png'));

  const ff = (...a) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  const input = ['-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png')];
  // 1) MP4 per YouCut: logo su verde pieno, da scontornare con Chroma key
  const key = process.env.KEY_COLOR || '0x00FF00';
  ff('-f', 'lavfi', '-i', `color=c=${key}:s=1920x1080:r=${FPS}`, ...input,
     '-filter_complex', '[0][1]overlay=shortest=1,format=yuv420p',
     '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart',
     path.join(out, 'futuroprossimo-logo-greenscreen.mp4'));
  // 2) WebM VP9 con canale alfa (CapCut desktop, DaVinci, web)
  ff(...input, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', '-auto-alt-ref', '0',
     path.join(out, 'futuroprossimo-logo-alpha.webm'));
  // 3) MOV ProRes 4444 con alfa (Premiere, Final Cut, DaVinci)
  ff(...input, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16',
     path.join(out, 'futuroprossimo-logo-alpha.mov'));
  console.log('fatto:', out);
})();
