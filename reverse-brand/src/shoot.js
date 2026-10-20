// Screenshot every section of a guide at a given width: node src/shoot.js <html> <outdir> [width]
import path from 'node:path';
import fs from 'node:fs';
import { loadPlaywright, chromeLaunchOptions } from './pw.js';

export async function shootSections(html, outDir, width = 1440, { browser } = {}) {
  const { chromium } = loadPlaywright();
  const b = browser || await chromium.launch(chromeLaunchOptions());
  fs.mkdirSync(outDir, { recursive: true });
  const page = await b.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  await page.addStyleTag({ content: '*{animation-play-state:paused!important;transition:none!important}.topbar{position:absolute!important}' });
  const ids = await page.$$eval('main > section[id]', (s) => s.map((x) => x.id));
  const files = [];
  for (const [i, id] of ids.entries()) {
    const el = await page.$('#' + id);
    const f = path.join(outDir, `${String(i).padStart(2, '0')}-${id}-${width}.png`);
    await el.screenshot({ path: f });
    files.push(f);
  }
  await page.close();
  if (!browser) await b.close();
  return files;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [html, out, w] = process.argv.slice(2);
  shootSections(html, out, +(w || 1440)).then((f) => console.log(f.join('\n')));
}
