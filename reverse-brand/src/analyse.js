// Phase 2: analyse a snapshot into a measured brand model.
import { toOklch, oklchString, contrast, isDark, chroma, hueDist, mix } from './color.js';

const top = (obj, n = Infinity) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const median = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mode = (arr) => { const c = {}; arr.forEach((v) => (c[v] = (c[v] || 0) + 1)); return top(c, 1)[0]?.[0]; };

// Counts identical on every page are repeated chrome (header, footer): count them once.
export function mergeCounts(maps) {
  const out = {};
  const keys = new Set(maps.flatMap((m) => Object.keys(m || {})));
  for (const k of keys) {
    const vals = maps.map((m) => (m || {})[k]);
    const same = maps.length > 1 && vals.every((v) => v != null && Math.abs(v - vals[0]) < 1e-6);
    out[k] = same ? vals[0] : sum(vals.filter((v) => v != null));
  }
  return out;
}

function mergeType(pages) {
  const maps = pages.map((p) => Object.fromEntries(p.type.map((t) => [[t.family, t.size, t.weight, t.lh, t.ls, t.transform, t.style].join('|'), t.chars])));
  const merged = mergeCounts(maps);
  const meta = {};
  for (const p of pages) for (const t of p.type) {
    const k = [t.family, t.size, t.weight, t.lh, t.ls, t.transform, t.style].join('|');
    if (!meta[k]) meta[k] = { ...t, tags: { ...t.tags } };
    else for (const [tg, n] of Object.entries(t.tags)) meta[k].tags[tg] = (meta[k].tags[tg] || 0) + n;
  }
  return Object.entries(merged).map(([k, chars]) => ({ ...meta[k], chars }));
}

const HEAD_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const headShare = (t) => sum(HEAD_TAGS.map((h) => t.tags[h] || 0)) / Math.max(1, sum(Object.values(t.tags)));

function typeRoles(styles) {
  const assumptions = [];
  const bodyCands = styles.filter((t) => t.size >= 14 && t.size <= 22 && headShare(t) < 0.3 && t.transform !== 'uppercase');
  const bodySize = mode(bodyCands.flatMap((t) => Array(Math.max(1, Math.round(t.chars / 20))).fill(t.size)));
  const body = bodyCands.filter((t) => String(t.size) === String(bodySize)).sort((a, b) => b.chars - a.chars)[0] || styles.sort((a, b) => b.chars - a.chars)[0];
  const B = body ? body.size : 16;
  const heads = styles.filter((t) => (headShare(t) > 0.5 && t.size > B * 1.05) || (t.size >= B * 1.4 && t.weight >= 500));
  // cluster sizes within 12%
  const sorted = [...heads].sort((a, b) => b.size - a.size);
  const clusters = [];
  for (const t of sorted) {
    const c = clusters.find((c) => Math.abs(t.size - c.anchor) / c.anchor <= 0.12);
    if (c) c.items.push(t); else clusters.push({ anchor: t.size, items: [t] });
  }
  clusters.forEach((c) => { c.rep = c.items.sort((a, b) => b.chars - a.chars)[0]; c.chars = sum(c.items.map((i) => i.chars)); });
  const roles = {};
  const names = [];
  if (clusters.length >= 3 && clusters[0].anchor >= 40) names.push('display');
  names.push('h1', 'h2', 'h3', 'h4');
  clusters.slice(0, names.length).forEach((c, i) => { roles[names[i]] = c.rep; });
  const smallestHead = clusters.length ? Math.min(...clusters.slice(0, names.length).map((c) => c.anchor)) : B * 1.5;
  const lead = styles.filter((t) => t.size > B * 1.08 && t.size < smallestHead * 0.97 && headShare(t) < 0.3 && t.weight < 600).sort((a, b) => b.chars - a.chars)[0];
  if (lead) roles.lead = lead;
  roles.body = body;
  const small = styles.filter((t) => t.size < B * 0.93 && t.size >= 10 && headShare(t) < 0.3).sort((a, b) => b.chars - a.chars)[0];
  if (small) roles.small = small;
  return { roles, clusters, body: B, assumptions };
}

