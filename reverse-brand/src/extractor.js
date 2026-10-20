// In-page extractor. Self-contained: it is serialised with toString() and run
// either by Playwright (page.evaluate) or by the DevTools snippet in an iframe.
// It takes a document/window pair so the snippet can run it inside same-origin iframes.

export function extractPage(opts) {
  const win = (opts && opts.win) || window;
  const doc = win.document;
  const vw = win.innerWidth;
  const vh = win.innerHeight;
  const docH = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
  const CONSENT_RE = /(cookie|consent|gdpr|onetrust|didomi|iubenda|cookiebot|cmplz|qc-cmp|usercentrics|truste|cookieyes|borlabs|tarteaucitron)/i;
  const CONSENT_TEXT = /(cookie|consenso|consent|privacy preferences|preferenze privacy|accetta tutti|accept all)/i;

  // ---- colour normalisation through a 1px canvas (handles oklch(), lab(), color()) ----
  const cv = doc.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  function toHex(c) {
    if (!c || c === 'transparent' || c === 'none') return null;
    if (cache.has(c)) return cache.get(c);
    let out = null;
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000'; cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      if (d[3] > 0) {
        // un-premultiplying is not needed: getImageData returns straight alpha
        const h = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        out = { hex: h, a: +(d[3] / 255).toFixed(2) };
      }
    } catch (e) { out = null; }
    cache.set(c, out);
    return out;
  }

  const excluded = new WeakSet();
  function isConsent(el) {
    const idc = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '');
    if (CONSENT_RE.test(idc)) return true;
    const role = el.getAttribute && el.getAttribute('role');
    if ((role === 'dialog' || role === 'alertdialog' || el.getAttribute('aria-modal') === 'true' || el.tagName === 'DIALOG')) {
      const t = (el.innerText || '').slice(0, 600);
      if (CONSENT_TEXT.test(t)) return true;
    }
    return false;
  }

  const bump = (map, key, by) => { map[key] = (map[key] || 0) + (by == null ? 1 : by); };
  const px = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const r1 = (n) => Math.round(n * 10) / 10;

  const type = {};       // style key -> {family,stack,size,weight,lh,ls,transform,count,chars,tags}
  const textColors = {}; // hex -> chars
  const bgColors = {};   // hex -> painted area
  const borderColors = {};
  const fillColors = {};
  const pairs = {};      // text|bg -> chars
  const spacing = { padding: {}, margin: {}, gap: {} };
  const radii = {};      // "12" or "pill" -> count
  const radiiPx = {};
  const shadows = {};
  const gradients = {};
  const gradientStops = {};
  const easings = {};
  const durations = {};
  const containers = {}; // max-width -> area
  const grids = [];
  const backdrop = {};
  const media = { count: 0, img: 0, video: 0, svg: 0, bg: 0, formats: {}, fit: {}, ratios: {}, fullBleed: 0, area: 0, alts: [], items: [] };
  const buttons = [];
  const cards = [];
  const fields = [];
  const headings = [];
  const paragraphs = [];
  const links = [];
  let totalChars = 0;

  function effectiveBg(el) {
    let e = el;
    while (e && e.nodeType === 1) {
      const ecs = win.getComputedStyle(e);
      const c = toHex(ecs.backgroundColor);
      if (c && c.a > 0.5) return c.hex;
      const g = gradColor(ecs.backgroundImage); if (g) return g;
      e = e.parentElement;
    }
    return toHex(win.getComputedStyle(doc.documentElement).backgroundColor)?.hex || '#ffffff';
  }

  // first colour stop of a CSS gradient, as hex (used as the ground under text and buttons)
  function gradColor(bi) {
    if (!bi || !bi.includes('gradient(')) return null;
    const m = bi.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|color\([^)]*\))/i);
    const c = m && toHex(m[1]); return c && c.a > 0.5 ? c.hex : null;
  }

  function visible(el, cs, rect) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    if (rect.width < 1 || rect.height < 1) return false;
    return true;
  }

  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t.replace(/\s+/g, ' ').trim();
  }

  function fmt(u) {
    if (!u) return 'unknown';
    const m = u.split('?')[0].match(/\.(webp|avif|jpe?g|png|gif|svg|mp4|webm)$/i);
    if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
    if (/fm=webp|format=webp/i.test(u)) return 'webp';
    if (/fm=avif|format=avif/i.test(u)) return 'avif';
    if (u.startsWith('data:image/')) return u.slice(11, u.indexOf(';')).replace('svg+xml', 'svg');
    return 'unknown';
  }

  function ratioBucket(w, h) {
    const r = w / h;
    const named = [['21:9', 21 / 9], ['16:9', 16 / 9], ['3:2', 1.5], ['4:3', 4 / 3], ['1:1', 1], ['4:5', 0.8], ['3:4', 0.75], ['2:3', 2 / 3], ['9:16', 9 / 16]];
    let best = named[0], d = 9;
    for (const n of named) { const dd = Math.abs(Math.log(r / n[1])); if (dd < d) { d = dd; best = n; } }
    return d < 0.08 ? best[0] : (r > 1 ? 'wide-other' : 'tall-other');
  }

  function absTop(rect) { return rect.top + win.scrollY; }

  // the canvas behind everything: body (or html) paints the whole document
  {
    const b = toHex(win.getComputedStyle(doc.body).backgroundColor);
    const h = toHex(win.getComputedStyle(doc.documentElement).backgroundColor);
    const c = b && b.a > 0.5 ? b : h && h.a > 0.5 ? h : { hex: '#ffffff', a: 1 };
    bump(bgColors, c.hex, vw * docH);
  }

  const all = doc.body ? doc.body.getElementsByTagName('*') : [];
  const sx = win.scrollX, sy = win.scrollY;

  for (const el of all) {
    if (excluded.has(el.parentElement)) { excluded.add(el); continue; }
    if (isConsent(el)) { excluded.add(el); continue; }
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'HEAD') continue;
    const cs = win.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!visible(el, cs, rect)) { if (cs.display === 'none') excluded.add(el); continue; }
    const area = rect.width * rect.height;

    // backgrounds by painted area
    const bg = toHex(cs.backgroundColor);
    if (bg && bg.a > 0.05) bump(bgColors, bg.hex + (bg.a < 1 ? '@' + bg.a : ''), area);
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient(')) {
      bump(gradients, cs.backgroundImage.slice(0, 400), area);
      for (const m of cs.backgroundImage.matchAll(/(rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|color\([^)]*\))/gi)) { const c = toHex(m[1]); if (c && c.a > 0.5) bump(gradientStops, c.hex, area); }
    }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') bump(backdrop, cs.backdropFilter);

    // borders
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (px(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') {
        const b = toHex(cs['border' + side + 'Color']);
        if (b) bump(borderColors, b.hex, Math.max(rect.width, rect.height));
      }
    }
    // svg fills
    if (el instanceof win.SVGElement && tag !== 'svg') {
      const f = toHex(cs.fill); if (f) bump(fillColors, f.hex);
    }

    // spacing
    for (const k of ['Top', 'Right', 'Bottom', 'Left']) {
      const p = Math.round(px(cs['padding' + k])); if (p > 0) bump(spacing.padding, p);
      const m = Math.round(px(cs['margin' + k])); if (m > 0) bump(spacing.margin, m);
    }
    if (cs.display.includes('flex') || cs.display.includes('grid')) {
      const g1 = Math.round(px(cs.rowGap)), g2 = Math.round(px(cs.columnGap));
      if (g1 > 0) bump(spacing.gap, g1); if (g2 > 0 && g2 !== g1) bump(spacing.gap, g2);
    }

    // radius
    const rad = px(cs.borderTopLeftRadius);
    if (rad > 0 && (bg || cs.borderTopStyle !== 'none' || tag === 'IMG' || cs.overflow !== 'visible')) {
      const pill = rad >= Math.min(rect.height, rect.width) / 2 - 1;
      bump(radii, pill ? 'pill' : String(Math.round(rad)));
      if (!pill) bump(radiiPx, Math.round(rad));
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') bump(shadows, cs.boxShadow.slice(0, 200));
    if (cs.transitionTimingFunction && cs.transitionDuration !== '0s') {
      for (const e of cs.transitionTimingFunction.split(/,(?![^(]*\))/)) bump(easings, e.trim());
      for (const d of cs.transitionDuration.split(',')) if (d.trim() !== '0s') bump(durations, d.trim());
    }
    if (cs.animationName && cs.animationName !== 'none') bump(easings, cs.animationTimingFunction.split(',')[0].trim());

    // containers
    if (cs.maxWidth !== 'none' && cs.maxWidth.endsWith('px') && rect.width > 300 && rect.width < vw - 8) {
      const left = rect.left, right = vw - rect.right;
      if (Math.abs(left - right) < 24) bump(containers, Math.round(px(cs.maxWidth)), area);
    }
    // grids
    if (cs.display === 'grid' || cs.display === 'inline-grid') {
      const cols = cs.gridTemplateColumns.split(/\s+(?![^(]*\))/).filter((x) => x && x !== 'none').length;
      if (cols > 1) grids.push({ cols, gap: Math.round(px(cs.columnGap)), width: Math.round(rect.width) });
    } else if (cs.display.includes('flex') && cs.flexDirection.startsWith('row') && el.children.length >= 2 && rect.width > vw * 0.5) {
      const kids = [...el.children].filter((k) => { const r = k.getBoundingClientRect(); return r.width > 80 && r.height > 80; });
      if (kids.length >= 2) {
        const top = kids[0].getBoundingClientRect().top;
        const row = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 4);
        if (row.length >= 2) grids.push({ cols: row.length, gap: Math.round(px(cs.columnGap) || (row[1].getBoundingClientRect().left - row[0].getBoundingClientRect().right)), width: Math.round(rect.width), flex: true });
      }
    }

    // media
    const bgImg = cs.backgroundImage && cs.backgroundImage.startsWith('url(') ? cs.backgroundImage : null;
    if (tag === 'IMG' || tag === 'VIDEO' || (tag === 'svg' && area > 2500) || (bgImg && area > 10000)) {
      if (area > 400) {
        media.count++;
        const kind = tag === 'IMG' ? 'img' : tag === 'VIDEO' ? 'video' : tag === 'svg' ? 'svg' : 'bg';
        media[kind]++;
        const src = tag === 'IMG' ? (el.currentSrc || el.src) : tag === 'VIDEO' ? (el.currentSrc || el.poster || '') : bgImg ? bgImg.slice(5, -2).replace(/^["']|["']$/g, '') : '';
        bump(media.formats, tag === 'svg' ? 'svg' : tag === 'VIDEO' ? 'video' : fmt(src));
        if (tag === 'IMG' || tag === 'VIDEO') bump(media.fit, cs.objectFit);
        else if (bgImg) bump(media.fit, 'bg-' + (cs.backgroundSize || 'auto'));
        bump(media.ratios, ratioBucket(rect.width, rect.height));
        if (rect.width >= vw * 0.95) media.fullBleed++;
        media.area += area;
        if (tag === 'IMG') {
          const alt = (el.getAttribute('alt') || '').trim();
          if (alt) media.alts.push(alt.slice(0, 120));
        }
        if (media.items.length < 60) media.items.push({ kind, w: Math.round(rect.width), h: Math.round(rect.height), y: Math.round(absTop(rect)), fit: tag === 'IMG' ? cs.objectFit : null, radius: Math.round(rad), fmt: tag === 'svg' ? 'svg' : fmt(src) });
      }
    }

    // text
    const t = ownText(el);
    if (t && t.length > 0 && !(el instanceof win.SVGElement)) {
      const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
      const size = r1(px(cs.fontSize));
      const lh = cs.lineHeight === 'normal' ? r1(size * 1.2) : r1(px(cs.lineHeight));
      const ls = cs.letterSpacing === 'normal' ? 0 : r1(px(cs.letterSpacing));
      const w = parseInt(cs.fontWeight, 10) || 400;
      const key = [fam, size, w, lh, ls, cs.textTransform, cs.fontStyle].join('|');
      const hTag = /^H[1-6]$/.test(tag) ? tag.toLowerCase() : (el.closest('h1,h2,h3,h4,h5,h6')?.tagName.toLowerCase() || (el.closest('p') ? 'p' : (el.closest('a,button') ? 'a' : tag.toLowerCase())));
      if (!type[key]) type[key] = { family: fam, stack: cs.fontFamily, size, weight: w, lh, ls, transform: cs.textTransform, style: cs.fontStyle, count: 0, chars: 0, tags: {} };
      type[key].count++; type[key].chars += t.length; bump(type[key].tags, hTag, t.length);
      const col = toHex(cs.color);
      if (col) {
        bump(textColors, col.hex, t.length);
        bump(pairs, col.hex + '|' + effectiveBg(el), t.length);
      }
      totalChars += t.length;
    }

    // headings and paragraphs (full text)
    if (/^H[1-3]$/.test(tag)) {
      const txt = el.innerText.replace(/\s+/g, ' ').trim();
      if (txt) headings.push({ tag: tag.toLowerCase(), text: txt.slice(0, 200), size: r1(px(cs.fontSize)), weight: parseInt(cs.fontWeight, 10), y: Math.round(absTop(rect)), inHeader: !!el.closest('header,[role=banner]'), inFooter: !!el.closest('footer,[role=contentinfo]') });
    } else if (tag === 'P' && paragraphs.length < 80) {
      const txt = el.innerText.replace(/\s+/g, ' ').trim();
      if (txt.length > 20) paragraphs.push({ text: txt.slice(0, 400), size: r1(px(cs.fontSize)), inFooter: !!el.closest('footer,[role=contentinfo]') });
    }

    // links
    if (tag === 'A' && el.href && links.length < 400) {
      links.push({ href: el.href, text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80), inNav: !!el.closest('nav,header,[role=navigation],[role=banner]'), inFooter: !!el.closest('footer,[role=contentinfo]') });
    }

    // buttons: the painted layer may be the element or its single child
    const isBtnLike = tag === 'BUTTON' || (tag === 'INPUT' && /submit|button/.test(el.type)) || el.getAttribute('role') === 'button' ||
      (tag === 'A' && (/(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : '') || ((bg && bg.a > 0.05) || px(cs.borderTopWidth) > 0) && rect.height < 80 && rect.width < 420));
    if (isBtnLike && rect.height >= 24 && rect.height <= 90 && rect.width <= 480 && buttons.length < 120) {
      let layer = el, lcs = cs;
      const lbg = toHex(cs.backgroundColor);
      if ((!lbg || lbg.a < 0.05) && px(cs.borderTopWidth) === 0 && el.children.length === 1) {
        const c = el.children[0]; const ccs = win.getComputedStyle(c); const cbg = toHex(ccs.backgroundColor);
        if ((cbg && cbg.a > 0.05) || px(ccs.borderTopWidth) > 0) { layer = c; lcs = ccs; }
      }
      const lr = layer.getBoundingClientRect();
      const label = (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const fbg = toHex(lcs.backgroundColor);
      const lrad = px(lcs.borderTopLeftRadius);
      if (label && label.length < 60) buttons.push({
        label, tag: tag.toLowerCase(), painted: layer === el ? 'self' : 'child',
        bg: fbg ? fbg.hex : null, bgA: fbg ? fbg.a : 0, color: toHex(lcs.color)?.hex || toHex(cs.color)?.hex,
        border: px(lcs.borderTopWidth) > 0 && lcs.borderTopStyle !== 'none' ? { w: px(lcs.borderTopWidth), c: toHex(lcs.borderTopColor)?.hex } : null,
        radius: Math.round(lrad), pill: lrad >= lr.height / 2 - 1, h: Math.round(lr.height), w: Math.round(lr.width),
        pad: [px(lcs.paddingTop), px(lcs.paddingRight), px(lcs.paddingBottom), px(lcs.paddingLeft)].map(Math.round),
        font: { family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: r1(px(cs.fontSize)), weight: parseInt(cs.fontWeight, 10), ls: cs.letterSpacing === 'normal' ? 0 : r1(px(cs.letterSpacing)), transform: cs.textTransform },
        backdrop: lcs.backdropFilter !== 'none' ? lcs.backdropFilter : null, shadow: lcs.boxShadow !== 'none' ? lcs.boxShadow.slice(0, 120) : null,
        ground: effectiveBg(layer.parentElement || layer), inNav: !!el.closest('nav,header'),
      });
    }

    // cards: boxes with a fill, border, shadow or radius that hold a heading or media, mid-sized
    if (cards.length < 80 && rect.width >= 160 && rect.width <= Math.min(900, vw * 0.7) && rect.height >= 120 && rect.height <= 900 && tag !== 'IMG') {
      const hasBox = (bg && bg.a > 0.05) || (cs.boxShadow !== 'none') || px(cs.borderTopWidth) > 0 || (rad > 0 && cs.overflow !== 'visible');
      if (hasBox) {
        const med = el.querySelector('img,video,picture,[style*="background-image"]');
        const head = el.querySelector('h2,h3,h4,h5,strong');
        const sib = el.parentElement ? [...el.parentElement.children].filter((s) => s.tagName === el.tagName && s.className === el.className).length : 1;
        if ((med || head) && sib >= 2) {
          let mediaPos = null;
          if (med) { const mr = med.getBoundingClientRect(); mediaPos = mr.height >= rect.height * 0.9 ? 'backdrop' : (mr.top - rect.top < 10 ? 'top' : 'inline'); }
          // when the card itself has no padding, the text block inside it usually does
          let inner = null;
          for (const k of el.querySelectorAll('div,section,header,footer,p')) {
            if (k.querySelector('img,video')) continue;
            const kc = win.getComputedStyle(k); const kp = [px(kc.paddingTop), px(kc.paddingRight), px(kc.paddingBottom), px(kc.paddingLeft)].map(Math.round);
            if (kp.some((v) => v > 0)) { inner = kp; break; }
          }
          cards.push({ innerPad: inner, w: Math.round(rect.width), h: Math.round(rect.height), bg: bg ? bg.hex : null, bgA: bg ? bg.a : 0, radius: Math.round(rad),
            pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)].map(Math.round), shadow: cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 160) : null,
            border: px(cs.borderTopWidth) > 0 ? { w: px(cs.borderTopWidth), c: toHex(cs.borderTopColor)?.hex } : null,
            backdrop: cs.backdropFilter !== 'none' ? cs.backdropFilter : null, media: mediaPos, siblings: sib, title: head ? head.innerText.trim().slice(0, 80) : null, ground: effectiveBg(el.parentElement || el) });
        }
      }
    }

    // form fields
    if ((tag === 'INPUT' && !/hidden|submit|button|checkbox|radio|image|reset|file/.test(el.type)) || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (fields.length < 30) fields.push({ tag: tag.toLowerCase(), type: el.type || null, h: Math.round(rect.height), w: Math.round(rect.width), radius: Math.round(rad),
        pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)].map(Math.round), bg: toHex(cs.backgroundColor)?.hex || null,
        border: px(cs.borderTopWidth) > 0 ? { w: px(cs.borderTopWidth), c: toHex(cs.borderTopColor)?.hex } : (px(cs.borderBottomWidth) > 0 ? { w: px(cs.borderBottomWidth), c: toHex(cs.borderBottomColor)?.hex, bottomOnly: true } : null),
        font: { size: r1(px(cs.fontSize)), family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() }, color: toHex(cs.color)?.hex, placeholder: el.getAttribute('placeholder') || null });
    }
  }

  // ---- header / nav ----
  let header = null;
  const hdr = doc.querySelector('header, [role=banner]') || [...doc.body.children].find((e) => { const c = win.getComputedStyle(e); return (c.position === 'fixed' || c.position === 'sticky') && e.getBoundingClientRect().top <= 1; });
  if (hdr && !excluded.has(hdr)) {
    const hcs = win.getComputedStyle(hdr); const hr = hdr.getBoundingClientRect();
    let sticky = hcs.position === 'fixed' || hcs.position === 'sticky';
    for (const k of hdr.querySelectorAll('*')) { const p = win.getComputedStyle(k).position; if (p === 'fixed' || p === 'sticky') { sticky = true; break; } }
    const navLinks = [...hdr.querySelectorAll('nav a, a')].filter((a) => a.getBoundingClientRect().width > 0 && (a.innerText || '').trim());
    const ls = {};
    navLinks.forEach((a) => { const c = win.getComputedStyle(a); bump(ls, [c.fontFamily.split(',')[0].replace(/["']/g, '').trim(), r1(px(c.fontSize)), c.fontWeight, toHex(c.color)?.hex, c.textTransform, c.textDecorationLine, c.letterSpacing === 'normal' ? 0 : r1(px(c.letterSpacing))].join('|')); });
    const top = Object.entries(ls).sort((a, b) => b[1] - a[1])[0];
    const logoEl = hdr.querySelector('a[href="/"] img, a[href="/"] svg, .logo img, .logo svg, [class*=logo] img, [class*=logo] svg, img, svg');
    let logo = null;
    if (logoEl) {
      const lr = logoEl.getBoundingClientRect(); const lcs = win.getComputedStyle(logoEl);
      let col = null;
      if (logoEl.tagName.toLowerCase() === 'svg') { const p = logoEl.querySelector('path,rect,circle,polygon,text'); col = toHex(win.getComputedStyle(p || logoEl).fill)?.hex || toHex(lcs.color)?.hex; }
      logo = { kind: logoEl.tagName.toLowerCase(), w: Math.round(lr.width), h: Math.round(lr.height), color: col, alt: logoEl.getAttribute('alt') || logoEl.getAttribute('aria-label') || null, src: logoEl.currentSrc || null };
    }
    const navGapEl = hdr.querySelector('nav ul, nav');
    header = { h: Math.round(hr.height), sticky, bg: toHex(hcs.backgroundColor) || null, backdrop: hcs.backdropFilter !== 'none' ? hcs.backdropFilter : null,
      borderBottom: px(hcs.borderBottomWidth) > 0 ? toHex(hcs.borderBottomColor)?.hex : null, shadow: hcs.boxShadow !== 'none' ? hcs.boxShadow.slice(0, 120) : null,
      links: navLinks.slice(0, 14).map((a) => a.innerText.trim().slice(0, 40)),
      linkStyle: top ? (([family, size, weight, color, transform, deco, lsp]) => ({ family, size: +size, weight: +weight, color, transform, decoration: deco, ls: +lsp }))(top[0].split('|')) : null,
      gap: navGapEl ? Math.round(px(win.getComputedStyle(navGapEl).columnGap)) : 0, logo };
  }

  // ---- section rhythm (light/dark bands) ----
  const bands = [];
  const root = doc.querySelector('main') || doc.body;
  function collectBands(node, depth) {
    for (const ch of node.children) {
      if (excluded.has(ch)) continue;
      const r = ch.getBoundingClientRect();
      if (r.height < 1) continue;
      if (r.width >= vw * 0.9 && r.height >= 160) {
        const kids = [...ch.children].filter((k) => { const kr = k.getBoundingClientRect(); return kr.width >= vw * 0.9 && kr.height >= 160; });
        if (kids.length >= 2 && depth < 4) { collectBands(ch, depth + 1); continue; }
        const c = win.getComputedStyle(ch);
        const own = toHex(c.backgroundColor);
        const hasImg = (c.backgroundImage && c.backgroundImage !== 'none') || [...ch.querySelectorAll('img,video')].some((m) => m.getBoundingClientRect().width >= vw * 0.9);
        const grad = gradColor(c.backgroundImage);
        bands.push({ y: Math.round(absTop(r)), h: Math.round(r.height), bg: own && own.a > 0.5 ? own.hex : (grad || effectiveBg(ch)), image: !!hasImg && !grad, gradient: !!grad, tag: ch.tagName.toLowerCase() });
      } else if (depth < 4 && r.width >= vw * 0.9) collectBands(ch, depth + 1);
    }
  }
  if (root) collectBands(root, 0);

  // ---- :root custom properties and breakpoints ----
  const vars = {}; const mq = {}; const fontFaces = [];
  function walkRules(rules) {
    for (const rule of rules) {
      if (rule.type === 1 && /(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText || '')) {
        for (const p of rule.style) if (p.startsWith('--') && Object.keys(vars).length < 400) vars[p] = rule.style.getPropertyValue(p).trim().slice(0, 200);
      } else if (rule.type === 4) {
        const txt = rule.conditionText || rule.media.mediaText;
        const re = /(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g; let m;
        while ((m = re.exec(txt))) bump(mq, m[1] + ':' + Math.round(parseFloat(m[2]) * (m[3] === 'px' ? 1 : 16)));
        try { walkRules(rule.cssRules); } catch (e) {}
      } else if (rule.type === 5) {
        fontFaces.push({ family: rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim(), weight: rule.style.getPropertyValue('font-weight') || '400', style: rule.style.getPropertyValue('font-style') || 'normal', host: (() => { const m = /url\(["']?([^"')]+)/.exec(rule.style.getPropertyValue('src')); try { return m ? new URL(m[1], doc.baseURI).host : null; } catch (e) { return null; } })() });
      } else if (rule.cssRules) { try { walkRules(rule.cssRules); } catch (e) {} }
    }
  }
  let blockedSheets = 0;
  for (const s of doc.styleSheets) { try { walkRules(s.cssRules); } catch (e) { blockedSheets++; } }
  try { const rcs = win.getComputedStyle(doc.documentElement); for (const p of rcs) if (p.startsWith('--') && !(p in vars) && Object.keys(vars).length < 400) vars[p] = rcs.getPropertyValue(p).trim().slice(0, 200); } catch (e) {}

  // colour-valued custom properties, normalised like everything else
  const varColors = {};
  for (const [k, v] of Object.entries(vars)) if (/^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(v)) { const c = toHex(v); if (c) varColors[k] = c.hex; }

  const loadedFonts = [];
  try { doc.fonts.forEach((f) => { if (f.status === 'loaded') loadedFonts.push({ family: f.family.replace(/["']/g, ''), weight: f.weight, style: f.style }); }); } catch (e) {}

  // ---- challenge detection (we never try to get past one) ----
  const bodyText = (doc.body ? doc.body.innerText : '').slice(0, 3000);
  const challenge = /just a moment|attention required|verify you are human|verifica di essere umano|checking your browser|are you a robot|captcha|access denied|enable javascript and cookies/i.test(doc.title + ' ' + bodyText.slice(0, 600)) ||
    !!doc.querySelector('iframe[src*="challenges.cloudflare.com"], iframe[src*="hcaptcha.com"], iframe[src*="recaptcha"], #challenge-form, #cf-challenge-running');

  const meta = (n) => doc.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute('content') || null;
  return {
    url: doc.location.href, title: doc.title, lang: doc.documentElement.lang || null,
    description: meta('description') || meta('og:description'), siteName: meta('og:site_name'), themeColor: meta('theme-color'),
    viewport: { w: vw, h: vh }, docHeight: docH, pageArea: vw * docH, totalChars, challenge,
    type: Object.values(type), textColors, bgColors, borderColors, fillColors, pairs, spacing, radii, radiiPx, shadows, gradients, gradientStops, varColors, easings, durations, backdrop,
    containers, grids: grids.slice(0, 60), media, buttons, cards, fields, header, bands, headings: headings.slice(0, 80), paragraphs, links,
    vars, mq, fontFaces: fontFaces.slice(0, 60), loadedFonts: loadedFonts.slice(0, 60), blockedSheets,
    bodyBg: toHex(win.getComputedStyle(doc.body).backgroundColor)?.hex || toHex(win.getComputedStyle(doc.documentElement).backgroundColor)?.hex || '#ffffff',
    scroll: { x: sx, y: sy },
  };
}

export const extractorSource = extractPage.toString();
