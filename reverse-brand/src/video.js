// Phase 7: video. 1920×1080 at a real 60 fps, ~45 s, 11 scenes. Rendered frame-accurately:
// every animation stays paused and is seeked to i/fps through document.getAnimations().
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadPlaywright, chromeLaunchOptions } from './pw.js';
import { esc, slot, slotFallbackCSS, slotImageCSS, baseCSS, imageLabel } from './art.js';

export const FPS = 60;
const STEP = 4.0;     // seconds between scene starts
const DUR = 4.6;      // scene length; the 0.6 s overlap is the cross-dissolve

const css = `
.sc .ai-label{display:none}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--brand-color-surface-inverse)}
.sc{position:absolute;inset:0;display:flex;opacity:0;font-family:var(--brand-font-body);overflow:hidden}
.sc .media{position:relative;width:820px;margin:80px 0 80px 80px;border-radius:var(--brand-radius-card);overflow:hidden;flex:none}
.sc .media .slot{position:absolute;inset:0}
.sc.full .media{position:absolute;inset:0;width:auto;margin:0;border-radius:0}
.sc.full::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in oklab,var(--brand-color-surface-inverse) 85%,transparent),transparent 70%)}
.sc .body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;gap:32px;padding:80px 110px;min-width:0}
.sc.full .body{max-width:1200px}
.big{font-family:var(--brand-font-heading);font-weight:var(--brand-type-h1-weight);font-size:128px;line-height:1;letter-spacing:var(--brand-type-h1-tracking);text-wrap:balance}
.mid{font-family:var(--brand-font-heading);font-weight:var(--brand-type-h2-weight,600);font-size:72px;line-height:1.06;letter-spacing:var(--brand-type-h2-tracking,0);text-wrap:balance}
.txt{font-size:34px;line-height:1.4}
.eyebrow{font:600 22px/1 var(--brand-font-body);letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.badge{position:absolute;z-index:5;right:56px;top:48px}.pill-unofficial{font-size:18px}
.credit{position:absolute;z-index:5;left:56px;bottom:40px;font:600 18px/1 var(--brand-font-body);padding:8px 12px;border-radius:8px;background:rgba(0,0,0,.6);color:#fff}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end}
.bars{display:flex;gap:6px;height:220px;align-items:stretch;border-radius:20px;overflow:hidden}.bars i{display:block;transform-origin:bottom}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.stats b{display:block;font:var(--brand-type-h1-weight) 110px/1 var(--brand-font-heading)}.stats span{font-size:26px}
.cols{display:grid;grid-template-columns:repeat(var(--brand-layout-columns),1fr);gap:var(--brand-layout-gutter);height:300px}.cols i{background:color-mix(in oklab,var(--brand-color-action) 30%,transparent);border-radius:8px;transform-origin:bottom}
.sw{width:150px;display:grid;gap:10px;font:500 20px/1.2 ui-monospace,monospace}.sw i{display:block;height:150px;border-radius:20px;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 20%,transparent)}
.ladder{display:grid;gap:14px}.ladder div{display:flex;justify-content:space-between;align-items:baseline;gap:30px;border-bottom:1px solid color-mix(in oklab,currentColor 18%,transparent);padding-bottom:12px;white-space:nowrap}
.ladder span{font:500 24px/1 ui-monospace,monospace;opacity:.7}
.rb-btn{transform:scale(1.6);transform-origin:left center;margin-right:110px}
.code{font:500 26px/1.6 ui-monospace,monospace;white-space:pre;overflow:hidden;padding:32px;border-radius:24px;background:color-mix(in oklab,var(--brand-color-text-inverse) 8%,transparent)}
`;