function roleOut(t, ctx) {
  if (!t) return null;
  return { family: t.family, stack: t.stack, size: t.size, weight: t.weight, lh: round(t.lh / t.size, 3), lhPx: t.lh, tracking: round(t.ls / t.size, 3), transform: t.transform, style: t.style, chars: t.chars, inferred: !!t.inferred };
}

const INTERVALS = [['minor second', 1.067], ['major second', 1.125], ['minor third', 1.2], ['major third', 1.25], ['perfect fourth', 1.333], ['augmented fourth', 1.414], ['perfect fifth', 1.5], ['golden ratio', 1.618], ['major sixth', 1.667], ['octave', 2]];

function analyseType(snap, pages, assumptions) {
  const styles = mergeType(pages);
  const d = typeRoles(styles);
  const m = snap.mobile ? typeRoles(snap.mobile.type.map((t) => ({ ...t }))) : null;
  const ORDER = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'small'];
  const roles = {};
  for (const r of ORDER) {
    const o = roleOut(d.roles[r]);
    if (!o) continue;
    const mob = m && m.roles[r] ? m.roles[r].size : null;
    o.mobile = mob && mob <= o.size ? mob : o.size;
    if (!mob) o.mobileAssumed = true;
    const min = o.mobile, max = o.size;
    if (max > min) {
      const slope = (max - min) / (1440 - 390); const icpt = min - slope * 390;
      o.clamp = `clamp(${round(min / 16, 3)}rem, ${round(icpt / 16, 3)}rem + ${round(slope * 100, 3)}vw, ${round(max / 16, 3)}rem)`;
    } else o.clamp = `${round(max / 16, 3)}rem`;
    roles[r] = o;
  }
  if (!roles.lead && roles.body) {
    const s = Math.round(roles.body.size * 1.2);
    roles.lead = { ...roles.body, size: s, mobile: roles.body.mobile, clamp: `clamp(${round(roles.body.mobile / 16, 3)}rem, 1vw + 0.8rem, ${round(s / 16, 3)}rem)`, inferred: true, chars: 0 };
    assumptions.push('No lead paragraph style was found; lead is inferred as body × 1.2.');
  }
  if (!roles.display && roles.h1) assumptions.push('Fewer than three heading clusters, or the largest is under 40px: no separate display role; the Display tab shows h1.');
  if (!m) assumptions.push('No 390px capture: mobile sizes equal desktop sizes.');
  // scale ratio from body up to the h1 (or largest) size
  const ladder = ['body', 'h4', 'h3', 'h2', 'h1'].map((r) => roles[r]?.size).filter(Boolean);
  const uniq = [...new Set(ladder)].sort((a, b) => a - b);
  const ratios = uniq.slice(1).map((v, i) => v / uniq[i]);
  const ratio = ratios.length ? Math.exp(sum(ratios.map(Math.log)) / ratios.length) : 1;
  const named = INTERVALS.reduce((best, iv) => (Math.abs(Math.log(ratio / iv[1])) < Math.abs(Math.log(ratio / best[1])) ? iv : best), INTERVALS[0]);
  // families and weights by character share
  const fam = {}; const weights = {};
  styles.forEach((t) => { fam[t.family] = (fam[t.family] || 0) + t.chars; weights[t.family] = weights[t.family] || {}; weights[t.family][t.weight] = (weights[t.family][t.weight] || 0) + t.chars; });
  const totalChars = sum(Object.values(fam)) || 1;
  const stackOf = (f) => (styles.find((t) => t.family === f) || {}).stack || f;
  const faces = pages.flatMap((p) => p.fontFaces || []);
  const families = top(fam).filter(([, c]) => c / totalChars >= 0.01).map(([family, chars]) => ({
    family, stack: stackOf(family), share: round(chars / totalChars, 3),
    weights: top(weights[family]).map(([w, c]) => ({ weight: +w, share: round(c / chars, 3) })),
    roles: Object.entries(roles).filter(([, v]) => v.family === family).map(([k]) => k),
    hosted: [...new Set(faces.filter((f) => f.family === family).map((f) => f.host).filter(Boolean))],
  }));
  const sizes = top(styles.reduce((o, t) => ((o[t.size] = (o[t.size] || 0) + t.chars), o), {})).map(([s, c]) => ({ size: +s, share: round(c / totalChars, 3) })).sort((a, b) => b.size - a.size);
  const vars = Object.fromEntries(Object.entries(pages[0].vars || {}).filter(([k, v]) => /font|type|text|size|leading|line-height|tracking|letter|heading|display|body/i.test(k) && !/color|colour/i.test(k)));
  return { roles, scale: { ratio: round(ratio, 3), name: named[0], named: named[1], ladder: uniq }, families, sizes, vars, clusters: d.clusters.map((c) => ({ size: c.anchor, members: c.items.map((i) => i.size) })) };
}

