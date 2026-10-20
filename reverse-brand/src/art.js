// Shared art direction for the guide, slides and video. Everything brand-specific reads
// the --brand-* tokens; nothing about the brand is hard-coded here.
import fs from 'node:fs';
import path from 'node:path';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const SLOTS = ['hero', 'horizon', 'object', 'street', 'sky', 'glass', 'grid', 'tokens', 'detail'];

// Gradient fallbacks: one per slot, built from colour tokens only.
export const slotFallbackCSS = `
.slot{position:relative;overflow:hidden;background-color:var(--brand-color-surface-inverse)}
.slot-img{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform 1.6s var(--brand-motion-ease)}
.img-hero{background-image:radial-gradient(120% 80% at 80% 10%,color-mix(in oklab,var(--brand-color-accent) 55%,transparent),transparent 60%),var(--brand-gradient-brand)}
.img-horizon{background-image:linear-gradient(180deg,color-mix(in oklab,var(--brand-color-action) 50%,var(--brand-color-surface-inverse)) 0%,var(--brand-color-surface-inverse) 58%,color-mix(in oklab,var(--brand-color-accent) 35%,var(--brand-color-surface-inverse)) 60%,var(--brand-color-surface-inverse) 100%)}
.img-object{background-image:radial-gradient(circle at 38% 36%,color-mix(in oklab,var(--brand-color-accent) 90%,white) 0,var(--brand-color-accent) 14%,transparent 34%),radial-gradient(circle at 64% 70%,var(--brand-color-action),transparent 48%),linear-gradient(160deg,var(--brand-color-surface-inverse),color-mix(in oklab,var(--brand-color-surface-inverse) 70%,black))}
.img-street{background-image:linear-gradient(100deg,transparent 0 30%,color-mix(in oklab,var(--brand-color-accent) 40%,transparent) 30% 31%,transparent 31%),linear-gradient(200deg,color-mix(in oklab,var(--brand-color-action) 70%,var(--brand-color-surface-inverse)),var(--brand-color-surface-inverse))}
.img-sky{background-image:linear-gradient(180deg,color-mix(in oklab,var(--brand-color-action) 45%,var(--brand-color-background)),var(--brand-color-background))}
.img-glass{background-image:repeating-linear-gradient(90deg,color-mix(in oklab,var(--brand-color-text-inverse) 14%,transparent) 0 18%,transparent 18% 20%),repeating-linear-gradient(0deg,color-mix(in oklab,var(--brand-color-text-inverse) 10%,transparent) 0 30%,transparent 30% 33%),linear-gradient(135deg,var(--brand-color-surface-inverse),color-mix(in oklab,var(--brand-color-action) 60%,var(--brand-color-surface-inverse)))}
.img-grid{background-image:linear-gradient(color-mix(in oklab,var(--brand-color-text) 12%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklab,var(--brand-color-text) 12%,transparent) 1px,transparent 1px),linear-gradient(180deg,var(--brand-color-surface),var(--brand-color-background));background-size:48px 48px,48px 48px,cover}
.img-tokens{background-image:radial-gradient(circle at 20% 30%,var(--brand-color-action) 0 8%,transparent 8.5%),radial-gradient(circle at 45% 60%,var(--brand-color-accent) 0 8%,transparent 8.5%),radial-gradient(circle at 70% 35%,var(--brand-color-action-alt) 0 8%,transparent 8.5%),radial-gradient(circle at 85% 70%,var(--brand-color-surface) 0 6%,transparent 6.5%),linear-gradient(135deg,var(--brand-color-surface-inverse),color-mix(in oklab,var(--brand-color-surface-inverse) 80%,var(--brand-color-action)))}
.img-detail{background-image:radial-gradient(60% 60% at 50% 45%,color-mix(in oklab,var(--brand-color-accent) 70%,transparent),transparent 70%),linear-gradient(180deg,var(--brand-color-action),var(--brand-color-surface-inverse))}
`;

// Each image is embedded once, as a CSS class; every element that needs it reuses the class.
export function slotImageCSS(manifest, imagesDir) {
  if (!manifest) return { css: '', have: new Set() };
  let css = ''; const have = new Set();
  for (const im of manifest.images) {
    if (!im.webp) continue;
    const b64 = fs.readFileSync(path.join(imagesDir, im.webp)).toString('base64');
    css += `.img-${im.slot}{background-image:url(data:image/webp;base64,${b64});background-size:cover}\n`;
    have.add(im.slot);
  }
  return { css, have };
}

export function imageLabel(slot, manifest) {
  const im = manifest?.images.find((i) => i.slot === slot && i.webp);
  if (!im) return '';
  return im.source === 'ai' ? 'AI-generated image' : 'Test image (procedural, not AI)';
}

// A media slot. In the light edition it is a gradient; in the hero edition it carries its label.
export function slot(name, manifest, { cls = '', label = '' } = {}) {
  const lab = imageLabel(name, manifest);
  return `<div class="slot ${cls}" data-slot="${name}"${lab ? ` data-image="${esc(lab)}"` : ''} role="img" aria-label="${esc(label || name + ' image slot')}${lab ? ' (' + esc(lab) + ')' : ''}"><div class="slot-img img-${name}"></div>${lab ? `<span class="ai-label">${esc(lab)}</span>` : ''}</div>`;
}

