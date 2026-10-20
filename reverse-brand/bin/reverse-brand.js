#!/usr/bin/env node
// reverse-brand <url>: turn a public brand website into an unofficial, art-directed brand guide.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture, ChallengeError } from '../src/capture.js';
import { devtoolsSnippet } from '../src/snippet.js';
import { analyse } from '../src/analyse.js';
import { buildTokens } from '../src/tokens.js';
import { buildPrompts, readEnv, generateAll, importManual, encodeAll } from '../src/images.js';
import { buildGuide } from '../src/guide.js';
import { runLogMd } from '../src/log.js';

const HELP = `reverse-brand <url> [options]

  --out <dir>            output root (default: ./out); files go to <out>/<host>/
  --headed               open a visible browser; you complete any bot check yourself
  --snapshot <file>      skip capture and analyse a snapshot.json (from the DevTools snippet)
  --snippet              only write devtools-snippet.js for <url> and exit
  --images none|api|manual   image mode (default: none)
  --provider fal|openai|gemini|replicate   provider for --images api (key read from .env)
  --import               manual mode: build the manifest from images/<slot>.(png|jpg|webp)
  --image-source ai|procedural   label for imported images (default: ai)
  --stills               also write one still per video scene
  --no-slides, --no-video, --no-verify   skip those phases
  --max-pages <n>        pages to capture including home, 4-6 (default 5)
`;

function args(argv) {
  const o = { images: 'none', out: 'out', imageSource: 'ai', maxPages: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--out') o.out = next();
    else if (a === '--headed') o.headed = true;
    else if (a === '--snapshot') o.snapshot = next();
    else if (a === '--snippet') o.snippetOnly = true;
    else if (a === '--images') o.images = next();
    else if (a === '--provider') o.provider = next();
    else if (a === '--import') o.import = true;
    else if (a === '--image-source') o.imageSource = next();
    else if (a === '--stills') o.stills = true;
    else if (a === '--no-slides') o.noSlides = true;
    else if (a === '--no-video') o.noVideo = true;
    else if (a === '--no-verify') o.noVerify = true;
    else if (a === '--max-pages') o.maxPages = +next();
    else if (a === '-h' || a === '--help') o.help = true;
    else if (!a.startsWith('-')) o.url = a;
    else throw new Error('Unknown option ' + a);
  }
  return o;
}

const log = (...m) => console.log('[reverse-brand]', ...m);