function scenes(m, tokens, M) {
  const t = m.type.roles; const c = m.colour.roles; const L = m.layout; const C = m.components; const V = m.voice; const I = m.imagery;
  const med = (s) => `<div class="media">${slot(s, M)}</div>`;
  const pal = m.colour.palette.slice(0, 10); const ps = pal.reduce((a, p) => a + p.share, 0) || 1;
  const roles = ['background', 'surface-inverse', 'text', 'action', 'accent', 'border'];
  const lines = tokens.css.split('\n').filter((l) => /--brand-(color-(background|text|action|accent)|type-(display|h1|body)-size|space-base|radius-card|motion-ease)/.test(l)).join('\n');
  return [
    ['intro', 'full ground-inv', 'hero', `${med('hero')}<div class="body"><div class="eyebrow" data-i>Brand guidelines</div><div class="big" data-i>${esc(m.name)}</div><div class="txt" data-i>Measured from ${m.pages.length} pages of ${esc(m.host)}.</div></div>`],
    ['overview', 'ground', null, `<div class="body"><div class="eyebrow" data-i>Overview</div><div class="stats"><div data-i><b>${m.type.families.length}</b><span class="muted">typefaces</span></div><div data-i><b>${Object.keys(c).length}</b><span class="muted">colour roles</span></div><div data-i><b>${L.base}px</b><span class="muted">spacing base</span></div><div data-i><b>${C.buttons.length}</b><span class="muted">button variants</span></div></div></div>`],
    ['typography', 'ground-inv', 'horizon', `${med('horizon')}<div class="body"><div class="eyebrow" data-i>Typography</div><div class="ladder">${Object.entries(t).filter(([r]) => r !== 'small').slice(0, 6).map(([r, s]) => `<div data-i><b style="font-family:var(--brand-type-${r}-family);font-weight:${s.weight};font-size:${Math.min(s.size, 96)}px;line-height:1.1">${esc(r)}</b><span>${s.mobile}→${s.size}px · ${s.weight}</span></div>`).join('')}</div></div>`],
    ['fonts', 'ground', null, `<div class="body"><div class="eyebrow" data-i>Fonts</div>${m.type.families.slice(0, 2).map((f) => `<div data-i style="display:flex;align-items:baseline;gap:48px"><span style="font-family:${esc(f.stack)};font-size:200px;line-height:.9">Aa</span><span class="mid">${esc(f.family)}<br><span class="txt muted">${Math.round(f.share * 100)}% of characters · ${f.weights.map((w) => w.weight).join(', ')}</span></span></div>`).join('')}</div>`],
    ['colour', 'ground-inv', 'object', `${med('object')}<div class="body"><div class="eyebrow" data-i>Colour</div><div class="bars" data-i>${pal.map((p) => `<i data-bar style="flex:${(p.share / ps).toFixed(4)};background:var(${tokens.palIndex[p.hex]})"></i>`).join('')}</div><div class="row">${roles.map((r) => `<div class="sw" data-i><i style="background:var(--brand-color-${r})"></i>${r.replace('surface-', 's-')}<br>${c[r].hex}</div>`).join('')}</div></div>`],
    ['layout', 'ground', null, `<div class="body"><div class="eyebrow" data-i>Layout and spacing</div><div class="mid" data-i>${L.container}px container · ${L.columns} columns · ${L.gutter}px gutter · ${L.base}px base</div><div class="cols">${Array.from({ length: L.columns }, () => '<i data-bar></i>').join('')}</div></div>`],
    ['components', 'ground-inv', 'glass', `${med('glass')}<div class="body"><div class="eyebrow" data-i>Components</div><div class="row" data-i><a class="rb-btn">${esc(C.buttons[0]?.labels[0] || 'Button')}</a></div>${C.buttons.find((b) => b.variant === 'outline') ? `<div class="row" data-i><a class="rb-btn outline">${esc(C.buttons.find((b) => b.variant === 'outline').labels[0])}</a></div>` : ''}<div class="txt muted" data-i>${C.buttons.length} variants · card radius ${L.radii.card}px · input ${C.input.h}px${C.input.inferred ? ' (inferred)' : ''}</div></div>`],
    ['imagery', 'ground', 'detail', `${med('detail')}<div class="body"><div class="eyebrow" data-i>Imagery</div><div class="mid" data-i>${I.count} media elements, ${Math.round(I.mediaShare * 100)}% of page area</div><div class="txt muted" data-i>Mostly ${esc(I.ratios[0]?.key || 'mixed')} crops; ${Math.round(I.fullBleedShare * 100)}% full-bleed.</div></div>`],
    ['voice', 'ground-alt', 'street', `${med('street')}<div class="body"><div class="eyebrow" data-i>Voice and tone</div><div class="mid" data-i>“${esc(V.quotes[0]?.text || '')}”</div>${V.rules.map((r, i) => `<div class="txt" data-i>${i + 1}. ${esc(r.text)}</div>`).join('')}</div>`],
    ['tokens', 'ground-inv', null, `<div class="body"><div class="eyebrow" data-i>Design tokens</div><div class="mid" data-i>${Object.keys(tokens.vars).length} variables · CSS and W3C JSON</div><div class="code" data-i>${esc(lines)}</div></div>`],
    ['outro', 'full ground-inv', 'sky', `${med('sky')}<div class="body"><div class="big" data-i>Unofficial analysis</div><div class="txt" data-i>Not affiliated with or endorsed by ${esc(m.name)}. Trademarks belong to their owners.</div><div class="txt" data-i>${esc(m.source)}</div></div>`],
  ].map(([id, cls, img, html]) => ({ id, cls, img, html, credit: img ? imageLabel(img, M) : '' }));
}