function analyseColour(pages, buttons, assumptions) {
  const text = mergeCounts(pages.map((p) => p.textColors));
  const bgAll = mergeCounts(pages.map((p) => p.bgColors));
  const border = mergeCounts(pages.map((p) => p.borderColors));
  const fill = mergeCounts(pages.map((p) => p.fillColors));
  const pairsM = mergeCounts(pages.map((p) => p.pairs));
  const bg = {}; const translucent = {};
  for (const [k, v] of Object.entries(bgAll)) { if (k.includes('@')) translucent[k] = v; else bg[k] = v; }
  const tChars = sum(Object.values(text)) || 1; const bgArea = sum(Object.values(bg)) || 1;
  const bgTop = top(bg);
  const background = bgTop[0]?.[0] || pages[0].bodyBg || '#ffffff';
  const darkBg = isDark(background);
  const L = (h) => toOklch(h).l;
  let surface = bgTop.map(([h]) => h).find((h) => h !== background && isDark(h) === darkBg && Math.abs(L(h) - L(background)) < 0.12);
  const roles = {};
  const share = (h, src) => round((src[h] || 0) / (src === text ? tChars : bgArea), 3);
  let surfaceInverse = bgTop.map(([h]) => h).find((h) => isDark(h) !== darkBg);
  const pairs = top(pairsM).map(([k, chars]) => { const [fg, bgc] = k.split('|'); return { fg, bg: bgc, chars, ratio: round(contrast(fg, bgc), 2) }; });
  // text colours aggregated by character count over light or dark grounds; must actually read (>= 3:1)
  const textOn = (dark) => {
    const agg = {};
    pairs.filter((p) => isDark(p.bg) === dark && p.ratio >= 3).forEach((p) => (agg[p.fg] = (agg[p.fg] || 0) + p.chars));
    return top(agg).map(([fg]) => fg);
  };
  const textMain = textOn(darkBg)[0] || top(text)[0]?.[0] || (darkBg ? '#ffffff' : '#000000');
  const muted = textOn(darkBg).find((h) => h !== textMain && chroma(h) < 0.06 && contrast(h, background) < contrast(textMain, background));
  const textInv = textOn(!darkBg)[0];
  if (!surface) { surface = mix(background, textMain, 0.04); assumptions.push(`No second ground near the page background: surface inferred as background mixed 4% toward text (${surface}).`); roles.surface = { inferred: true }; }
  if (!surfaceInverse) { surfaceInverse = textMain; assumptions.push('No dark band found: surface-inverse inferred as the text colour.'); roles['surface-inverse'] = { inferred: true }; }
  const filled = buttons.filter((b) => b.variant === 'filled');
  const action = filled[0]?.bg || top(text).map(([h]) => h).find((h) => chroma(h) > 0.08) || textMain;
  const onAction = filled[0]?.color || (isDark(action) ? '#ffffff' : '#000000');
  const outlineC = buttons.find((b) => b.variant === 'outline')?.border?.c;
  const actionAlt = filled.find((b) => b.bg !== action)?.bg || (outlineC && contrast(outlineC, background) >= 3 ? outlineC : surfaceInverse);
  const palette = {};
  const add = (src, kind) => Object.entries(src).forEach(([h, v]) => { palette[h] = palette[h] || { hex: h, text: 0, bg: 0, border: 0, fill: 0 }; palette[h][kind] += v; });
  add(text, 'text'); add(bg, 'bg'); add(border, 'border'); add(fill, 'fill');
  const bTotal = sum(Object.values(border)) || 1; const fTotal = sum(Object.values(fill)) || 1;
  const pal = Object.values(palette).map((p) => ({ ...p, share: round((p.text / tChars + p.bg / bgArea + p.border / bTotal * 0.25 + p.fill / fTotal * 0.25) / 2.5, 4), oklch: oklchString(p.hex) })).sort((a, b) => b.share - a.share);
  // accent candidates: measured palette first, then gradient stops and colour variables
  const stops = top(mergeCounts(pages.map((p) => p.gradientStops || {}))).map(([h]) => h);
  const varCols = [...new Set(Object.values(pages[0].varColors || {}))];
  const accent = [...pal.map((p) => p.hex), ...stops, ...varCols].find((h) => chroma(h) > 0.06 && (hueDist(h, action) > 25 || Math.abs(L(h) - L(action)) > 0.2)) || action;
  if (accent === action) assumptions.push('No second chromatic colour: accent equals action.');
  const borderC = top(border)[0]?.[0] || mix(background, textMain, 0.15);
  if (!top(border).length) assumptions.push('No borders measured: border inferred as 15% text on background.');
  const R = { background, surface, 'surface-inverse': surfaceInverse, text: textMain, 'text-muted': muted || mix(textMain, background, 0.4), 'text-inverse': textInv || (darkBg ? '#000000' : '#ffffff'), action, 'on-action': onAction, 'action-alt': actionAlt, accent, border: borderC };
  if (!muted) roles['text-muted'] = { inferred: true };
  // each role's contrast is measured against the ground (or text) it is used with
  const CW = { background: 'text', surface: 'text', 'surface-inverse': 'text-inverse', text: 'background', 'text-muted': 'background', 'text-inverse': 'surface-inverse', action: 'background', 'on-action': 'action', 'action-alt': 'background', accent: 'background', border: 'background' };
  if (!textInv) roles['text-inverse'] = { inferred: true };
  const colorRoles = Object.fromEntries(Object.entries(R).map(([k, h]) => [k, { hex: h, oklch: oklchString(h), share: round(Math.max(share(h, text), share(h, bg)), 3), inferred: !!roles[k]?.inferred,
    contrastWith: CW[k], contrast: round(contrast(h, R[CW[k]] || background), 2) }]));
  const gAll = mergeCounts(pages.map((p) => p.gradients));
  const gArea = sum(Object.values(gAll)) || 1;
  const gradients = top(gAll, 6).map(([css, a]) => ({ css, share: round(a / bgArea, 3) }));
  let brandGradient = gradients[0]?.css;
  if (!brandGradient) { brandGradient = `linear-gradient(135deg, ${surfaceInverse} 0%, ${action} 60%, ${accent} 120%)`; assumptions.push('No gradient in use: the guide fallback gradient is built from surface-inverse, action and accent.'); }
  const contrastPairs = pairs.slice(0, 8).map((p) => ({ ...p, share: round(p.chars / tChars, 3), aa: p.ratio >= 4.5, aaLarge: p.ratio >= 3 }));
  return { roles: colorRoles, stops, varColors: pages[0].varColors || {}, palette: pal.slice(0, 40), translucent: top(translucent, 6).map(([k]) => k), gradients, brandGradient, gradientInferred: !gradients.length, pairs: contrastPairs, totals: { textColours: Object.keys(text).length, bgColours: Object.keys(bg).length } };
}

