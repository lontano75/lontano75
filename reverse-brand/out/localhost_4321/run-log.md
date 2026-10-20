# reverse-brand run log: localhost:4321

_Unofficial analysis. Not affiliated with or endorsed by the brand. Trademarks belong to their owners._

## Timing per phase

| Phase | Time |
|---|---|
| capture | 9.1 s |
| analyse | 0.0 s |
| tokens | 0.0 s |
| images (manual) | 2.6 s |
| guide | 0.0 s |
| slides | 2.1 s |
| video | 305.8 s |
| verify | 12.5 s |

## Pages and elements

Method: playwright-headless. Captured 2026-10-20T22:50:00.948Z.

| Page | Viewport | Doc height | Text styles | Characters | Buttons | Cards | Media |
|---|---|---|---|---|---|---|---|
| http://localhost:4321/ | 1440×900 | 3083px | 12 | 811 | 5 | 6 | 8 |
| http://localhost:4321/prezzi/ | 1440×900 | 1079px | 7 | 330 | 3 | 3 | 4 |
| http://localhost:4321/prodotti/ | 1440×900 | 1824px | 9 | 359 | 2 | 3 | 5 |
| http://localhost:4321/business/ | 1440×900 | 1313px | 8 | 349 | 2 | 3 | 4 |
| http://localhost:4321/azienda/ | 1440×900 | 1214px | 5 | 180 | 1 | 0 | 2 |
| http://localhost:4321/ | 390×844 | 4300px | 11 | 778 | 5 | 0 | 8 |

Link scores (top 10):

- 13 · http://localhost:4321/prezzi/ (nav)
- 12 · http://localhost:4321/prodotti/ (nav)
- 12 · http://localhost:4321/business/ (nav)
- 11 · http://localhost:4321/azienda/ (nav)
- 7 · http://localhost:4321/blog/ (nav)

## Output sizes

| File | Size |
|---|---|
| brand-guide.html | 93.9 KB |
| brand-guide-hero.html | 235.2 KB |
| tokens.css | 4.8 KB |
| tokens.json | 16.1 KB |
| snapshot.json | 52.1 KB |
| prompts.json | 4.4 KB |
| video/localhost_4321-presentation-1920x1080-60fps.mp4 | 12682.2 KB |

## Images

Mode: manual.

Image cost: $0.00 (no paid generation in this run).

## LLM token usage

The CLI makes no LLM calls; analysis and copy are rule-based. Token usage of the agent session that wrote and ran the tool is not visible to the tool.

## Assumptions

- Viewports: 1440×900 for all pages, 390×844 for the home page.
- Pages: /, /prezzi/, /prodotti/, /business/, /azienda/ (home plus the highest-scoring same-origin links, one per top-level path).

## Verification

- PASS · tokens.json parses
- PASS · brand-guide.html size ≤ 150 KB — 93.9 KB
- PASS · brand-guide.html: zero network requests offline
- PASS · brand-guide.html: no script errors
- PASS · brand-guide.html: required sections
- PASS · brand-guide.html: standard section titles
- PASS · brand-guide.html: Unofficial label on cover, top bar and footer + disclaimer — {"cover":true,"top":true,"footer":true,"disclaimer":true}
- PASS · brand-guide.html: embedded token JSON parses
- PASS · brand-guide.html: five quotes and three rules — 5 quotes, 3 rules
- PASS · brand-guide.html: rebuild button computed style = tokens — height 53px, padding-left 28px, border-radius 999px, background rgb(21, 112, 209), color rgb(255, 255, 255), font-size 16px, font-weight 600
- PASS · brand-guide.html: rebuild card computed style = tokens — background rgb(255, 255, 255), border-radius 20px, box-shadow rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.06) 0px 8px 24px 0px, padding 24px
- PASS · brand-guide.html: every image carries its label — 0 of 26 slots have images; 0 unlabeled, 0 labels without image
- PASS · brand-guide.html: no horizontal scroll at 390px — scrollWidth 390 / 390
- PASS · brand-guide-hero.html size ≤ 4 MB — 235.2 KB
- PASS · brand-guide-hero.html: zero network requests offline
- PASS · brand-guide-hero.html: no script errors
- PASS · brand-guide-hero.html: required sections
- PASS · brand-guide-hero.html: standard section titles
- PASS · brand-guide-hero.html: Unofficial label on cover, top bar and footer + disclaimer — {"cover":true,"top":true,"footer":true,"disclaimer":true}
- PASS · brand-guide-hero.html: embedded token JSON parses
- PASS · brand-guide-hero.html: five quotes and three rules — 5 quotes, 3 rules
- PASS · brand-guide-hero.html: rebuild button computed style = tokens — height 53px, padding-left 28px, border-radius 999px, background rgb(21, 112, 209), color rgb(255, 255, 255), font-size 16px, font-weight 600
- PASS · brand-guide-hero.html: rebuild card computed style = tokens — background rgb(255, 255, 255), border-radius 20px, box-shadow rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.06) 0px 8px 24px 0px, padding 24px
- PASS · brand-guide-hero.html: every image carries its label — 26 of 26 slots have images; 0 unlabeled, 0 labels without image
- PASS · brand-guide-hero.html: no horizontal scroll at 390px — scrollWidth 390 / 390
- PASS · 8 Instagram slides and 4 X images — 12 files
- PASS · video file exists — localhost_4321-presentation-1920x1080-60fps.mp4