// Builds every animation with the Web Animations API, then pauses them all.
const timeline = (STEP_, DUR_, ease) => `
(function(){
var S=${STEP_}*1000,D=${DUR_}*1000,X=600,E='${ease}';
document.querySelectorAll('.sc').forEach(function(sc,k){
  var t0=k*S;
  sc.animate([{opacity:k?0:1,transform:k?'scale(1.035)':'none',filter:k?'blur(10px)':'none'},{opacity:1,transform:'none',filter:'blur(0px)',offset:X/D},{opacity:1,transform:'none',filter:'blur(0px)',offset:(D-X)/D},{opacity:0,transform:'scale(0.985)',filter:'blur(10px)'}],{duration:D,delay:t0,fill:'both',easing:'linear'});
  sc.querySelectorAll('.slot-img').forEach(function(im){im.animate([{transform:'scale(1)'},{transform:'scale(1.12) translate(-1.5%,-1%)'}],{duration:D,delay:t0,fill:'both',easing:'linear'})});
  sc.querySelectorAll('[data-i]').forEach(function(el,i){el.animate([{opacity:0,transform:'translateY(36px)'},{opacity:1,transform:'none'}],{duration:800,delay:t0+350+i*110,fill:'both',easing:E})});
  sc.querySelectorAll('[data-bar]').forEach(function(el,i){el.animate([{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration:900,delay:t0+500+i*70,fill:'both',easing:E})});
});
document.getAnimations().forEach(function(a){a.pause();a.currentTime=0});
window.__seek=function(ms){document.getAnimations().forEach(function(a){a.currentTime=ms})};
})();`;

export async function renderVideo({ model: m, tokens, manifest, imagesDir, dir, stills = false, log = () => {} }) {
  const out = path.join(dir, 'video');
  fs.mkdirSync(out, { recursive: true });
  const list = scenes(m, tokens, manifest);
  const total = (list.length - 1) * STEP + DUR;
  const frames = Math.round(total * FPS);
  const { css: img } = slotImageCSS(manifest, imagesDir);
  const ease = m.motion.easing.startsWith('cubic-bezier') || /^(ease|linear)/.test(m.motion.easing) ? m.motion.easing : 'ease-out';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${tokens.css}${baseCSS}${slotFallbackCSS}${img}${css}*{animation-play-state:paused!important}</style></head><body>
${list.map((s) => `<section class="sc ${s.cls}" id="sc-${s.id}">${s.html}<span class="badge pill-unofficial">Unofficial analysis</span>${s.credit ? `<span class="credit">${esc(s.credit)}</span>` : ''}</section>`).join('\n')}
<script>${timeline(STEP, DUR, ease)}</script></body></html>`;
  const htmlFile = path.join(out, 'presentation.html');
  fs.writeFileSync(htmlFile, html);
  const { chromium } = loadPlaywright();
  const b = await chromium.launch(chromeLaunchOptions());
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + htmlFile);
  await p.evaluate(() => document.fonts.ready);
  const seek = (ms) => p.evaluate((x) => window.__seek(x), ms);

  if (stills) {
    const sd = path.join(out, 'stills'); fs.mkdirSync(sd, { recursive: true });
    for (const [k, s] of list.entries()) { await seek(k * STEP * 1000 + 2400); await p.screenshot({ path: path.join(sd, `scene-${String(k + 1).padStart(2, '0')}-${s.id}.png`) }); }
    log(`stills: ${list.length}`);
  }

  const file = path.join(out, `${m.host.replace(/:/g, '_')}-presentation-1920x1080-60fps.mp4`);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  const t = Date.now();
  for (let i = 0; i < frames; i++) {
    await seek((i / FPS) * 1000);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 600 === 0) log(`video frame ${i}/${frames} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await b.close();
  return { file, frames, seconds: total };
}