function analyseLayout(snap, pages, cards, assumptions) {
  const pad = mergeCounts(pages.map((p) => p.spacing.padding));
  const mar = mergeCounts(pages.map((p) => p.spacing.margin));
  const gap = mergeCounts(pages.map((p) => p.spacing.gap));
  const all = {};
  for (const m of [pad, mar, gap]) for (const [k, v] of Object.entries(m)) all[k] = (all[k] || 0) + v;
  const total = sum(Object.values(all)) || 1;
  const shareDiv = (b) => sum(Object.entries(all).filter(([k]) => +k % b === 0).map(([, v]) => v)) / total;
  const shares = { 8: round(shareDiv(8)), 4: round(shareDiv(4)), 2: round(shareDiv(2)) };
  const base = shares[8] >= 0.7 ? 8 : shares[4] >= 0.7 ? 4 : 2;
  const vals = top(all).map(([k, c]) => ({ px: +k, count: c }));
  const onGrid = vals.filter((v) => v.px % base === 0).sort((a, b) => a.px - b.px);
  const offGrid = vals.filter((v) => v.px % base !== 0).sort((a, b) => b.count - a.count).slice(0, 16);
  const scale = [...onGrid].sort((a, b) => b.count - a.count).slice(0, 10).map((v) => v.px).filter((v) => v <= 200).sort((a, b) => a - b);
  const radii = mergeCounts(pages.map((p) => p.radiiPx));
  const pillCount = sum(pages.map((p) => p.radii.pill || 0));
  const radTotal = sum(Object.values(radii)) + pillCount || 1;
  const cont = mergeCounts(pages.map((p) => p.containers));
  let container = +(top(cont)[0]?.[0] || 0);
  if (!container) { container = 1200; assumptions.push('No centred max-width container: 1200px assumed.'); }
  const grids = pages.flatMap((p) => p.grids).filter((g) => g.width >= container * 0.6);
  let columns = +(mode(grids.map((g) => g.cols)) || 0);
  let gutter = +(mode(grids.filter((g) => g.cols === columns).map((g) => g.gap)) || 0);
  if (!columns) { columns = 12; gutter = base * 3; assumptions.push(`No multi-column grid on the content width: 12 columns with a ${gutter}px gutter assumed.`); }
  const mq = mergeCounts(pages.map((p) => p.mq));
  const bps = [...new Set(Object.keys(mq).map((k) => +k.split(':')[1]))].sort((a, b) => a - b).map((px) => ({ px, count: sum(Object.entries(mq).filter(([k]) => +k.split(':')[1] === px).map(([, v]) => v)) }));
  const rhythm = (pages[0].bands || []).map((b) => ({ ...b, tone: b.image ? 'image' : isDark(b.bg) ? 'dark' : 'light' }));
  const cardRadius = +(mode(cards.map((c) => c.radius).filter((r) => r > 0)) || 0);
  return { base, baseShares: shares, onGrid, offGrid, scale, radii: { values: top(radii).map(([k, c]) => ({ px: +k, count: c, share: round(c / radTotal, 3) })).sort((a, b) => a.px - b.px), pillShare: round(pillCount / radTotal, 3), card: cardRadius }, container, columns, gutter, grids: grids.slice(0, 10), breakpoints: bps, rhythm, docHeight: pages[0].docHeight };
}

