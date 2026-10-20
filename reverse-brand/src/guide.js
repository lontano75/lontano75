// Phase 4: the guide. A sequence of full pages that mirror the site's own patterns,
// art-directed from the measured tokens. Two editions: light (no images) and hero (WebP).
import { esc, slot, slotFallbackCSS, slotImageCSS, baseCSS } from './art.js';
import { isDark } from './color.js';

const pct = (n) => `${Math.round(n * 1000) / 10}%`;
const px = (n) => `${n}px`;
const ARROW = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15L15 5M7 5h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const css = `
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--brand-color-background);color:var(--brand-color-text);font-family:var(--brand-font-body);font-size:var(--brand-type-body-size);line-height:var(--brand-type-body-line-height);overflow-x:hidden}
a{color:inherit}
h1,h2,h3,h4,p,figure,blockquote{margin:0}
.wrap{width:100%;max-width:var(--brand-layout-container);margin:0 auto;padding:0 20px}
.page{position:relative;padding:calc(var(--brand-space-base) * 16) 0;scroll-margin-top:56px}
.page>.wrap>*+*{margin-top:calc(var(--brand-space-base) * 6)}
.eyebrow{display:flex;align-items:center;gap:12px;font:600 12px/1 var(--brand-font-body);letter-spacing:.12em;text-transform:uppercase;opacity:.75}
.eyebrow b{font-variant-numeric:tabular-nums}
.chapter-head{display:grid;gap:calc(var(--brand-space-base) * 3)}
.chapter-head p{max-width:62ch}
/* top bar: transparent over the cover, frosted after */
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;height:56px;display:flex;align-items:center;gap:16px;padding:0 20px;color:var(--brand-color-text-inverse);transition:background var(--brand-motion-duration) var(--brand-motion-ease),color var(--brand-motion-duration) var(--brand-motion-ease)}
.topbar.scrolled{background:var(--brand-nav-bg,color-mix(in oklab,var(--brand-color-background) 85%,transparent));-webkit-backdrop-filter:var(--brand-nav-backdrop,blur(12px));backdrop-filter:blur(14px) saturate(1.2);color:var(--brand-color-text);box-shadow:0 1px 0 color-mix(in oklab,var(--brand-color-text) 12%,transparent)}
.topbar .name{font:var(--brand-type-h3-weight,600) 15px/1 var(--brand-font-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;text-decoration:none}
.topbar nav{display:flex;gap:18px;margin-left:auto;font-size:13px;white-space:nowrap}
.topbar nav a{text-decoration:none;opacity:.85}.topbar nav a:hover{opacity:1}
@media (max-width:1100px){.topbar nav{display:none}.topbar .pill-unofficial{margin-left:auto}}
/* cover */
.cover{position:relative;min-height:100svh;display:flex;align-items:flex-end;color:var(--brand-color-text-inverse);overflow:hidden;padding:0}
.cover>.slot{position:absolute;inset:0}
.cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,color-mix(in oklab,var(--brand-color-surface-inverse) 55%,transparent) 0,transparent 30%,transparent 45%,color-mix(in oklab,var(--brand-color-surface-inverse) 80%,transparent) 100%);pointer-events:none}
.cover .wrap{position:relative;z-index:2;padding-top:120px;padding-bottom:28px;display:grid;gap:28px}
.cover-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:40px;align-items:end}
.cover h1{max-width:14ch}
.cover .lede{max-width:46ch;margin-top:20px}
.cover .cta{margin-top:28px;display:flex;gap:12px;flex-wrap:wrap}
.token-card{padding:24px;display:grid;gap:14px;max-width:360px;justify-self:end;width:100%}
.token-card .sw{height:84px;border-radius:calc(var(--brand-radius-card) * .6);background:var(--brand-color-action)}
.token-card code{font:500 13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
.cover-foot{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding-top:20px;border-top:1px solid color-mix(in oklab,var(--brand-color-text-inverse) 25%,transparent);font-size:13px}
@media (max-width:860px){.cover-grid{grid-template-columns:1fr}.token-card{justify-self:start}}
/* overview */
.overview{text-align:center}
.overview h2{margin:0 auto;max-width:18ch}
.overview p.t-lead{margin-left:auto;margin-right:auto;max-width:56ch}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.stat{padding:28px 16px;border-radius:var(--brand-radius-card);background:var(--brand-color-surface)}
.stat b{display:block;font-family:var(--brand-font-heading);font-size:var(--brand-type-h1-size);font-weight:var(--brand-type-h1-weight);line-height:1;letter-spacing:var(--brand-type-h1-tracking)}
.stat span{display:block;margin-top:10px;font-size:14px}
@media (max-width:860px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* contents: image cards */
.toc{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--brand-layout-gutter)}
.toc a{position:relative;display:block;aspect-ratio:4/5;border-radius:var(--brand-radius-card);overflow:hidden;color:var(--brand-color-text-inverse);text-decoration:none;isolation:isolate}
.toc a .slot{position:absolute;inset:0}
.toc a::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),transparent 35%,transparent 55%,rgba(0,0,0,.55));z-index:1}
.toc a:hover .slot-img,.toc a:focus-visible .slot-img{transform:scale(1.07)}
.toc .num,.toc .arr,.toc .ttl{position:absolute;z-index:2}
.toc .num{top:16px;left:18px;font:600 13px/1 var(--brand-font-body);letter-spacing:.06em}
.toc .arr{top:14px;right:14px;width:36px;height:36px;border-radius:999px;display:grid;place-items:center;background:color-mix(in oklab,var(--brand-color-text-inverse) 18%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.toc .ttl{left:18px;right:18px;bottom:18px;font-family:var(--brand-font-heading);font-size:var(--brand-type-h3-size,1.5rem);font-weight:var(--brand-type-h3-weight,600);line-height:1.15}
.toc .ai-label{bottom:auto;top:58px;left:18px}
@media (max-width:1000px){.toc{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:480px){.toc .ttl{font-size:1.1rem}}
/* rebuild test */
.rebuild{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-radius:var(--brand-radius-card);overflow:hidden;box-shadow:inset 0 0 0 1px var(--brand-color-border)}
.rb-media>.slot{position:absolute;inset:0}
.rebuild>div{padding:32px;display:grid;gap:20px;align-content:start}
.rebuild .cards{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.rebuild .rb-card h3{font-size:18px;line-height:1.25;font-family:var(--brand-font-heading);font-weight:var(--brand-type-h3-weight,600)}
.rebuild .rb-card p{font-size:14px;margin-top:6px}
.spec{font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.8;overflow-wrap:anywhere}
@media (max-width:860px){.rebuild,.rebuild .cards{grid-template-columns:minmax(0,1fr)}}
/* chapter with full-bleed photo */
.chapter{position:relative;min-height:92svh;display:flex;align-items:center;overflow:hidden;padding:120px 0 80px;color:var(--brand-color-text-inverse)}
.chapter>.slot{position:absolute;inset:0}
.kb .slot-img{animation:kb 28s var(--brand-motion-ease) infinite alternate}
@keyframes kb{from{transform:scale(1)}to{transform:scale(1.09) translate(-1%,-1%)}}
.chapter .wrap{position:relative;z-index:2}
.specimen{padding:clamp(20px,3vw,40px);max-width:980px;display:grid;gap:24px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips .rb-btn[aria-selected=true]{background:var(--brand-color-text-inverse);color:var(--brand-color-surface-inverse)}
.panel{min-height:200px;display:grid;gap:14px;align-content:start}
.panel .sample{overflow-wrap:anywhere}
html.js .panel:not(.active){display:none}
/* fonts */
.families{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:var(--brand-layout-gutter)}
.family{padding:32px;border-radius:var(--brand-radius-card);background:var(--brand-color-surface);display:grid;gap:18px}
.family .aa{font-size:clamp(96px,14vw,180px);line-height:.9;letter-spacing:-.02em}
.weights{display:grid;gap:6px}
.weights div{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--brand-color-border);padding-top:6px}
.check{display:inline-flex;gap:8px;align-items:center;font-size:13px}
.check i{width:8px;height:8px;border-radius:50%;background:var(--brand-color-text-muted)}
.check.yes i{background:#1a9e55}.check.no i{background:#d24b3a}
.charset{font-size:clamp(22px,3vw,40px);line-height:1.35;overflow-wrap:anywhere;letter-spacing:.02em}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid color-mix(in oklab,currentColor 14%,transparent);vertical-align:top}
th{font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
.table-scroll{overflow-x:auto;max-width:100%}
.table-scroll table{min-width:640px}
.bars{display:grid;gap:8px}
.bar{display:grid;grid-template-columns:64px 1fr 56px;gap:12px;align-items:center;font-size:13px}
.bar i{display:block;height:10px;border-radius:999px;background:var(--brand-color-action)}
.vars{columns:2 320px;font:500 12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
/* colour */
.split{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:calc(var(--brand-space-base) * 6);align-items:stretch}
.split>.slot{border-radius:var(--brand-radius-card);min-height:420px}
@media (max-width:900px){.split{grid-template-columns:1fr}.split>.slot{min-height:300px}}
.palette-bar{display:flex;height:120px;border-radius:var(--brand-radius-card);overflow:hidden;box-shadow:0 0 0 1px color-mix(in oklab,currentColor 25%,transparent)}
.palette-bar i{display:block;min-width:4px}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;font:500 12px/1.4 ui-monospace,monospace}
.legend span{display:inline-flex;gap:6px;align-items:center}.legend b{width:12px;height:12px;border-radius:3px;display:inline-block;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 25%,transparent)}
.roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:16px}
.role{border-radius:calc(var(--brand-radius-card) * .7);overflow:hidden;background:color-mix(in oklab,var(--brand-color-text-inverse) 7%,transparent)}
.role .sw{height:96px;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 22%,transparent)}
.role div.meta{padding:14px;display:grid;gap:4px;font-size:13px}
.role code{font:500 12px/1.3 ui-monospace,monospace;overflow-wrap:anywhere}
.badge{display:inline-block;padding:2px 7px;border-radius:999px;font:600 11px/1.4 var(--brand-font-body);background:color-mix(in oklab,currentColor 14%,transparent)}
.badge.pass{background:#1a9e55;color:#fff}.badge.fail{background:#d24b3a;color:#fff}
.gradient{height:120px;border-radius:var(--brand-radius-card);background:var(--brand-gradient-brand)}
.pairs{display:grid;gap:10px}
.pair{display:grid;grid-template-columns:72px 1fr auto;gap:16px;align-items:center;font-size:13px}
.pair .aa{height:56px;border-radius:12px;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 18%,transparent);display:grid;place-items:center;font:700 22px/1 var(--brand-font-heading)}
details{border-top:1px solid color-mix(in oklab,currentColor 20%,transparent);padding-top:16px}
summary{cursor:pointer;font-weight:600}
/* layout */
.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.fact b{display:block;font-family:var(--brand-font-heading);font-size:var(--brand-type-h2-size,3rem);font-weight:var(--brand-type-h2-weight,600);line-height:1;letter-spacing:var(--brand-type-h2-tracking,0)}
.fact span{display:block;margin-top:8px;font-size:14px}
@media (max-width:860px){.facts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cols{display:grid;grid-template-columns:repeat(var(--brand-layout-columns),minmax(0,1fr));gap:var(--brand-layout-gutter);height:180px;padding:0;border:1px dashed color-mix(in oklab,currentColor 30%,transparent);border-radius:8px}
.cols i{background:color-mix(in oklab,var(--brand-color-action) 18%,transparent);border-left:1px solid color-mix(in oklab,var(--brand-color-action) 50%,transparent);border-right:1px solid color-mix(in oklab,var(--brand-color-action) 50%,transparent)}
.stairs{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.stairs div{display:grid;gap:6px;justify-items:start;font:500 11px/1 ui-monospace,monospace}
.stairs i{display:block;background:var(--brand-color-action);border-radius:2px}
.radii{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:16px}
.radii div{display:grid;gap:8px;font-size:13px}
.radii i{display:block;height:96px;background:var(--brand-color-surface);border:1.5px solid var(--brand-color-action);border-radius:inherit}
.radii div>span{border-radius:0}
.ruler{position:relative;height:64px;border-bottom:2px solid currentColor;margin:0 8px}
.ruler span{position:absolute;bottom:-2px;transform:translateX(-50%);display:grid;justify-items:center;gap:6px;font:500 11px/1 ui-monospace,monospace}
.ruler span::after{content:"";width:2px;height:22px;background:var(--brand-color-action);order:2}
.rhythm{display:grid;gap:3px;border-radius:12px;overflow:hidden;max-width:520px}
.rhythm div{display:flex;align-items:center;justify-content:space-between;padding:0 14px;font:500 12px/1 ui-monospace,monospace;min-height:22px}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:calc(var(--brand-space-base) * 6)}
@media (max-width:860px){.two{grid-template-columns:minmax(0,1fr)}}
/* components */
.head-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:center}
.head-split .slot{aspect-ratio:4/3;border-radius:var(--brand-radius-card)}
@media (max-width:860px){.head-split{grid-template-columns:1fr}}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
.tile{border-radius:var(--brand-radius-card);padding:28px 24px;display:grid;gap:18px;justify-items:start;box-shadow:inset 0 0 0 1px color-mix(in oklab,currentColor 12%,transparent)}
.navmock{display:flex;align-items:center;gap:24px;height:var(--brand-nav-height,64px);padding:0 24px;background:var(--brand-nav-bg);-webkit-backdrop-filter:var(--brand-nav-backdrop);backdrop-filter:var(--brand-nav-backdrop);border-radius:12px;color:var(--brand-color-text);overflow:hidden}
.navmock .logo{flex:none;width:var(--brand-nav-logo-w,120px);height:var(--brand-nav-logo-h,28px);border:1.5px dashed var(--brand-nav-logo-color,currentColor);border-radius:4px;display:grid;place-items:center;font:600 10px/1 ui-monospace,monospace;color:var(--brand-nav-logo-color,currentColor);white-space:nowrap;overflow:hidden}
.navmock nav{display:flex;gap:var(--brand-nav-gap,24px);font-size:var(--brand-nav-link-size);font-weight:var(--brand-nav-link-weight);color:var(--brand-nav-link-color);white-space:nowrap;overflow:hidden;min-width:0}
.navmock .rb-btn{margin-left:auto;flex:none}
@media (max-width:700px){.navmock nav{display:none}}
.cards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--brand-layout-gutter)}
@media (max-width:860px){.cards3{grid-template-columns:1fr}}
.cards3 .rb-card h3{font-family:var(--brand-font-heading);font-size:var(--brand-type-h3-size,1.5rem);font-weight:var(--brand-type-h3-weight,600);line-height:1.2}
.form{display:flex;gap:12px;flex-wrap:wrap;max-width:560px}.form .rb-input{flex:1 1 220px}
/* imagery */
.mosaic{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:120px;gap:12px}
.mosaic .slot{border-radius:calc(var(--brand-radius-card) * .7)}
.mosaic .m1{grid-column:span 4;grid-row:span 3}.mosaic .m2{grid-column:span 2;grid-row:span 2}.mosaic .m3{grid-column:span 2;grid-row:span 1}
.mosaic .m4{grid-column:span 2;grid-row:span 2}.mosaic .m5{grid-column:span 2;grid-row:span 2}.mosaic .m6{grid-column:span 2;grid-row:span 2}
@media (max-width:700px){.mosaic{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:110px}.mosaic .slot{grid-column:span 1!important;grid-row:span 2!important}.mosaic .m1{grid-column:span 2!important}}
.list{display:grid;gap:8px;padding:0;margin:0;list-style:none}
.list li{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid color-mix(in oklab,currentColor 14%,transparent);padding-bottom:8px;overflow-wrap:anywhere}
/* voice */
.quotes{display:grid;gap:36px}
.quotes blockquote{font-family:var(--brand-font-heading);font-size:var(--brand-type-h2-size,2.5rem);font-weight:var(--brand-type-h2-weight,600);line-height:var(--brand-type-h2-line-height,1.15);letter-spacing:var(--brand-type-h2-tracking,0);text-wrap:balance;overflow-wrap:anywhere}
.quotes blockquote::before{content:"\\201C"}.quotes blockquote::after{content:"\\201D"}
.quotes cite{display:block;margin-top:10px;font:500 13px/1.4 var(--brand-font-body);font-style:normal;overflow-wrap:anywhere}
.rules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--brand-layout-gutter)}
.rule{padding:28px;border-radius:var(--brand-radius-card);background:var(--brand-color-surface);display:grid;gap:12px;align-content:start}
.ground-alt .rule,.ground-alt .stat{background:var(--brand-color-background);box-shadow:inset 0 0 0 1px var(--brand-color-border)}
.rule .n{font:600 13px/1 var(--brand-font-body);color:var(--brand-color-action)}
@media (max-width:860px){.rules{grid-template-columns:1fr}}
/* tokens */
.toolbar{display:flex;gap:12px;flex-wrap:wrap}
pre{margin:0;max-height:420px;overflow:auto;padding:20px;border-radius:calc(var(--brand-radius-card) * .6);background:color-mix(in oklab,var(--brand-color-text-inverse) 8%,transparent);font:500 12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;max-width:100%}
/* footer */
footer.foot{padding:48px 0 64px;font-size:13px}
footer.foot .wrap{display:grid;gap:12px}
/* motion */
html.js .reveal{opacity:0;transform:translateY(28px);transition:opacity .9s var(--brand-motion-ease),transform .9s var(--brand-motion-ease)}
html.js .reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}html.js .reveal{opacity:1;transform:none;transition:none}.kb .slot-img{animation:none}.slot-img,.rb-btn{transition:none}}
@media (max-width:600px){.page{padding:calc(var(--brand-space-base) * 10) 0}.rebuild>div,.family,.rule{padding:20px}}
`;

