// Phase 3: tokens. CSS custom properties and the same set as W3C design-tokens JSON.
import { oklchString, rgba } from './color.js';

const r = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const q = (s) => (/[\s"]/.test(s) && !s.includes(',') ? `"${s}"` : s);
const stack = (fam, generic) => `${q(fam)}, ${generic}`;

export function buildTokens(m) {
  const t = m.type.roles; const c = m.colour.roles; const L = m.layout; const C = m.components;
  const headingFam = (t.display || t.h1 || t.body).family;
  const bodyFam = t.body.family;
  const generic = (f) => (/serif|garamond|times|georgia|playfair|merriweather|lora/i.test(f) && !/sans/i.test(f) ? 'Georgia, serif' : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
  const v = {};   // css var -> value
  const j = {};   // nested DTCG json
  const set = (path, type, value, ext) => {
    const name = '--brand-' + path.join('-');
    v[name] = typeof value === 'object' && value.css ? value.css : value;
    let o = j; path.slice(0, -1).forEach((p) => (o = o[p] = o[p] || {}));
    o[path[path.length - 1]] = { $type: type, $value: typeof value === 'object' && value.json !== undefined ? value.json : value, ...(ext ? { $extensions: { 'com.reverse-brand': ext } } : {}) };
  };

  set(['font', 'heading'], 'fontFamily', { css: stack(headingFam, generic(headingFam)), json: [headingFam, ...generic(headingFam).split(', ').map((s) => s.replace(/"/g, ''))] });
  set(['font', 'body'], 'fontFamily', { css: stack(bodyFam, generic(bodyFam)), json: [bodyFam, ...generic(bodyFam).split(', ').map((s) => s.replace(/"/g, ''))] });

  for (const [role, s] of Object.entries(t)) {
    const fam = s.family === bodyFam ? 'body' : 'heading';
    set(['type', role, 'size'], 'dimension', { css: s.clamp, json: `${s.size}px` }, { mobile: `${s.mobile}px`, desktop: `${s.size}px`, clamp: s.clamp, inferred: s.inferred || undefined });
    set(['type', role, 'line-height'], 'number', s.lh);
    set(['type', role, 'weight'], 'fontWeight', s.weight);
    set(['type', role, 'tracking'], 'dimension', { css: `${s.tracking}em`, json: `${s.tracking}em` });
    set(['type', role, 'family'], 'fontFamily', { css: `var(--brand-font-${fam})`, json: `{font.${fam}}` });
    if (s.transform && s.transform !== 'none') set(['type', role, 'transform'], 'string', s.transform);
  }

  for (const [role, x] of Object.entries(c)) set(['color', role], 'color', x.hex, { oklch: x.oklch, share: x.share, contrast: `${x.contrast}:1 vs ${x.contrastWith}`, inferred: x.inferred || undefined });
  // measured palette, so every swatch in the guide is a token too
  const palHex = [...new Set([...m.colour.palette.slice(0, 24).map((p) => p.hex), ...m.colour.pairs.flatMap((p) => [p.fg, p.bg]), ...m.colour.stops])];
  const palIndex = {};
  palHex.forEach((h, i) => { palIndex[h] = `--brand-palette-${i + 1}`; set(['palette', String(i + 1)], 'color', h, { oklch: oklchString(h), share: m.colour.palette.find((p) => p.hex === h)?.share ?? 0 }); });
  set(['gradient', 'brand'], 'gradient', { css: m.colour.brandGradient, json: m.colour.brandGradient }, { inferred: m.colour.gradientInferred || undefined });

  set(['space', 'base'], 'dimension', `${L.base}px`);
  L.scale.forEach((px, i) => set(['space', String(i + 1)], 'dimension', `${px}px`));
  set(['layout', 'container'], 'dimension', `${L.container}px`);
  set(['layout', 'columns'], 'number', L.columns);
  set(['layout', 'gutter'], 'dimension', `${L.gutter}px`);
  L.breakpoints.forEach((b) => set(['layout', 'bp', String(b.px)], 'dimension', `${b.px}px`));

  const b0 = C.buttons.find((b) => b.variant === 'filled') || C.buttons[0];
  const pill = (b) => (b.pill ? '999px' : `${b.radius}px`);
  const btnRadius = b0 ? pill(b0) : '8px';
  const rv = L.radii.values.filter((x) => x.px < 200).sort((a, b) => b.count - a.count).slice(0, 3).map((x) => x.px).sort((a, b) => a - b);
  rv.forEach((px, i) => set(['radius', ['sm', 'md', 'lg'][i]], 'dimension', `${px}px`));
  set(['radius', 'pill'], 'dimension', '999px');
  set(['radius', 'card'], 'dimension', `${L.radii.card || rv[rv.length - 1] || 12}px`);
  set(['radius', 'button'], 'dimension', btnRadius);
  set(['radius', 'input'], 'dimension', C.input.radius >= C.input.h / 2 - 1 ? '999px' : `${C.input.radius}px`);

  if (b0) {
    set(['button', 'height'], 'dimension', `${b0.h}px`);
    set(['button', 'pad-x'], 'dimension', `${b0.pad[1]}px`);
    set(['button', 'radius'], 'dimension', { css: 'var(--brand-radius-button)', json: '{radius.button}' });
    set(['button', 'bg'], 'color', b0.bg || c.action.hex);
    set(['button', 'fg'], 'color', b0.color || c['on-action'].hex);
    set(['button', 'font-size'], 'dimension', `${b0.font.size}px`);
    set(['button', 'font-weight'], 'fontWeight', b0.font.weight);
    set(['button', 'tracking'], 'dimension', `${b0.font.size ? r(b0.font.ls / b0.font.size) : 0}em`);
    const out = C.buttons.find((b) => b.variant === 'outline');
    if (out) { set(['button', 'outline', 'border-width'], 'dimension', `${out.border.w}px`); set(['button', 'outline', 'color'], 'color', out.border.c); }
    const glass = C.buttons.find((b) => b.variant === 'translucent');
    if (glass) { set(['button', 'glass', 'bg'], 'color', { css: rgba(glass.bg || '#ffffff', glass.bgA), json: rgba(glass.bg || '#ffffff', glass.bgA) }); set(['button', 'glass', 'backdrop'], 'string', glass.backdrop || 'none'); }
  }
  const card = C.cards[0];
  if (card) {
    set(['card', 'bg'], 'color', card.bg ? (card.bgA < 1 ? { css: rgba(card.bg, card.bgA), json: rgba(card.bg, card.bgA) } : card.bg) : c.surface.hex);
    set(['card', 'radius'], 'dimension', `${card.radius}px`);
    set(['card', 'pad'], 'dimension', `${card.padding[1] || card.padding[0]}px`);
    set(['card', 'shadow'], 'shadow', card.shadow || 'none');
    set(['card', 'backdrop'], 'string', card.backdrop || 'none');
    set(['card', 'media'], 'string', card.media || 'none');
  }
  const ratio = (m.imagery.ratios[0]?.key || '16:9').includes(':') ? m.imagery.ratios[0].key.replace(':', ' / ') : '16 / 9';
  set(['card', 'media-ratio'], 'string', ratio);
  const I = C.input;
  set(['input', 'height'], 'dimension', `${I.h}px`);
  set(['input', 'pad-x'], 'dimension', `${I.pad[1] || 16}px`);
  set(['input', 'bg'], 'color', I.bg || c.background.hex);
  set(['input', 'border'], 'color', I.border?.c || c.border.hex);
  set(['input', 'border-width'], 'dimension', `${I.border?.w || 1}px`);
  set(['input', 'font-size'], 'dimension', `${I.font?.size || 16}px`);
  if (I.inferred) j.input.$description = 'inferred: no form fields were found on the captured pages';
  const N = C.nav;
  if (N) {
    set(['nav', 'height'], 'dimension', `${N.h}px`);
    set(['nav', 'bg'], 'color', N.bg ? { css: rgba(N.bg.hex, N.bg.a), json: rgba(N.bg.hex, N.bg.a) } : c.background.hex);
    set(['nav', 'backdrop'], 'string', N.backdrop || 'none');
    set(['nav', 'sticky'], 'string', N.sticky ? 'sticky' : 'static');
    if (N.linkStyle) { set(['nav', 'link-size'], 'dimension', `${N.linkStyle.size}px`); set(['nav', 'link-weight'], 'fontWeight', N.linkStyle.weight); set(['nav', 'link-color'], 'color', N.linkStyle.color || c.text.hex); }
    if (N.logo) { set(['nav', 'logo-w'], 'dimension', `${N.logo.w}px`); set(['nav', 'logo-h'], 'dimension', `${N.logo.h}px`); set(['nav', 'logo-color'], 'color', N.logo.color || c.text.hex); }
  }
  set(['motion', 'ease'], 'cubicBezier', { css: m.motion.easing, json: (m.motion.easing.match(/[\d.]+/g) || [0.25, 0.1, 0.25, 1]).map(Number) });
  set(['motion', 'duration'], 'duration', m.motion.duration.endsWith('ms') ? m.motion.duration : `${Math.round(parseFloat(m.motion.duration) * 1000)}ms`);

  const css = `/* ${m.name} — unofficial design tokens measured from ${m.source} by reverse-brand.\n   Unofficial analysis. Not affiliated with or endorsed by ${m.name}. Trademarks belong to their owners. */\n:root {\n${Object.entries(v).map(([k, x]) => `  ${k}: ${x};`).join('\n')}\n}\n`;
  const json = { $description: `Unofficial analysis of ${m.source}. Not affiliated with or endorsed by ${m.name}. Trademarks belong to their owners.`, ...j };
  return { vars: v, css, json, palIndex };
}

export { oklchString };