function buttonVariants(pages) {
  const seen = {};
  pages.forEach((p, pi) => p.buttons.forEach((b) => {
    const variant = b.backdrop || (b.bg && b.bgA > 0.05 && b.bgA < 0.95) ? 'translucent' : b.bg && b.bgA >= 0.95 ? 'filled' : b.border ? 'outline' : 'text';
    const sig = [variant, b.bg, b.color, b.border?.c, b.pill ? 'pill' : b.radius].join('|');
    seen[sig] = seen[sig] || { ...b, variant, count: 0, pages: new Set(), labels: new Set() };
    seen[sig].count++; seen[sig].pages.add(pi); seen[sig].labels.add(b.label);
  }));
  return Object.values(seen).filter((v) => v.variant !== 'text').sort((a, b) => b.pages.size - a.pages.size || b.count - a.count)
    .map((v) => ({ variant: v.variant, bg: v.bg, bgA: v.bgA, color: v.color, border: v.border, radius: v.radius, pill: v.pill, h: v.h, pad: v.pad, font: v.font, backdrop: v.backdrop, shadow: v.shadow, ground: v.ground, count: v.count, pages: v.pages.size, labels: [...v.labels].slice(0, 5), painted: v.painted }));
}

function analyseComponents(snap, pages, buttons, layout, colour, assumptions) {
  const order = ['filled', 'outline', 'translucent'];
  const variants = [];
  for (const kind of order) { const b = buttons.filter((x) => x.variant === kind); variants.push(...b.slice(0, kind === 'filled' ? 2 : 1)); }
  const cardSig = {};
  pages.flatMap((p) => p.cards).forEach((c) => {
    const sig = [c.bg, c.bgA, c.radius, c.media, c.backdrop ? 'glass' : ''].join('|');
    cardSig[sig] = cardSig[sig] || { ...c, count: 0 }; cardSig[sig].count++;
  });
  const cards = Object.values(cardSig).sort((a, b) => b.count - a.count).slice(0, 3).map((c) => ({ ...c, kind: c.backdrop ? 'glass' : c.media === 'backdrop' ? 'media-backdrop' : c.media ? 'media-top' : 'plain', padding: c.pad.some((v) => v > 0) ? c.pad : c.innerPad || c.pad }));
  const header = pages[0].header;
  const fields = pages.flatMap((p) => p.fields);
  let input;
  if (fields.length) {
    const f = fields.sort((a, b) => b.w - a.w)[0];
    input = { ...f, inferred: false };
  } else {
    const b = variants[0];
    input = { h: b ? b.h : 48, radius: b ? (b.pill ? 999 : b.radius) : layout.radii.card || 8, pad: [0, layout.base * 2, 0, layout.base * 2], bg: colour.roles.background.hex, border: { w: 1, c: colour.roles.border.hex }, font: { size: 16 }, color: colour.roles.text.hex, placeholder: 'Email', inferred: true };
    assumptions.push('No form fields were found: the input is inferred from the primary button height and radius and the border colour, and flagged "inferred".');
  }
  return { buttons: variants, buttonsAll: buttons.slice(0, 12), cards, nav: header, input };
}