const js = `
(function(){
var d=document,h=d.documentElement;h.classList.add('js');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var els=d.querySelectorAll('.reveal');
if(reduce||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});els.forEach(function(e){io.observe(e)})}
var bar=d.querySelector('.topbar'),cover=d.getElementById('cover');
function onScroll(){bar.classList.toggle('scrolled',scrollY>cover.offsetHeight-80)}addEventListener('scroll',onScroll,{passive:true});onScroll();
d.querySelectorAll('[role=tablist]').forEach(function(tl){var tabs=tl.querySelectorAll('[role=tab]');tabs.forEach(function(t){t.addEventListener('click',function(){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);d.getElementById(x.getAttribute('aria-controls')).classList.toggle('active',on)})})})});
var c=d.createElement('canvas').getContext('2d');
function w(f){c.font='72px '+f;return c.measureText('mmmmmmmmmlli WAQ@#1').width}
d.querySelectorAll('.check').forEach(function(el){var f=el.getAttribute('data-family'),ok=false;['monospace','serif','sans-serif'].forEach(function(g){if(w('"'+f+'",'+g)!==w(g))ok=true});el.classList.add(ok?'yes':'no');el.querySelector('span').textContent=ok?'Installed on this device':'Not installed on this device (fallback shown)'});
function txt(id){return d.getElementById(id).textContent.trim()}
d.querySelectorAll('pre[data-from]').forEach(function(p){p.textContent=txt(p.getAttribute('data-from'))});
function flash(b,m){var o=b.textContent;b.textContent=m;setTimeout(function(){b.textContent=o},1400)}
d.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var t=txt(b.getAttribute('data-copy'));(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){flash(b,'Copied')},function(){flash(b,'Copy failed')})})});
d.querySelectorAll('[data-download]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-download'),a=d.createElement('a');a.href=URL.createObjectURL(new Blob([txt(id)],{type:id.indexOf('json')>-1?'application/json':'text/css'}));a.download=b.getAttribute('data-name');a.click()})});
})();
`;

