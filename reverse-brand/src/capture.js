// Phase 1: capture. Home + 3-5 scored pages at 1440x900, plus the home page at 390x844.
import { loadPlaywright, chromeLaunchOptions } from './pw.js';
import { extractPage } from './extractor.js';

export const SKIP = /(privacy|cookie|terms|termini|condizioni|legal|legale|note-legali|impressum|gdpr|login|log-in|signin|sign-in|signup|sign-up|register|registrati|account|accedi|cart|carrello|checkout|help|support|supporto|assistenza|faq|status|sitemap|feed|rss|wp-admin|wp-login|wp-json|xmlrpc|\/tag\/|\/author\/|\/autore\/|\/page\/\d|\/search|\/cerca|\?s=|mailto:|tel:|\.(pdf|jpe?g|png|gif|webp|zip|xml|mp4)$)/i;
export const KEY = /(product|prodott|pricing|prezz|price|tariff|plans?|piani|business|aziend|enterprise|company|about|chi-siamo|chisiamo|azienda|team|services|servizi|solutions|soluzioni|features|funzionalit|platform|piattaforma|shop|store|categor|rubrich|topics?|temi)/i;
export const LOCALE = /^\/([a-z]{2})(-[a-z]{2})?(\/|$)/i;

export function scoreLinks(links, homeUrl) {
  const home = new URL(homeUrl);
  const homeLocale = (home.pathname.match(LOCALE) || [])[1];
  const best = new Map(); // top-level path -> {url, score}
  for (const l of links) {
    let u; try { u = new URL(l.href, homeUrl); } catch { continue; }
    if (u.host.replace(/^www\./, '') !== home.host.replace(/^www\./, '')) continue;
    u.hash = ''; u.search = '';
    const p = u.pathname.replace(/\/+$/, '') || '/';
    if (p === '/' || p === home.pathname.replace(/\/+$/, '')) continue;
    if (SKIP.test(p) || SKIP.test(l.text || '')) continue;
    const loc = (p.match(LOCALE) || [])[1];
    if (loc && loc !== homeLocale && /^(en|it|fr|de|es|pt|nl|ja|zh|ko|ru|pl|sv|da|fi|no|tr)$/i.test(loc)) continue;
    const segs = p.split('/').filter(Boolean);
    const top = (loc ? segs.slice(0, 2) : segs.slice(0, 1)).join('/');
    let score = 0;
    if (l.inNav) score += 5;
    if (KEY.test(p) || KEY.test(l.text || '')) score += 4;
    if (l.inFooter && !l.inNav) score -= 1;
    score += Math.max(0, 3 - segs.length);
    if ((l.text || '').length > 60) score -= 2; // long titles are usually articles
    if (/\d{4}\/\d{2}/.test(p) || segs[segs.length - 1]?.split('-').length > 6) score -= 3;
    const prev = best.get(top);
    const cand = { url: u.href, score: (prev ? Math.max(prev.score, score) : score) + (prev ? 1 : 0), text: l.text, inNav: l.inNav };
    if (!prev || score > prev.ownScore) best.set(top, { ...cand, ownScore: score });
    else prev.score = cand.score;
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // scroll to trigger lazy content, then back to the top
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight && y < 40000; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 160)); }
    scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300));
  });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
}

export class ChallengeError extends Error {
  constructor(url) { super('Bot check or CAPTCHA detected at ' + url); this.url = url; }
}

export async function capture(url, { headed = false, maxPages = 5, log = () => {} } = {}) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(chromeLaunchOptions({ headed }));
  const t0 = Date.now();
  const out = { tool: 'reverse-brand', capturedAt: new Date().toISOString(), source: url, method: headed ? 'playwright-headed' : 'playwright-headless', pages: [], mobile: null, picks: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'it-IT' });
    const page = await ctx.newPage();
    const visit = async (u) => {
      const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settle(page);
      let data = await page.evaluate(extractPage);
      if (data.challenge && headed) {
        log('Challenge shown. Complete it in the browser window; waiting up to 3 minutes.');
        const until = Date.now() + 180000;
        while (Date.now() < until && data.challenge) { await page.waitForTimeout(3000); data = await page.evaluate(extractPage).catch(() => data); }
        if (!data.challenge) { await settle(page); data = await page.evaluate(extractPage); }
      }
      if (data.challenge) throw new ChallengeError(u);
      data.status = resp ? resp.status() : null;
      return data;
    };
    log('home ' + url);
    const home = await visit(url);
    out.pages.push(home);
    const ranked = scoreLinks(home.links, home.url);
    out.linkScores = ranked.slice(0, 15).map(({ url, score, text, inNav }) => ({ url, score, text, inNav }));
    const picks = ranked.slice(0, Math.max(3, Math.min(maxPages - 1, 4)));
    for (const p of picks) {
      try { log('page ' + p.url); out.pages.push(await visit(p.url)); out.picks.push(p.url); }
      catch (e) { if (e instanceof ChallengeError) throw e; log('skip ' + p.url + ': ' + e.message); }
    }
    // responsive pass of the home page
    await page.setViewportSize({ width: 390, height: 844 });
    log('mobile 390 ' + url);
    out.mobile = await visit(url);
    await ctx.close();
  } finally {
    await browser.close();
  }
  out.captureMs = Date.now() - t0;
  return out;
}
