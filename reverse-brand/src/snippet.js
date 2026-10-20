// Fallback (b) for sites that show a bot check: a snippet the user pastes into DevTools
// on the brand's own tab, after passing the check themselves. It loads the chosen pages in
// same-origin iframes at 1440px and 390px, runs the same extractor and downloads snapshot.json.
import { extractorSource } from './extractor.js';
import { scoreLinks, SKIP, KEY, LOCALE } from './capture.js';

export function devtoolsSnippet() {
  return `// reverse-brand DevTools snippet. Paste into the Console on the brand's home page.
// It reads computed styles only; nothing is sent anywhere. Output: snapshot.json download.
(async () => {
  const extractPage = ${extractorSource};
  const SKIP = ${SKIP};
  const KEY = ${KEY};
  const LOCALE = ${LOCALE};
  const scoreLinks = ${scoreLinks.toString()};
  const load = (url, w, h) => new Promise((res, rej) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;width:' + w + 'px;height:' + h + 'px';
    f.onload = async () => {
      try {
        const win = f.contentWindow; const step = Math.round(h * 0.8);
        for (let y = 0; y < win.document.documentElement.scrollHeight && y < 40000; y += step) { win.scrollTo(0, y); await new Promise((r) => setTimeout(r, 160)); }
        win.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1200));
        await win.document.fonts.ready;
        const data = extractPage({ win }); f.remove(); res(data);
      } catch (e) { f.remove(); rej(e); }
    };
    f.src = url; document.body.appendChild(f);
  });
  const home = location.origin + location.pathname;
  console.log('[reverse-brand] home 1440');
  const h = await load(home, 1440, 900);
  const picks = scoreLinks(h.links, h.url).slice(0, 4);
  const pages = [h];
  for (const p of picks) { console.log('[reverse-brand] ' + p.url); try { pages.push(await load(p.url, 1440, 900)); } catch (e) { console.warn('skip', p.url, e); } }
  console.log('[reverse-brand] home 390');
  const mobile = await load(home, 390, 844);
  const snap = { tool: 'reverse-brand', capturedAt: new Date().toISOString(), source: home, method: 'devtools-snippet', pages, mobile, picks: picks.map((p) => p.url) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snap)], { type: 'application/json' }));
  a.download = 'snapshot.json'; a.click();
  console.log('[reverse-brand] snapshot.json downloaded. Run: reverse-brand ' + home + ' --snapshot snapshot.json');
})();
`;
}