const CHAPTERS = [
  ['typography', 'Typography', 'horizon'], ['fonts', 'Fonts', 'sky'], ['colour', 'Colour', 'object'], ['layout', 'Layout and spacing', 'grid'],
  ['components', 'Components', 'glass'], ['imagery', 'Imagery', 'detail'], ['voice', 'Voice and tone', 'street'], ['tokens', 'Design tokens', 'tokens'],
];

export function buildGuide({ model: m, tokens, prompts, manifest, imagesDir, runLog, edition = 'light' }) {
  const M = edition === 'hero' ? manifest : null;
  const S = (name, o) => slot(name, M, o);
  const { css: imgCSS } = edition === 'hero' ? slotImageCSS(manifest, imagesDir) : { css: '' };
  const t = m.type.roles; const c = m.colour.roles; const L = m.layout; const C = m.components; const V = m.voice; const I = m.imagery;
  const pv = (hex) => `var(${tokens.palIndex[hex] || '--brand-color-text'})`;
  const unofficial = `<span class="pill-unofficial">Unofficial analysis</span>`;
  const disclaimer = `Not affiliated with or endorsed by ${esc(m.name)}. Trademarks belong to their owners.`;
  const date = new Date(m.capturedAt).toISOString().slice(0, 10);
  const nBtn = C.buttons.length;
  const famCount = m.type.families.length;
  const roleCount = Object.keys(c).length;
  const head = (n, title, lede) => `<div class="chapter-head reveal"><div class="eyebrow"><b>${typeof n === 'number' ? String(n).padStart(2, '0') : n}</b><span>${esc(title)}</span></div><h2 class="t-h1">${esc(title)}</h2>${lede ? `<p class="t-lead muted">${lede}</p>` : ''}</div>`;

  // ---- cover ----
  const cover = `<section id="cover" class="cover">${S('hero', { cls: 'kb', label: 'Cover image' })}
<div class="wrap"><div class="cover-grid"><div class="reveal"><div class="eyebrow">${unofficial}</div>
<h1 class="t-display" style="margin-top:20px">${esc(m.name)} brand guidelines</h1>
<p class="t-lead lede">Measured from ${m.pages.length} pages of ${esc(m.host)} on ${date}: type, colour, layout, components, imagery and voice, rebuilt as tokens.</p>
<div class="cta"><a class="rb-btn" href="#contents">Open contents</a><a class="rb-btn glass" href="#tokens">Design tokens</a></div></div>
<aside class="glass-card token-card reveal" aria-label="Token sample"><div class="eyebrow">Token</div><div class="sw"></div><div><b>--brand-color-action</b><br><code>${c.action.hex} · ${c.action.oklch}</code></div><div class="spec">contrast on background ${c.action.contrast}:1</div></aside></div>
<div class="cover-foot">${unofficial}<span>${disclaimer}</span><a href="${esc(m.source)}" rel="noopener">Source: ${esc(m.host)}</a></div></div></section>`;

  // ---- overview ----
  const overview = `<section id="overview" class="page ground overview"><div class="wrap">
<div class="reveal"><div class="eyebrow" style="justify-content:center">What the site uses, measured</div><h2 class="t-h1" style="margin-top:16px">Overview</h2></div>
<p class="t-lead muted reveal">Computed styles of ${m.pages.reduce((a, p) => a + p.elements, 0)} text styles across ${m.pages.length} pages at 1440px, plus the home page at 390px. Repeated header and footer counts are counted once.</p>
<div class="stats reveal"><div class="stat"><b>${famCount}</b><span class="muted">typeface${famCount === 1 ? '' : 's'}</span></div><div class="stat"><b>${roleCount}</b><span class="muted">colour roles from ${m.colour.palette.length} colours</span></div><div class="stat"><b>${L.base}px</b><span class="muted">spacing base</span></div><div class="stat"><b>${nBtn}</b><span class="muted">button variants</span></div></div></div></section>`;

  // ---- contents ----
  const toc = `<section id="contents" class="page ground-alt"><div class="wrap">${head('—', 'Contents', 'Eight chapters. Each one shows measured values first, then the same values rebuilt from tokens.')}
<div class="toc">${CHAPTERS.map(([id, title, img], i) => `<a href="#${id}" class="reveal">${S(img, { label: title })}<span class="num">${String(i + 1).padStart(2, '0')}</span><span class="arr">${ARROW}</span><span class="ttl">${esc(title)}</span></a>`).join('')}</div></div></section>`;

  // ---- token rebuild test ----
  const rbCard = (title, body, img) => `<article class="rb-card" data-rebuild="card"><div class="rb-media">${S(img, { label: 'Card media' })}</div><div class="rb-body"><h3>${esc(title)}</h3><p class="muted">${esc(body)}</p></div></article>`;
  const rebuild = `<section id="rebuild" class="page ground"><div class="wrap">${head('Test', 'Token rebuild test', 'A button and two cards built only from the exported variables, on the site\'s light and dark grounds. verify.js compares their computed styles with the token values.')}
<div class="rebuild reveal"><div class="ground"><div class="eyebrow">Light ground · --brand-color-background</div><div><a class="rb-btn" data-rebuild="button" href="#tokens">${esc(C.buttons[0]?.labels[0] || 'Button')}</a></div>
<div class="cards">${rbCard('Card from tokens', `radius ${L.radii.card}px · padding ${tokens.vars['--brand-card-pad'] || '—'}`, 'sky')}${rbCard('Same tokens', `media ${tokens.vars['--brand-card-media-ratio']}`, 'grid')}</div>
<div class="spec">button: height ${tokens.vars['--brand-button-height']} · pad-x ${tokens.vars['--brand-button-pad-x']} · radius ${tokens.vars['--brand-radius-button']} · ${tokens.vars['--brand-button-font-size']}/${tokens.vars['--brand-button-font-weight']}</div></div>
<div class="ground-inv"><div class="eyebrow">Dark ground · --brand-color-surface-inverse</div><div><a class="rb-btn" href="#tokens">${esc(C.buttons[0]?.labels[0] || 'Button')}</a></div>
<div class="cards">${rbCard('Card from tokens', 'Same variables on the inverse ground.', 'horizon')}${rbCard('Same tokens', 'No overrides.', 'object')}</div></div></div></div></section>`;

  // ---- typography chapter ----
  const tabs = [
    ['Display', t.display ? 'display' : 'h1', 't-display'], ['Heading', t.display ? 'h1' : 'h2', t.display ? 't-h1' : 't-h2'], ['Subhead', t.h3 ? 'h3' : 'h2', t.h3 ? 't-h3' : 't-h2'], ['Lead', 'lead', 't-lead'], ['Body', 'body', 't-body'],
  ].filter(([, r]) => t[r]);
  const sample = { Display: m.name, Heading: 'Layout and spacing', Subhead: 'Measured at desktop width', Lead: `The ${m.name} site sets body copy in ${t.body.family} at ${t.body.size}px.`, Body: `Body text is set at ${t.body.size}px with a ${t.body.lh} line-height ratio. This paragraph uses the body role exactly as measured, so its length, rhythm and colour can be judged against the site. Values come from computed styles, not from the stylesheet source.` };
  const typo = `<section id="typography" class="chapter">${S('horizon', { cls: 'kb', label: 'Typography chapter image' })}<div class="wrap">
<div class="glass-card specimen reveal"><div class="eyebrow"><b>01</b><span>Type roles at real size</span>${unofficial}</div><h2 class="t-h3">Typography</h2>
<div class="chips" role="tablist" aria-label="Type roles">${tabs.map(([n], i) => `<button class="rb-btn glass small" role="tab" id="tab-${n}" aria-controls="panel-${n}" aria-selected="${i === 0}">${n}</button>`).join('')}</div>
${tabs.map(([n, r, cls], i) => { const s = t[r]; return `<div class="panel${i === 0 ? ' active' : ''}" id="panel-${n}" role="tabpanel" aria-labelledby="tab-${n}"><div class="sample ${cls}">${esc(sample[n])}</div><div class="spec">${r} · ${esc(s.family)} ${s.weight} · ${s.mobile}→${s.size}px · line-height ${s.lh} · tracking ${s.tracking}em${s.transform !== 'none' ? ' · ' + s.transform : ''}${s.inferred ? ' · inferred' : ''}</div></div>`; }).join('')}
</div></div></section>`;

  // ---- fonts ----
  const ladder = Object.entries(t);
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 àèéìòù ÀÈÉ ç ñ ß .,:;!?¿¡ \'"“”‘’ ()[]{} &@#%*+−=/ €$£ →';
  const fonts = `<section id="fonts" class="page ground"><div class="wrap">${head(2, 'Fonts', `${famCount} famil${famCount === 1 ? 'y' : 'ies'} by share of rendered characters. Font files are not copied; the guide asks your device for the family and falls back if it is missing.`)}
<div class="families">${m.type.families.map((f) => `<div class="family reveal"><div class="aa" style="font-family:${esc(f.stack)}">Aa</div><div><h3 class="t-h3" style="font-family:${esc(f.stack)}">${esc(f.family)}</h3><p class="muted">${pct(f.share)} of characters · roles: ${f.roles.join(', ') || '—'}${f.hosted.length ? ` · served from ${esc(f.hosted.join(', '))}` : ''}</p></div>
<div class="weights">${f.weights.map((w) => `<div style="font-family:${esc(f.stack)};font-weight:${w.weight}"><span>${w.weight}</span><span>${pct(w.share)}</span></div>`).join('')}</div>
<div class="check" data-family="${esc(f.family)}"><i></i><span>Checking this device…</span></div></div>`).join('')}</div>
<div class="reveal"><h3 class="t-h3">Character set</h3><p class="charset" style="font-family:var(--brand-font-heading);margin-top:12px">${esc(charset)}</p></div>
<div class="reveal"><h3 class="t-h3">Type scale</h3><p class="muted" style="margin:8px 0 16px">Ratio ${m.type.scale.ratio} between body and h1 steps; nearest named interval: ${m.type.scale.name} (${m.type.scale.named}). Mobile values come from the 390px pass.</p>
<div class="table-scroll"><table><thead><tr><th>Role</th><th>Family</th><th>Mobile → desktop</th><th>Line-height</th><th>Weight</th><th>Tracking</th><th>Token</th></tr></thead><tbody>
${ladder.map(([r, s]) => `<tr><td>${r}${s.inferred ? ' <span class="badge">inferred</span>' : ''}</td><td>${esc(s.family)}</td><td>${s.mobile}px → ${s.size}px</td><td>${s.lh}</td><td>${s.weight}</td><td>${s.tracking}em</td><td class="spec">${esc(s.clamp)}</td></tr>`).join('')}</tbody></table></div></div>
<div class="two reveal"><div><h3 class="t-h3">Sizes in use</h3><div class="bars" style="margin-top:16px">${m.type.sizes.slice(0, 12).map((s) => `<div class="bar"><span>${s.size}px</span><i style="width:${Math.max(2, s.share * 100 / Math.max(...m.type.sizes.map((x) => x.share)))}%"></i><span class="muted">${pct(s.share)}</span></div>`).join('')}</div></div>
<div><h3 class="t-h3">Declared type variables</h3><div class="vars" style="margin-top:16px">${Object.entries(m.type.vars).slice(0, 40).map(([k, v]) => `<div>${esc(k)}: ${esc(v)}</div>`).join('') || '<p class="muted">No type-related custom properties on :root.</p>'}</div></div></div>
</div></section>`;

  // ---- colour (dark) ----
  const palTop = m.colour.palette.slice(0, 12);
  const palSum = palTop.reduce((a, p) => a + p.share, 0) || 1;
  const colour = `<section id="colour" class="page ground-inv"><div class="wrap">${head(3, 'Colour', `${m.colour.palette.length} measured colours mapped to ${roleCount} roles. Text is weighted by characters, backgrounds by painted area.`)}
<div class="split">${S('object', { label: 'Colour chapter image', cls: 'reveal' })}<div style="display:grid;gap:24px;align-content:start" class="reveal"><h3 class="t-h3">Proportional palette</h3>
<div class="palette-bar">${palTop.map((p) => `<i style="flex:${(p.share / palSum).toFixed(4)};background:${pv(p.hex)}" title="${p.hex} ${pct(p.share)}"></i>`).join('')}</div>
<div class="legend">${palTop.map((p) => `<span><b style="background:${pv(p.hex)}"></b>${p.hex} ${pct(p.share)}</span>`).join('')}</div>
<h3 class="t-h3">Gradient</h3><div class="gradient"></div><div class="spec">${esc(m.colour.brandGradient)}${m.colour.gradientInferred ? ' · inferred' : ''}</div></div></div>
<div class="roles reveal">${Object.entries(c).map(([k, x]) => `<div class="role"><div class="sw" style="background:var(--brand-color-${k})"></div><div class="meta"><b>${k}</b><code>${x.hex}</code><code>${x.oklch}</code><span>${x.contrast}:1 vs ${x.contrastWith} ${x.contrast >= 4.5 ? '<span class="badge pass">AA</span>' : x.contrast >= 3 ? '<span class="badge">AA large</span>' : ''}${x.inferred ? ' <span class="badge">inferred</span>' : ''}</span><span class="muted">share ${pct(x.share)}</span></div></div>`).join('')}</div>
<div class="reveal"><h3 class="t-h3">Most-read pairs (WCAG 2.x contrast)</h3><div class="pairs" style="margin-top:16px">${m.colour.pairs.map((p) => `<div class="pair"><div class="aa" style="background:${pv(p.bg)};color:${pv(p.fg)}">Aa</div><div><code>${p.fg} on ${p.bg}</code><div class="muted">${pct(p.share)} of characters</div></div><div><b>${p.ratio}:1</b> <span class="badge ${p.aa ? 'pass' : 'fail'}">${p.aa ? 'AA' : p.aaLarge ? 'AA large only' : 'Fails AA'}</span></div></div>`).join('')}</div></div>
<details class="reveal"><summary>Full palette (${m.colour.palette.length})</summary><div class="table-scroll" style="margin-top:12px"><table><thead><tr><th></th><th>Hex</th><th>OKLCH</th><th>Share</th><th>Text</th><th>Background</th></tr></thead><tbody>${m.colour.palette.map((p) => `<tr><td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${pv(p.hex)}"></span></td><td>${p.hex}</td><td>${p.oklch}</td><td>${pct(p.share)}</td><td>${p.text ? Math.round(p.text) + ' ch' : '—'}</td><td>${p.bg ? Math.round(p.bg / 1000) + 'k px²' : '—'}</td></tr>`).join('')}</tbody></table></div></details>
</div></section>`;

  // ---- layout and spacing ----
  const maxRhythm = L.rhythm.reduce((a, b) => a + b.h, 0) || 1;
  const layout = `<section id="layout" class="page ground"><div class="wrap">${head(4, 'Layout and spacing', `Spacing values are tested against 8, 4 and 2px grids; ${pct(L.baseShares[L.base])} of measured paddings, margins and gaps sit on the ${L.base}px grid.`)}
<div class="facts reveal"><div class="fact"><b>${L.base}px</b><span class="muted">base unit</span></div><div class="fact"><b>${L.columns}</b><span class="muted">columns</span></div><div class="fact"><b>${L.gutter}px</b><span class="muted">gutter</span></div><div class="fact"><b>${L.container}px</b><span class="muted">container</span></div></div>
<div class="reveal"><h3 class="t-h3">Columns</h3><p class="muted" style="margin:8px 0 16px">${L.columns} columns, ${L.gutter}px gutter inside a ${L.container}px container (drawn at this page's width).</p><div class="cols">${Array.from({ length: L.columns }, () => '<i></i>').join('')}</div></div>
<div class="reveal"><h3 class="t-h3">Spacing scale</h3><p class="muted" style="margin:8px 0 16px">Most used on-grid values. Off-grid values seen: ${L.offGrid.slice(0, 8).map((v) => v.px + 'px').join(', ') || 'none'}.</p>
<div class="stairs">${L.scale.map((v, i) => `<div><i style="width:var(--brand-space-${i + 1});height:var(--brand-space-${i + 1})"></i>${v}</div>`).join('')}</div></div>
<div class="two reveal"><div><h3 class="t-h3">Radii</h3><p class="muted" style="margin:8px 0 16px">Pill shapes: ${pct(L.radii.pillShare)} of rounded elements.</p><div class="radii">${['sm', 'md', 'lg', 'card', 'button', 'input'].filter((k) => tokens.vars['--brand-radius-' + k]).map((k) => `<div style="border-radius:var(--brand-radius-${k})"><i></i><span>${k} · ${tokens.vars['--brand-radius-' + k]}</span></div>`).join('')}</div></div>
<div><h3 class="t-h3">Section rhythm (home)</h3><p class="muted" style="margin:8px 0 16px">Full-width bands in page order, height to scale.</p><div class="rhythm">${L.rhythm.map((b) => `<div style="height:${Math.max(22, Math.round((b.h / maxRhythm) * 360))}px;background:${b.tone === 'image' ? 'var(--brand-gradient-brand)' : b.tone === 'dark' ? 'var(--brand-color-surface-inverse)' : 'var(--brand-color-surface)'};color:${b.tone === 'light' ? 'var(--brand-color-text)' : 'var(--brand-color-text-inverse)'}"><span>${b.tone}${b.gradient ? ' (gradient)' : ''}</span><span>${b.h}px</span></div>`).join('') || '<p class="muted">No full-width bands found.</p>'}</div></div></div>
<div class="reveal"><h3 class="t-h3">Breakpoints</h3><p class="muted" style="margin:8px 0 16px">From @media rules in readable stylesheets.</p><div class="ruler">${L.breakpoints.filter((b) => b.px <= 1800).map((b) => `<span style="left:${(b.px / 1800) * 100}%">${b.px}</span>`).join('')}</div></div>
</div></section>`;

  // ---- components (dark) ----
  const btnTile = (b, i) => {
    const cls = b.variant === 'outline' ? 'outline' : b.variant === 'translucent' ? 'glass' : i > 0 ? 'alt' : '';
    const ground = b.ground && isDark(b.ground) ? 'ground-inv' : 'ground';
    return `<div class="tile ${ground}" ${cls === 'glass' ? 'style="background:var(--brand-gradient-brand);color:var(--brand-color-text-inverse)"' : ''}><span class="eyebrow">${b.variant}${cls === 'alt' ? ' · alt' : ''}</span><a class="rb-btn ${cls}" href="#components">${esc(b.labels[0])}</a><div class="spec">h ${b.h}px · pad ${b.pad[0]}/${b.pad[1]} · radius ${b.pill ? 'pill' : b.radius + 'px'} · ${b.font.size}px/${b.font.weight}${b.border ? ` · border ${b.border.w}px` : ''}${b.backdrop ? ` · ${esc(b.backdrop)}` : ''} · seen ${b.count}× on ${b.pages} page(s) · ground ${b.ground}</div></div>`;
  };
  const nav = C.nav;
  const card0 = C.cards[0];
  const components = `<section id="components" class="page ground-inv"><div class="wrap">
<div class="head-split">${head(5, 'Components', 'Buttons, navigation, cards and the form input, measured on their own grounds and rebuilt from tokens.')}${S('glass', { label: 'Components chapter image', cls: 'reveal' })}</div>
<div class="reveal"><h3 class="t-h3">Buttons</h3><div class="gallery" style="margin-top:16px">${C.buttons.map(btnTile).join('') || '<p class="muted">No buttons found.</p>'}</div></div>
${nav ? `<div class="reveal"><h3 class="t-h3">Navigation</h3><p class="muted" style="margin:8px 0 16px">${nav.h}px high, ${nav.sticky ? 'sticky' : 'static'}${nav.backdrop ? ', ' + esc(nav.backdrop) : ''}${nav.linkStyle ? `; links ${nav.linkStyle.size}px/${nav.linkStyle.weight}${nav.linkStyle.transform !== 'none' ? ' ' + nav.linkStyle.transform : ''}` : ''}. The logo is a placeholder at its measured size${nav.logo ? ` (${nav.logo.w}×${nav.logo.h}px, ${nav.logo.kind}${nav.logo.color ? ', ' + nav.logo.color : ''})` : ''}.</p>
<div class="ground" style="padding:24px;border-radius:var(--brand-radius-card)"><div class="navmock"><div class="logo">${nav.logo ? `logo ${nav.logo.w}×${nav.logo.h}` : 'logo'}</div><nav>${nav.links.filter((l) => !C.buttonsAll.some((b) => b.labels.includes(l))).slice(0, 6).map((l) => `<span>${esc(l)}</span>`).join('')}</nav><a class="rb-btn small" href="#components">${esc(C.buttons[0]?.labels[0] || 'Action')}</a></div></div></div>` : ''}
<div class="reveal"><h3 class="t-h3">Cards</h3><p class="muted" style="margin:8px 0 16px">${C.cards.map((k) => `${k.kind}: ${k.w}×${k.h}px, radius ${k.radius}px, padding ${k.padding.join('/')}${k.backdrop ? ', ' + esc(k.backdrop) : ''}, fill ${k.bg || 'none'} (seen ${k.count}×)`).join('; ') || 'No repeated cards found.'}</p>
<div class="cards3">${['sky', 'detail', 'grid'].map((img, i) => `<article class="rb-card"><div class="rb-media">${S(img, { label: 'Card media' })}</div><div class="rb-body"><h3>${esc(card0?.title && i === 0 ? 'Card title' : ['Card title', 'Second card', 'Third card'][i])}</h3><p class="muted" style="margin-top:6px">Built from --brand-card-* tokens.</p></div></article>`).join('')}</div></div>
<div class="reveal"><h3 class="t-h3">Form input ${C.input.inferred ? '<span class="badge">inferred</span>' : ''}</h3><p class="muted" style="margin:8px 0 16px">${C.input.inferred ? 'No form fields were found on the captured pages. This input is inferred from the primary button and the border colour.' : `Measured: ${C.input.h}px high, radius ${C.input.radius}px, ${C.input.border ? C.input.border.w + 'px border ' + C.input.border.c : 'no border'}.`}</p>
<div class="ground" style="padding:24px;border-radius:var(--brand-radius-card)"><form class="form" onsubmit="return false"><input class="rb-input" type="email" placeholder="${esc(C.input.placeholder || 'Email')}" aria-label="Sample input"><button class="rb-btn" type="button">${esc(C.buttons[0]?.labels[0] || 'Submit')}</button></form></div></div>
</div></section>`;

  // ---- imagery ----
  const fmtList = (arr) => arr.slice(0, 5).map((x) => `${x.key} ${pct(x.share)}`).join(', ') || '—';
  const imagery = `<section id="imagery" class="page ground"><div class="wrap">${head(6, 'Imagery', `The site's images are described here, not copied. ${I.count} media elements across ${I.sources.length} pages cover ${pct(I.mediaShare)} of page area.`)}
<div class="mosaic reveal">${[['hero', 'm1'], ['street', 'm2'], ['sky', 'm3'], ['detail', 'm4'], ['glass', 'm5'], ['tokens', 'm6']].map(([s, k]) => S(s, { cls: k, label: 'Mosaic image' })).join('')}</div>
${edition === 'hero' ? '' : '<p class="muted reveal">This edition has no images: every image slot uses a gradient built from the colour tokens. The hero edition embeds the generated images.</p>'}
<div class="two reveal"><div><h3 class="t-h3">Measured facts</h3><ul class="list" style="margin-top:16px">
<li><span>Media elements</span><b>${I.count} (img ${I.kinds.img}, video ${I.kinds.video}, svg ${I.kinds.svg}, background ${I.kinds.bg})</b></li>
<li><span>Formats</span><b>${fmtList(I.formats)}</b></li><li><span>Crops</span><b>${fmtList(I.ratios)}</b></li><li><span>object-fit</span><b>${fmtList(I.fit)}</b></li>
<li><span>Full-bleed</span><b>${pct(I.fullBleedShare)} of media</b></li><li><span>Media share of page area</span><b>${pct(I.mediaShare)}</b></li>
<li><span>Images with alt text</span><b>${pct(Math.min(1, I.altCoverage))}</b></li><li><span>Alt-text themes</span><b>${I.altThemes.slice(0, 8).map((a) => esc(a.word)).join(', ') || '—'}</b></li></ul></div>
<div><h3 class="t-h3">In words</h3><p style="margin-top:16px">${esc(prompts?.style ? `Photography reads as ${prompts.style}.` : '')} Images mostly use ${esc(I.ratios[0]?.key || 'mixed')} crops${I.fit[0] ? ` with object-fit ${esc(I.fit[0].key)}` : ''}; ${pct(I.fullBleedShare)} run full-bleed.</p>
<h3 class="t-h3" style="margin-top:28px">Source pages</h3><ul class="list" style="margin-top:12px">${I.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(new URL(s.url).pathname)}</a><span class="muted">${s.media} media</span></li>`).join('')}</ul></div></div>
</div></section>`;

  // ---- voice and tone ----
  const st = V.stats;
  const voice = `<section id="voice" class="page ground-alt"><div class="wrap">${head(7, 'Voice and tone', `${st.headlines} headlines, ${st.paragraphs} paragraphs and ${st.ctaCount} calls to action, language "${esc(st.lang)}".`)}
<div class="split">${S('street', { label: 'Voice chapter image', cls: 'reveal' })}<div class="reveal"><h3 class="t-h3">Stats</h3><ul class="list" style="margin-top:16px">
<li><span>Headline length</span><b>median ${st.headlineWordsMedian} words · 80th pct ${st.headlineWordsP80}</b></li>
<li><span>Case</span><b>${Object.entries(st.case).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}</b></li>
<li><span>"You" vs "we"</span><b>${st.you} vs ${st.we}</b></li>
<li><span>Headlines with numbers</span><b>${pct(st.numbersInHeadlines)}</b></li>
<li><span>"X, Y" headlines</span><b>${pct(st.xyPattern)}</b></li>
<li><span>CTA verbs</span><b>${st.ctaVerbs.map((v) => esc(v.verb)).join(', ') || '—'}</b></li>
<li><span>Exclamation marks</span><b>${st.exclamations}</b></li></ul></div></div>
<div class="quotes">${V.quotes.map((q) => `<figure class="reveal quote"><blockquote>${esc(q.text)}</blockquote><cite class="muted">${esc(q.kind)} · <a href="${esc(q.url)}" rel="noopener">${esc(q.url)}</a></cite></figure>`).join('')}</div>
<div class="rules">${V.rules.map((r, i) => `<div class="rule reveal"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3 class="t-h3">${esc(r.title)}</h3><p>${esc(r.text)}</p><p class="spec">${esc(r.stat)}</p></div>`).join('')}</div>
</div></section>`;

  // ---- design tokens (dark) ----
  const jsonText = JSON.stringify(tokens.json, null, 1);
  const tok = `<section id="tokens" class="page ground-inv"><div class="wrap">${head(8, 'Design tokens', `${Object.keys(tokens.vars).length} CSS custom properties and the same set as W3C design-tokens JSON, with OKLCH next to hex.`)}
<div class="toolbar reveal"><button class="rb-btn" data-copy="tokens-css">Copy CSS</button><button class="rb-btn glass" data-copy="tokens-json">Copy JSON</button><button class="rb-btn outline" data-download="tokens-css" data-name="tokens.css">Download tokens.css</button><button class="rb-btn outline" data-download="tokens-json" data-name="tokens.json">Download tokens.json</button></div>
<div class="two reveal"><div><h3 class="t-h3">tokens.css</h3><pre data-from="tokens-css" style="margin-top:12px">See tokens.css (shown here when JavaScript runs).</pre></div><div><h3 class="t-h3">tokens.json</h3><pre data-from="tokens-json" style="margin-top:12px">See tokens.json (shown here when JavaScript runs).</pre></div></div>
</div></section>`;

  // ---- method ----
  const method = `<section id="method" class="page ground"><div class="wrap">${head(9, 'Method', 'How the numbers were produced, what was assumed and what was generated.')}
<div class="two reveal"><div><h3 class="t-h3">Assumptions</h3><ul class="list" style="margin-top:16px">${m.assumptions.map((a) => `<li><span>${esc(a)}</span></li>`).join('')}</ul></div>
<div><h3 class="t-h3">Run log</h3><div class="table-scroll" style="margin-top:16px"><table><thead><tr><th>Phase</th><th>Time</th></tr></thead><tbody>${(runLog || []).map((r) => `<tr><td>${esc(r.phase)}</td><td>${r.ms != null ? (r.ms / 1000).toFixed(1) + ' s' : '—'}</td></tr>`).join('')}</tbody></table></div>
<h3 class="t-h3" style="margin-top:28px">Pages</h3><ul class="list" style="margin-top:12px">${m.pages.map((p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(new URL(p.url).pathname)}</a><span class="muted">${p.height}px · ${p.chars} chars</span></li>`).join('')}</ul></div></div>
<div class="reveal"><h3 class="t-h3">Image prompts</h3><p class="muted" style="margin:8px 0 16px">Text prompts only; the brand's photos were never an input. ${edition === 'hero' && manifest?.images.length ? `${manifest.images.length} images embedded, each labelled where it appears.` : 'No images are embedded in this edition.'}</p>
<div class="table-scroll"><table><thead><tr><th>Slot</th><th>Ratio</th><th>Prompt</th></tr></thead><tbody>${(prompts?.slots || []).map((s) => `<tr><td>${s.slot}</td><td>${s.aspectRatio}</td><td>${esc(s.prompt)}</td></tr>`).join('')}</tbody></table></div></div>
</div></section>`;

  const foot = `<footer class="foot ground-inv"><div class="wrap">${unofficial}<p>${disclaimer}</p><p class="muted">Measured from <a href="${esc(m.source)}" rel="noopener">${esc(m.source)}</a> on ${date} with reverse-brand. Logos, font files and the brand's images are not included.</p></div></footer>`;

  const topbar = `<header class="topbar"><a class="name" href="#cover">${esc(m.name)} brand guidelines</a>${unofficial}<nav aria-label="Sections">${[['overview', 'Overview'], ['contents', 'Contents'], ...CHAPTERS.map(([id, ttl]) => [id, ttl]), ['method', 'Method']].map(([id, ttl]) => `<a href="#${id}">${esc(ttl)}</a>`).join('')}</nav></header>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.name)} brand guidelines (unofficial)</title>
<meta name="description" content="Unofficial analysis of ${esc(m.host)}. ${disclaimer}">
<style id="tokens-css">${tokens.css}</style>
<style>${baseCSS}${slotFallbackCSS}${css}</style>${imgCSS ? `\n<style id="images">${imgCSS}</style>` : ''}
</head><body>
${topbar}
<main>
${cover}
${overview}
${toc}
${rebuild}
${typo}
${fonts}
${colour}
${layout}
${components}
${imagery}
${voice}
${tok}
${method}
</main>
${foot}
<script type="application/json" id="tokens-json">${jsonText.replace(/</g, '\\u003c')}</script>
<script>${js}</script>
</body></html>`;
}