const STOP = new Set('a e i o il lo la le gli un una uno di da in con su per tra fra del della dei delle degli al alla ai alle nel nella che non più come anche sono è the of and to in on for with at by from an is are this that your our il'.split(' '));

function analyseImagery(pages) {
  const m = { count: 0, formats: {}, fit: {}, ratios: {}, fullBleed: 0, area: 0, alts: [], kinds: { img: 0, video: 0, svg: 0, bg: 0 } };
  let pageArea = 0;
  for (const p of pages) {
    const x = p.media; m.count += x.count; m.fullBleed += x.fullBleed; m.area += x.area; pageArea += p.pageArea;
    for (const k of ['formats', 'fit', 'ratios']) for (const [a, b] of Object.entries(x[k])) m[k][a] = (m[k][a] || 0) + b;
    for (const k of Object.keys(m.kinds)) m.kinds[k] += x[k] || 0;
    m.alts.push(...x.alts);
  }
  const words = {};
  for (const a of new Set(m.alts)) for (const w of a.toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/)) if (w.length > 3 && !STOP.has(w)) words[w] = (words[w] || 0) + 1;
  const pct = (o) => top(o).map(([k, v]) => ({ key: k, share: round(v / (sum(Object.values(o)) || 1), 3) }));
  return { count: m.count, kinds: m.kinds, formats: pct(m.formats), fit: pct(m.fit), ratios: pct(m.ratios), fullBleedShare: round(m.fullBleed / (m.count || 1), 3), mediaShare: round(m.area / (pageArea || 1), 3), altCoverage: round(new Set(m.alts).size / (m.kinds.img || 1), 2), altThemes: top(words, 10).map(([w, c]) => ({ word: w, count: c })), sources: pages.map((p) => ({ url: p.url, title: p.title, media: p.media.count })) };
}

function wordsOf(s) { return s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)); }