// Styles shared by every output: grounds, type roles, rebuilt brand components.
export const baseCSS = `
*,*::before,*::after{box-sizing:border-box}
.ground{background:var(--brand-color-background);color:var(--brand-color-text)}
.ground-alt{background:var(--brand-color-surface);color:var(--brand-color-text)}
.ground-inv{background:var(--brand-color-surface-inverse);color:var(--brand-color-text-inverse)}
.muted{color:var(--brand-color-text-muted)}
.ground-inv .muted,.on-photo .muted{color:color-mix(in oklab,var(--brand-color-text-inverse) 72%,transparent)}
.t-display{font-family:var(--brand-type-display-family,var(--brand-font-heading));font-size:var(--brand-type-display-size,var(--brand-type-h1-size));font-weight:var(--brand-type-display-weight,var(--brand-type-h1-weight));line-height:var(--brand-type-display-line-height,var(--brand-type-h1-line-height));letter-spacing:var(--brand-type-display-tracking,var(--brand-type-h1-tracking));text-wrap:balance}
.t-h1{font-family:var(--brand-type-h1-family);font-size:var(--brand-type-h1-size);font-weight:var(--brand-type-h1-weight);line-height:var(--brand-type-h1-line-height);letter-spacing:var(--brand-type-h1-tracking);text-wrap:balance}
.t-h2{font-family:var(--brand-type-h2-family,var(--brand-font-heading));font-size:var(--brand-type-h2-size,var(--brand-type-h1-size));font-weight:var(--brand-type-h2-weight,var(--brand-type-h1-weight));line-height:var(--brand-type-h2-line-height,1.1);letter-spacing:var(--brand-type-h2-tracking,0);text-wrap:balance}
.t-h3{font-family:var(--brand-type-h3-family,var(--brand-font-heading));font-size:var(--brand-type-h3-size,1.5rem);font-weight:var(--brand-type-h3-weight,600);line-height:var(--brand-type-h3-line-height,1.25);letter-spacing:var(--brand-type-h3-tracking,0)}
.t-lead{font-family:var(--brand-type-lead-family,var(--brand-font-body));font-size:var(--brand-type-lead-size);font-weight:var(--brand-type-lead-weight);line-height:var(--brand-type-lead-line-height);letter-spacing:var(--brand-type-lead-tracking)}
.t-body{font-family:var(--brand-type-body-family);font-size:var(--brand-type-body-size);font-weight:var(--brand-type-body-weight);line-height:var(--brand-type-body-line-height);letter-spacing:var(--brand-type-body-tracking)}
.t-small{font-family:var(--brand-type-small-family,var(--brand-font-body));font-size:var(--brand-type-small-size,0.8125rem);font-weight:var(--brand-type-small-weight,400);line-height:var(--brand-type-small-line-height,1.5);letter-spacing:var(--brand-type-small-tracking,0)}
.rb-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:var(--brand-button-height);padding:0 var(--brand-button-pad-x);border-radius:var(--brand-button-radius);background:var(--brand-button-bg);color:var(--brand-button-fg);font-family:var(--brand-font-body);font-size:var(--brand-button-font-size);font-weight:var(--brand-button-font-weight);letter-spacing:var(--brand-button-tracking);line-height:1;border:0;text-decoration:none;white-space:nowrap;cursor:pointer;transition:transform var(--brand-motion-duration) var(--brand-motion-ease),filter var(--brand-motion-duration) var(--brand-motion-ease)}
.rb-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
.rb-btn:focus-visible{outline:2px solid var(--brand-color-accent);outline-offset:3px}
.rb-btn.outline{background:transparent;color:inherit;box-shadow:inset 0 0 0 var(--brand-button-outline-border-width,1.5px) currentColor}
.rb-btn.glass{background:var(--brand-button-glass-bg,rgba(255,255,255,.16));-webkit-backdrop-filter:var(--brand-button-glass-backdrop,blur(16px));backdrop-filter:var(--brand-button-glass-backdrop,blur(16px));color:var(--brand-color-text-inverse)}
.rb-btn.alt{background:var(--brand-color-action-alt);color:var(--brand-color-background)}
.rb-btn.small{height:calc(var(--brand-button-height) * .75);padding:0 calc(var(--brand-button-pad-x) * .7);font-size:calc(var(--brand-button-font-size) * .9)}
.rb-card{background:var(--brand-card-bg,var(--brand-color-surface));border-radius:var(--brand-card-radius,var(--brand-radius-card));box-shadow:var(--brand-card-shadow,none);-webkit-backdrop-filter:var(--brand-card-backdrop,none);backdrop-filter:var(--brand-card-backdrop,none);overflow:hidden;color:var(--brand-color-text)}
.rb-card .rb-media{aspect-ratio:var(--brand-card-media-ratio,16 / 9);position:relative;overflow:hidden}
.rb-card .rb-body{padding:var(--brand-card-pad,24px)}
.rb-card .muted{color:var(--brand-color-text-muted)}
.rb-input{height:var(--brand-input-height);padding:0 var(--brand-input-pad-x);border-radius:var(--brand-radius-input);border:var(--brand-input-border-width) solid var(--brand-input-border);background:var(--brand-input-bg);color:var(--brand-color-text);font-family:var(--brand-font-body);font-size:var(--brand-input-font-size);min-width:0}
.glass-card{background:color-mix(in oklab,var(--brand-color-surface-inverse) 28%,transparent);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);border:1px solid color-mix(in oklab,var(--brand-color-text-inverse) 22%,transparent);border-radius:var(--brand-radius-card);color:var(--brand-color-text-inverse)}
.pill-unofficial{display:inline-flex;align-items:center;gap:.4em;padding:.35em .8em;border-radius:999px;font:600 12px/1 var(--brand-font-body);letter-spacing:.06em;text-transform:uppercase;background:color-mix(in oklab,var(--brand-color-accent) 22%,transparent);color:inherit;border:1px solid color-mix(in oklab,currentColor 30%,transparent);white-space:nowrap}
.ai-label{position:absolute;left:10px;bottom:10px;max-width:calc(100% - 20px);z-index:2;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.62);color:#fff;font:600 11px/1.2 var(--brand-font-body);letter-spacing:.02em;pointer-events:none}
`;
