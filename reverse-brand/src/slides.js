// Phase 6: social slides. Instagram carousel (8 × 1080×1350) and X images (4 × 1600×900),
// built from the same tokens and images as the guide. Text sits beside images, never on busy areas.
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, chromeLaunchOptions } from './pw.js';
import { esc, slot, slotFallbackCSS, slotImageCSS, baseCSS, imageLabel } from './art.js';

const slideCSS = `
.s .ai-label{display:none}
body{margin:0;background:#000}
.s{position:relative;overflow:hidden;display:flex;flex-direction:column;font-family:var(--brand-font-body)}
.ig{width:1080px;height:1350px}.x{width:1600px;height:900px;flex-direction:row}
.s .media{position:relative;flex:none}
.ig .media{height:600px;margin:40px 40px 0;border-radius:var(--brand-radius-card);overflow:hidden}
.x .media{width:760px;margin:40px 0 40px 40px;border-radius:var(--brand-radius-card);overflow:hidden}
.s .media .slot{position:absolute;inset:0}
.s .body{flex:1;display:flex;flex-direction:column;gap:28px;padding:56px 72px 0;min-width:0}
.x .body{padding:72px 72px 0 64px}
.s .meta{position:absolute;left:72px;right:72px;bottom:44px;display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:20px}
.x .meta{left:auto;width:700px;right:72px}
.pill-unofficial{font-size:18px}
.big{font-family:var(--brand-font-heading);font-weight:var(--brand-type-h1-weight);font-size:96px;line-height:1.02;letter-spacing:var(--brand-type-h1-tracking);text-wrap:balance}
.mid{font-family:var(--brand-font-heading);font-weight:var(--brand-type-h2-weight,600);font-size:68px;line-height:1.08;letter-spacing:var(--brand-type-h2-tracking,0);text-wrap:balance}
.txt{font-size:34px;line-height:1.4}
.eyebrow{font:600 20px/1 var(--brand-font-body);letter-spacing:.12em;text-transform:uppercase;opacity:.7}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.sw{width:130px;display:grid;gap:8px;font:500 18px/1.2 ui-monospace,monospace}.sw i{display:block;height:110px;border-radius:16px;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 20%,transparent)}
.ladder{display:grid;gap:10px}.ladder div{display:flex;align-items:baseline;justify-content:space-between;gap:24px;border-bottom:1px solid color-mix(in oklab,currentColor 18%,transparent);padding-bottom:10px;white-space:nowrap;overflow:hidden}
.ladder span{font:500 20px/1 ui-monospace,monospace;opacity:.7}
.code{font:500 19px/1.6 ui-monospace,monospace;white-space:pre;overflow:hidden;padding:28px;border-radius:20px;background:color-mix(in oklab,var(--brand-color-text-inverse) 8%,transparent)}
.cols{display:grid;grid-template-columns:repeat(var(--brand-layout-columns),1fr);gap:calc(var(--brand-layout-gutter) * .8);height:160px}.cols i{background:color-mix(in oklab,var(--brand-color-action) 25%,transparent);border-radius:6px}
.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.facts b{display:block;font:var(--brand-type-h2-weight,600) 64px/1 var(--brand-font-heading)}.facts span{font-size:22px}
.rb-btn{transform:scale(1.5);transform-origin:left center;margin-right:80px}
.credit{font-size:16px;opacity:.75}
`;