async function main() {
  const o = args(process.argv.slice(2));
  if (o.help || !o.url) { console.log(HELP); process.exit(o.url ? 0 : 1); }
  if (!/^https?:\/\//.test(o.url)) o.url = 'https://' + o.url;
  const host = new URL(o.url).host;
  const dir = path.resolve(o.out, host.replace(/:/g, '_'));
  const imagesDir = path.join(dir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const phases = []; const notes = [];
  const timed = async (phase, fn) => { const t = Date.now(); try { return await fn(); } finally { phases.push({ phase, ms: Date.now() - t }); log(`${phase}: ${((Date.now() - t) / 1000).toFixed(1)} s`); } };
  const writeLog = (extra = {}) => fs.writeFileSync(path.join(dir, 'run-log.md'), runLogMd({ phases, notes, imagesMode: o.images, provider: o.provider, ...extra }));

  fs.writeFileSync(path.join(dir, 'devtools-snippet.js'), devtoolsSnippet());
  if (o.snippetOnly) { log('wrote', path.join(dir, 'devtools-snippet.js')); return; }

  // 1. capture
  let snap;
  if (o.snapshot) {
    snap = JSON.parse(fs.readFileSync(o.snapshot, 'utf8'));
    phases.push({ phase: 'capture (from snapshot.json)', ms: 0 });
    notes.push(`Snapshot loaded from ${o.snapshot} (method: ${snap.method}).`);
  } else {
    try {
      snap = await timed('capture', () => capture(o.url, { headed: o.headed, maxPages: o.maxPages, log }));
    } catch (e) {
      const challenge = e instanceof ChallengeError;
      const msg = challenge
        ? `A bot check or CAPTCHA was shown at ${e.url}. reverse-brand does not try to get past it.`
        : `Capture failed: ${e.message.split('\n')[0]}`;
      const snippetPath = path.relative(process.cwd(), path.join(dir, 'devtools-snippet.js'));
      const options = challenge
        ? `Two ways to continue:\n  (a) reverse-brand ${o.url} --headed   (a visible browser opens; you complete the check yourself)\n  (b) open ${o.url} in your browser, paste ${snippetPath} into the DevTools console,\n      then run: reverse-brand ${o.url} --snapshot ~/Downloads/snapshot.json`
        : `The site could not be reached from this machine (network or proxy). Ways to continue:\n  (a) run reverse-brand ${o.url} on a machine or network that can reach the site\n  (b) open ${o.url} in your browser, paste ${snippetPath} into the DevTools console,\n      then run: reverse-brand ${o.url} --snapshot ~/Downloads/snapshot.json`;
      notes.push(msg, options.replace(/\n\s*/g, ' '));
      phases[phases.length - 1].status = challenge ? 'stopped: bot check' : 'failed';
      writeLog({ snap: { source: o.url } });
      fs.writeFileSync(path.join(dir, 'CAPTURE-BLOCKED.md'), `# Capture stopped\n\n${msg}\n\n${options}\n`);
      console.error('\n' + msg + '\n\n' + options + '\n');
      process.exit(challenge ? 3 : 2);
    }
  }
  fs.writeFileSync(path.join(dir, 'snapshot.json'), JSON.stringify(snap));

  // 2-3. analyse and tokens
  const model = await timed('analyse', () => analyse(snap));
  const tokens = await timed('tokens', () => buildTokens(model));
  fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify(model, null, 2));
  fs.writeFileSync(path.join(dir, 'tokens.css'), tokens.css);
  fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(tokens.json, null, 2));

  // 5. images
  const prompts = buildPrompts(model);
  fs.writeFileSync(path.join(dir, 'prompts.json'), JSON.stringify(prompts, null, 2));
  let manifest = null; let costs = [];
  const manifestFile = path.join(imagesDir, 'manifest.json');
  await timed(`images (${o.images})`, async () => {
    if (o.images === 'api') {
      if (!o.provider) throw new Error('--images api needs --provider');
      costs = await generateAll(prompts, imagesDir, o.provider, readEnv(process.cwd()), log);
      manifest = encodeAll(importManual(prompts, imagesDir, { source: 'ai', tool: o.provider }), prompts, imagesDir, log);
    } else if (o.images === 'manual') {
      if (o.import) manifest = encodeAll(importManual(prompts, imagesDir, { source: o.imageSource }), prompts, imagesDir, log);
      else {
        console.log(`\nManual images: generate these in any tool and save them as ${imagesDir}/<slot>.png, then re-run with --images manual --import.\n`);
        for (const s of prompts.slots) console.log(`${s.slot} (${s.aspectRatio}):\n  ${s.prompt}\n`);
      }
    }
    if (manifest) fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    else if (fs.existsSync(manifestFile)) manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  });
  if (manifest && !manifest.images.length) manifest = null;

  // 4. guide, two editions
  await timed('guide', () => {
    const runLog = phases.slice();
    fs.writeFileSync(path.join(dir, 'brand-guide.html'), buildGuide({ model, tokens, prompts, manifest, imagesDir, runLog, edition: 'light' }));
    fs.writeFileSync(path.join(dir, 'brand-guide-hero.html'), buildGuide({ model, tokens, prompts, manifest, imagesDir, runLog, edition: 'hero' }));
  });
  if (!manifest) notes.push('No images: the hero edition uses the same gradient fallbacks as the light edition.');

  // 6-7. slides and video
  if (!o.noSlides) { const { renderSlides } = await import('../src/slides.js'); await timed('slides', () => renderSlides({ model, tokens, manifest, imagesDir, dir })); }
  if (!o.noVideo) { const { renderVideo } = await import('../src/video.js'); await timed('video', () => renderVideo({ model, tokens, manifest, imagesDir, dir, stills: o.stills, log })); }

  // 8. verify
  let verify = null;
  if (!o.noVerify) { const { verifyAll } = await import('../src/verify.js'); verify = await timed('verify', () => verifyAll(dir, { log })); }

  const sizes = {};
  for (const f of ['brand-guide.html', 'brand-guide-hero.html', 'tokens.css', 'tokens.json', 'snapshot.json', 'prompts.json']) sizes[f] = fs.statSync(path.join(dir, f)).size;
  const vdir = path.join(dir, 'video');
  if (fs.existsSync(vdir)) for (const f of fs.readdirSync(vdir).filter((f) => f.endsWith('.mp4'))) sizes['video/' + f] = fs.statSync(path.join(vdir, f)).size;
  writeLog({ model, snap, sizes, costs, verify });
  log('done:', dir);
  if (verify && verify.some((v) => !v.ok)) { console.error('verify: some checks failed, see run-log.md'); process.exit(1); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
