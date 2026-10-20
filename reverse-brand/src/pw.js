// Load Playwright from the project, or fall back to the global install.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  try { return require('playwright'); } catch {}
  const root = execSync('npm root -g').toString().trim();
  return require(path.join(root, 'playwright'));
}

// Prefer an installed Chrome; otherwise the Chromium Playwright is configured to find.
export function chromeLaunchOptions({ headed = false } = {}) {
  const opts = { headless: !headed, args: ['--disable-gpu', '--font-render-hinting=none'] };
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) opts.executablePath = found;
  return opts;
}