function analyseVoice(snap, pages, buttons) {
  const lang = (pages[0].lang || 'en').slice(0, 2).toLowerCase();
  const heads = []; const seenH = new Set();
  pages.forEach((p) => p.headings.filter((h) => !h.inFooter && !h.inHeader).forEach((h) => { if (!seenH.has(h.text)) { seenH.add(h.text); heads.push({ ...h, url: p.url }); } }));
  const paras = []; const seenP = new Set();
  pages.forEach((p) => p.paragraphs.filter((x) => !x.inFooter).forEach((x) => { if (!seenP.has(x.text)) { seenP.add(x.text); paras.push({ ...x, url: p.url }); } }));
  const ctas = [...new Set(buttons.flatMap((b) => b.labels))];
  // quotes: 5 lines of 15 words or fewer, spread across pages
  const cand = [
    ...heads.map((h) => ({ text: h.text, url: h.url, kind: h.tag })),
    ...paras.flatMap((p) => p.text.split(/(?<=[.!?])\s+/).map((s) => ({ text: s.trim(), url: p.url, kind: 'p' }))),
  ].filter((c) => { const n = wordsOf(c.text).length; return n >= 3 && n <= 15; });
  const quotes = []; const usedUrl = {};
  for (let pass = 0; pass < 3 && quotes.length < 5; pass++) for (const c of cand) {
    if (quotes.length >= 5) break;
    if (quotes.some((q) => q.text === c.text)) continue;
    if ((usedUrl[c.url] || 0) > pass) continue;
    quotes.push(c); usedUrl[c.url] = (usedUrl[c.url] || 0) + 1;
  }
  // stats
  const hw = heads.map((h) => wordsOf(h.text).length);
  const caseOf = (t) => {
    const w = wordsOf(t).filter((x) => /^\p{L}/u.test(x));
    if (!w.length) return 'other';
    if (t === t.toUpperCase() && /\p{Lu}/u.test(t)) return 'upper';
    const caps = w.slice(1).filter((x) => /^\p{Lu}/u.test(x)).length / Math.max(1, w.length - 1);
    if (/^\p{Lu}/u.test(w[0]) && (w.length === 1 || caps < 0.34)) return 'sentence';
    if (caps >= 0.6) return 'title';
    return /^\p{Ll}/u.test(w[0]) ? 'lower' : 'sentence';
  };
  const cases = {}; heads.forEach((h) => { const c = caseOf(h.text); cases[c] = (cases[c] || 0) + 1; });
  const allText = [...heads.map((h) => h.text), ...paras.map((p) => p.text), ...ctas].join(' \n ');
  const YOU = lang === 'it' ? /\b(tu|ti|te|tuo|tua|tuoi|tue|voi|vi|vostro|vostra|vostri|vostre)\b/giu : /\b(you|your|yours|yourself)\b/giu;
  const WE = lang === 'it' ? /\b(noi|ci|nostro|nostra|nostri|nostre)\b/giu : /\b(we|our|ours|us)\b/giu;
  const you = (allText.match(YOU) || []).length; const we = (allText.match(WE) || []).length;
  const numHeads = heads.filter((h) => /\d/.test(h.text)).length;
  const xy = heads.filter((h) => /^[^,]{2,60},\s[^,]{2,60}$/.test(h.text)).length;
  const verbs = {}; ctas.forEach((c) => { const v = c.split(/\s+/)[0].toLowerCase(); verbs[v] = (verbs[v] || 0) + 1; });
  const excl = (allText.match(/!/g) || []).length;
  const stats = {
    lang, headlines: heads.length, headlineWordsMedian: median(hw), headlineWordsP80: [...hw].sort((a, b) => a - b)[Math.floor(hw.length * 0.8)] || 0,
    case: Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, round(v / (heads.length || 1), 2)])),
    you, we, numbersInHeadlines: round(numHeads / (heads.length || 1), 2), xyPattern: round(xy / (heads.length || 1), 2),
    ctaCount: ctas.length, ctaVerbs: top(verbs, 6).map(([v, c]) => ({ verb: v, count: c })), exclamations: excl, paragraphs: paras.length,
  };
  // rules come from the stats, not from taste
  const rules = [];
  rules.push({ title: 'Headline length', text: `Keep headlines to about ${stats.headlineWordsMedian} words; 80% of measured headlines have ${stats.headlineWordsP80} words or fewer.`, stat: `median ${stats.headlineWordsMedian} words, n=${stats.headlines}` });
  const topCase = top(cases)[0]?.[0] || 'sentence';
  const caseName = { sentence: 'sentence case', title: 'Title Case', upper: 'UPPERCASE', lower: 'lower case', other: 'mixed case' }[topCase];
  rules.push({ title: 'Case', text: `Write headlines in ${caseName}${topCase === 'sentence' ? ': capitalise the first word and proper nouns only' : ''}.`, stat: Object.entries(stats.case).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ') });
  const alt = [];
  if (you + we > 0) alt.push({ w: Math.abs(you - we) / (you + we) + 0.2, r: you >= we ? { title: 'Address', text: `Speak to the reader in the second person (${lang === 'it' ? 'tu/voi' : 'you'}) more than about the organisation.`, stat: `you ${you} vs we ${we}` } : { title: 'Address', text: 'Speak as the organisation (we) and describe what it does; second person is used less.', stat: `we ${we} vs you ${you}` } });
  if (stats.ctaVerbs.length) alt.push({ w: stats.ctaVerbs[0].count / (ctas.length || 1), r: { title: 'Calls to action', text: `Start calls to action with a verb; the most used is "${stats.ctaVerbs[0].verb}". Keep them to two or three words.`, stat: stats.ctaVerbs.map((v) => `${v.verb} ×${v.count}`).join(', ') } });
  alt.push({ w: excl === 0 ? 0.5 : 0.1, r: { title: 'Punctuation', text: excl === 0 ? 'Do not use exclamation marks; none appear in the measured copy.' : `Use exclamation marks sparingly (${excl} in the measured copy).`, stat: `${excl} exclamation marks` } });
  if (numHeads) alt.push({ w: stats.numbersInHeadlines, r: { title: 'Numbers', text: 'Put figures in headlines as numerals when there is a measurable claim.', stat: `${Math.round(stats.numbersInHeadlines * 100)}% of headlines contain a number` } });
  rules.push(alt.sort((a, b) => b.w - a.w)[0].r);
  return { quotes, stats, rules, ctas: ctas.slice(0, 12), headlines: heads.slice(0, 20).map((h) => h.text) };
}

function motion(pages) {
  const eas = mergeCounts(pages.map((p) => p.easings));
  const dur = mergeCounts(pages.map((p) => p.durations));
  const cb = top(eas).find(([k]) => k.startsWith('cubic-bezier'));
  const easing = cb ? cb[0] : (top(eas)[0]?.[0] || 'ease-out');
  const d = top(dur)[0]?.[0] || '0.3s';
  return { easing, easingDeclared: !!cb, duration: d, easings: top(eas, 5).map(([k, v]) => ({ value: k, count: v })), durations: top(dur, 5).map(([k, v]) => ({ value: k, count: v })) };
}

export function analyse(snap) {
  const assumptions = [];
  const pages = snap.pages;
  const host = new URL(snap.source).host;
  const buttons = buttonVariants(pages);
  const type = analyseType(snap, pages, assumptions);
  const colour = analyseColour(pages, buttons, assumptions);
  const cardsRaw = pages.flatMap((p) => p.cards);
  const layout = analyseLayout(snap, pages, cardsRaw, assumptions);
  const components = analyseComponents(snap, pages, buttons, layout, colour, assumptions);
  const imagery = analyseImagery(pages);
  const voice = analyseVoice(snap, pages, buttons);
  const m = motion(pages);
  if (!m.easingDeclared) assumptions.push(`No cubic-bezier easing declared; motion uses "${m.easing}".`);
  const name = (pages[0].siteName || pages[0].title.split(/[|–—-]/).pop() || host).trim();
  assumptions.unshift(`Viewports: 1440×900 for all pages, 390×844 for the home page.`, `Pages: ${pages.map((p) => new URL(p.url).pathname).join(', ')} (home plus the highest-scoring same-origin links, one per top-level path).`);
  return {
    name, host, source: snap.source, capturedAt: snap.capturedAt, method: snap.method, lang: pages[0].lang, description: pages[0].description,
    pages: pages.map((p) => ({ url: p.url, title: p.title, height: p.docHeight, elements: p.type.length, chars: p.totalChars })),
    vars: pages[0].vars, varsCount: Object.keys(pages[0].vars || {}).length,
    type, colour, layout, components, imagery, voice, motion: m, assumptions,
  };
}