function igSlides(m, tokens, M) {
  const t = m.type.roles; const c = m.colour.roles; const L = m.layout; const V = m.voice; const C = m.components;
  const un = '<span class="pill-unofficial">Unofficial analysis</span>';
  const meta = (img) => `<div class="meta">${un}<span class="credit">${img && imageLabel(img, M) ? esc(imageLabel(img, M)) + ' · ' : ''}${esc(m.host)}</span></div>`;
  const media = (img) => `<div class="media">${slot(img, M)}</div>`;
  const roles = ['background', 'surface-inverse', 'text', 'action', 'accent', 'border'];
  const lad = Object.entries(t).filter(([r]) => r !== 'small').slice(0, 6);
  const cssLines = tokens.css.split('\n').filter((l) => /--brand-(color|type-(display|h1|body)-size|space-base|radius-card)/.test(l)).slice(0, 12).join('\n');
  return [
    ['cover', 'ground-inv', `${media('hero')}<div class="body"><div class="eyebrow">Brand guidelines</div><div class="big">${esc(m.name)}</div><div class="txt muted">Measured from ${m.pages.length} pages of ${esc(m.host)}.</div></div>${meta('hero')}`],
    ['typography', 'ground', `<div class="body" style="padding-top:80px"><div class="eyebrow">Typography</div><div class="mid">${esc(t.body.family)}${m.type.families[1] ? ' and ' + esc(m.type.families[1].family) : ''}</div><div class="ladder">${lad.map(([r, s]) => `<div><b style="font-family:var(--brand-type-${r}-family,var(--brand-font-heading));font-weight:${s.weight};font-size:${Math.min(s.size, 84)}px;line-height:1.1">${esc(r)}</b><span>${s.size}px · ${s.weight} · ${s.lh}</span></div>`).join('')}</div><div class="txt muted">Scale ratio ${m.type.scale.ratio} (${esc(m.type.scale.name)}).</div></div>${meta()}`],
    ['colour', 'ground-inv', `${media('object')}<div class="body"><div class="eyebrow">Colour</div><div class="row">${roles.map((r) => `<div class="sw"><i style="background:var(--brand-color-${r})"></i>${r.replace('surface-', 's-')}<br>${c[r].hex}</div>`).join('')}</div><div class="txt muted">Action on background: ${c.action.contrast}:1.</div></div>${meta('object')}`],
    ['layout', 'ground', `<div class="body" style="padding-top:80px"><div class="eyebrow">Layout and spacing</div><div class="facts"><div><b>${L.base}px</b><span class="muted">base unit</span></div><div><b>${L.container}px</b><span class="muted">container</span></div><div><b>${L.columns}</b><span class="muted">columns</span></div><div><b>${L.gutter}px</b><span class="muted">gutter</span></div></div><div class="cols">${Array.from({ length: L.columns }, () => '<i></i>').join('')}</div><div class="txt muted">${Math.round(L.baseShares[L.base] * 100)}% of spacing values sit on the ${L.base}px grid.</div></div>${meta()}`],
    ['components', 'ground-inv', `${media('glass')}<div class="body"><div class="eyebrow">Components</div><div class="row"><a class="rb-btn">${esc(C.buttons[0]?.labels[0] || 'Button')}</a>${C.buttons.find((b) => b.variant === 'outline') ? `<a class="rb-btn outline">${esc(C.buttons.find((b) => b.variant === 'outline').labels[0])}</a>` : ''}</div><div class="txt muted">${C.buttons.length} button variants · card radius ${L.radii.card}px · nav ${C.nav ? C.nav.h + 'px' : 'n/a'}.</div></div>${meta('glass')}`],
    ['voice', 'ground-alt', `${media('street')}<div class="body"><div class="eyebrow">Voice and tone</div><div class="mid">“${esc(V.quotes[0]?.text || '')}”</div><div class="txt muted">${V.rules.map((r, i) => `${i + 1}. ${esc(r.title)}`).join(' · ')}</div></div>${meta('street')}`],
    ['tokens', 'ground-inv', `<div class="body" style="padding-top:80px"><div class="eyebrow">Design tokens</div><div class="mid">${Object.keys(tokens.vars).length} variables, CSS and W3C JSON</div><div class="code">${esc(cssLines)}</div></div>${meta()}`],
    ['outro', 'ground', `<div class="body" style="justify-content:center;padding-bottom:160px"><div class="eyebrow">${esc(m.host)}</div><div class="big">Unofficial analysis</div><div class="txt">Not affiliated with or endorsed by ${esc(m.name)}. Trademarks belong to their owners.</div><div class="txt muted">Values measured from public pages. Logos, fonts and the brand's images are not included.</div></div>${meta()}`],
  ];
}

function xSlides(m, tokens, M) {
  const ig = Object.fromEntries(igSlides(m, tokens, M).map(([k, g, h]) => [k, [g, h]]));
  const un = '<span class="pill-unofficial">Unofficial analysis</span>';
  const t = m.type.roles;
  return [
    ['cover', ...ig.cover],
    ['colour', ...ig.colour],
    ['typography', 'ground-inv', `<div class="media">${slot('horizon', M)}</div><div class="body"><div class="eyebrow">Typography</div><div style="font-family:var(--brand-font-heading);font-weight:${(t.display || t.h1).weight};font-size:120px;line-height:1;letter-spacing:${(t.display || t.h1).tracking}em">Aa</div><div class="ladder">${Object.entries(t).filter(([r]) => r !== 'small').slice(0, 5).map(([r, s]) => `<div><b style="font-size:28px">${esc(r)}</b><span>${s.mobile}→${s.size}px · ${s.weight}</span></div>`).join('')}</div></div><div class="meta">${un}<span class="credit">${imageLabel('horizon', M) ? esc(imageLabel('horizon', M)) + ' · ' : ''}${esc(m.host)}</span></div>`],
    ['components', ...ig.components],
  ];
}

export async function renderSlides({ model: m, tokens, manifest, imagesDir, dir }) {
  const out = path.join(dir, 'slides');
  fs.mkdirSync(out, { recursive: true });
  const { css: img } = slotImageCSS(manifest, imagesDir);
  const page = (cls, list) => `<!doctype html><html><head><meta charset="utf-8"><style>${tokens.css}${baseCSS}${slotFallbackCSS}${img}${slideCSS}</style></head><body>${list.map(([id, g, h]) => `<section class="s ${cls} ${g}" id="${id}">${h}</section>`).join('')}</body></html>`;
  const { chromium } = loadPlaywright();
  const b = await chromium.launch(chromeLaunchOptions());
  const files = [];
  for (const [cls, list, w, h] of [['ig', igSlides(m, tokens, manifest), 1080, 1350], ['x', xSlides(m, tokens, manifest), 1600, 900]]) {
    const html = path.join(out, `${cls}.html`);
    fs.writeFileSync(html, page(cls, list));
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + html);
    await p.evaluate(() => document.fonts.ready);
    for (const [i, [id]] of list.entries()) {
      const f = path.join(out, `${cls === 'ig' ? 'instagram' : 'x'}-${String(i + 1).padStart(2, '0')}-${id}.png`);
      await (await p.$('#' + id)).screenshot({ path: f });
      files.push(f);
    }
    await p.close();
    fs.unlinkSync(html);
  }
  await b.close();
  return files;
}
