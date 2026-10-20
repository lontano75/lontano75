// Phase 8: verify. node src/verify.js <out/host dir>
// Opens each guide offline and checks budgets, required sections, labels, tokens and layout,
// then screenshots every section at 1440px and 390px for visual review.
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, chromeLaunchOptions } from './pw.js';
import { shootSections } from './shoot.js';

const SECTIONS = ['cover', 'overview', 'contents', 'rebuild', 'typography', 'fonts', 'colour', 'layout', 'components', 'imagery', 'voice', 'tokens', 'method'];
const TITLES = ['Overview', 'Contents', 'Typography', 'Fonts', 'Colour', 'Layout and spacing', 'Components', 'Imagery', 'Voice and tone', 'Design tokens', 'Method'];

export async function verifyAll(dir, { log = console.log, screenshots = true } = {}) {
  const res = [];
  const ok = (name, pass, detail = '') => { res.push({ name, ok: !!pass, detail }); log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(chromeLaunchOptions());
  const tokensJson = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8')); } catch { return null; } })();
  ok('tokens.json parses', !!tokensJson);

  for (const [file, budget] of [['brand-guide.html', 150 * 1024], ['brand-guide-hero.html', 4 * 1024 * 1024]]) {
    const f = path.join(dir, file);
    const size = fs.statSync(f).size;
    ok(`${file} size ≤ ${budget / 1024 >= 1024 ? budget / 1048576 + ' MB' : budget / 1024 + ' KB'}`, size <= budget, `${(size / 1024).toFixed(1)} KB`);

    // offline: block the network and count every request that is not the file itself
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
    const requests = [];
    await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith('file://') && u.endsWith(file)) return route.continue(); requests.push(u); return route.abort(); });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + f, { waitUntil: 'load' });
    ok(`${file}: zero network requests offline`, requests.length === 0, requests.slice(0, 3).join(', '));
    ok(`${file}: no script errors`, errors.length === 0, errors.join('; '));

    const facts = await page.evaluate(({ SECTIONS, TITLES }) => {
      const q = (s) => [...document.querySelectorAll(s)];
      const missing = SECTIONS.filter((id) => !document.getElementById(id));
      const h = q('h2').map((x) => x.textContent.trim());
      const missingTitles = TITLES.filter((t) => !h.includes(t) && !document.title.includes(t));
      const unofficial = { cover: !!document.querySelector('#cover .pill-unofficial'), top: !!document.querySelector('.topbar .pill-unofficial'), footer: !!document.querySelector('footer .pill-unofficial'), disclaimer: /Not affiliated with or endorsed by .+ Trademarks belong to their owners\./.test(document.body.innerText) };
      let json = null; try { json = JSON.parse(document.getElementById('tokens-json').textContent); } catch (e) {}
      const root = getComputedStyle(document.documentElement);
      const tok = (n) => root.getPropertyValue(n).trim();
      const probe = document.createElement('div'); document.body.appendChild(probe);
      const resolve = (prop, v) => { probe.style[prop] = v; const r = getComputedStyle(probe)[prop]; probe.style[prop] = ''; return r; };
      const btn = document.querySelector('[data-rebuild=button]'); const bcs = getComputedStyle(btn);
      const pairs = [['height', '--brand-button-height', 'height'], ['padding-left', '--brand-button-pad-x', 'paddingLeft'], ['border-radius', '--brand-button-radius', 'borderTopLeftRadius'], ['background', '--brand-button-bg', 'backgroundColor'], ['color', '--brand-button-fg', 'color'], ['font-size', '--brand-button-font-size', 'fontSize'], ['font-weight', '--brand-button-font-weight', 'fontWeight']];
      const button = pairs.map(([label, v, prop]) => ({ label, want: resolve(prop, tok(v) === 'var(--brand-radius-button)' ? tok('--brand-radius-button') : tok(v)), got: bcs[prop] }));
      const card = document.querySelector('[data-rebuild=card]'); const ccs = getComputedStyle(card); const body = getComputedStyle(card.querySelector('.rb-body'));
      const cardPairs = [['background', resolve('backgroundColor', tok('--brand-card-bg')), ccs.backgroundColor], ['border-radius', resolve('borderTopLeftRadius', tok('--brand-card-radius')), ccs.borderTopLeftRadius], ['box-shadow', resolve('boxShadow', tok('--brand-card-shadow')), ccs.boxShadow], ['padding', resolve('paddingLeft', tok('--brand-card-pad')), body.paddingLeft]].map(([label, want, got]) => ({ label, want, got }));
      const cardMedia = !!card.querySelector('.rb-media .slot');
      const slots = q('[data-slot]');
      const withImage = slots.filter((s) => getComputedStyle(s.querySelector('.slot-img')).backgroundImage.includes('data:image/webp'));
      const unlabeled = withImage.filter((s) => !s.querySelector('.ai-label') || getComputedStyle(s.querySelector('.ai-label')).display === 'none');
      const wrongLabel = slots.filter((s) => s.querySelector('.ai-label') && !withImage.includes(s));
      return { missing, missingTitles, unofficial, json: !!json, quotes: q('.quote').length, rules: q('.rule').length, button, card: cardPairs, cardMedia, slots: slots.length, withImage: withImage.length, unlabeled: unlabeled.length, wrongLabel: wrongLabel.length };
    }, { SECTIONS, TITLES });
    ok(`${file}: required sections`, !facts.missing.length, facts.missing.join(', '));
    ok(`${file}: standard section titles`, !facts.missingTitles.length, facts.missingTitles.join(', '));
    ok(`${file}: Unofficial label on cover, top bar and footer + disclaimer`, Object.values(facts.unofficial).every(Boolean), JSON.stringify(facts.unofficial));
    ok(`${file}: embedded token JSON parses`, facts.json);
    ok(`${file}: five quotes and three rules`, facts.quotes === 5 && facts.rules === 3, `${facts.quotes} quotes, ${facts.rules} rules`);
    const bad = facts.button.filter((b) => b.want !== b.got);
    ok(`${file}: rebuild button computed style = tokens`, !bad.length, bad.map((b) => `${b.label} ${b.got}≠${b.want}`).join('; ') || facts.button.map((b) => `${b.label} ${b.got}`).join(', '));
    const badC = facts.card.filter((b) => b.want !== b.got);
    ok(`${file}: rebuild card computed style = tokens`, !badC.length && facts.cardMedia, badC.map((b) => `${b.label} ${b.got}≠${b.want}`).join('; ') || facts.card.map((b) => `${b.label} ${b.got}`).join(', '));
    ok(`${file}: every image carries its label`, facts.unlabeled === 0 && facts.wrongLabel === 0, `${facts.withImage} of ${facts.slots} slots have images; ${facts.unlabeled} unlabeled, ${facts.wrongLabel} labels without image`);

    // 390px: no horizontal scroll, with every reveal shown
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
    await page.waitForTimeout(300);
    const scroll = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); if (r.width === 0) return false; let p = e.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; p = p.parentElement; } return r.right > w + 1; }).slice(0, 5).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.'));
      return { sw: document.documentElement.scrollWidth, w, wide };
    });
    ok(`${file}: no horizontal scroll at 390px`, scroll.sw <= scroll.w && !scroll.wide.length, `scrollWidth ${scroll.sw} / ${scroll.w}${scroll.wide.length ? '; overflowing: ' + scroll.wide.join(', ') : ''}`);
    await ctx.close();

    if (screenshots) {
      const sd = path.join(dir, 'screenshots', file.replace('.html', ''));
      const a = await shootSections(f, sd, 1440, { browser });
      const b = await shootSections(f, sd, 390, { browser });
      log(`screenshots: ${a.length + b.length} in ${sd}`);
    }
  }

  // slides and video, when present
  const sl = path.join(dir, 'slides');
  if (fs.existsSync(sl)) {
    const files = fs.readdirSync(sl);
    ok('8 Instagram slides and 4 X images', files.filter((f) => f.startsWith('instagram-')).length === 8 && files.filter((f) => f.startsWith('x-')).length === 4, files.length + ' files');
  }
  const vd = path.join(dir, 'video');
  if (fs.existsSync(vd)) {
    const mp4 = fs.readdirSync(vd).find((f) => f.endsWith('.mp4'));
    ok('video file exists', !!mp4, mp4 || '');
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'verify.json'), JSON.stringify(res, null, 2));
  return res;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node src/verify.js <out/host dir>'); process.exit(1); }
  verifyAll(path.resolve(dir)).then((r) => process.exit(r.every((x) => x.ok) ? 0 : 1));
}
