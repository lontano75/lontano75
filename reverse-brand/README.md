# reverse-brand

`reverse-brand <url>` turns a public brand website into an **unofficial**, art-directed brand guide. Each value in the guide is measured from computed styles, exported as tokens and then rebuilt from those tokens, which shows the tokens work.

Every output is marked "Unofficial analysis" and carries: *Not affiliated with or endorsed by the brand. Trademarks belong to their owners.* Logos, font files and the brand's images are never copied. A logo becomes a dashed placeholder at its measured size and colour.

## Run

```sh
node bin/reverse-brand.js https://example.com            # capture → analyse → tokens → guide → slides → video → verify
node bin/reverse-brand.js https://example.com --headed   # visible browser, for sites that show a bot check
node bin/reverse-brand.js https://example.com --snapshot snapshot.json   # analyse a snapshot from the DevTools snippet
node bin/reverse-brand.js https://example.com --images manual            # print image prompts
node bin/reverse-brand.js https://example.com --images manual --import   # use images/<slot>.png you generated
node bin/reverse-brand.js https://example.com --images api --provider fal|openai|gemini|replicate
node src/verify.js out/<host>                                            # re-run the checks
```

Requires Node 20+, Playwright (project or global install) with Chrome or Chromium, and ffmpeg (libx264, libwebp). Chrome is launched with `--disable-gpu`.

### Bot checks

reverse-brand never tries to get past a bot check or CAPTCHA. If the headless capture gets one, it stops (exit code 3) and offers two options:

1. `--headed`: a visible browser opens and you complete the check yourself.
2. `out/<host>/devtools-snippet.js`: paste it into the DevTools console on the brand's tab. It runs the same extractor in same-origin iframes at 1440px and 390px and downloads `snapshot.json`. Then run with `--snapshot`.

If the host can't be reached at all (exit code 2), the same snippet route works from any browser that can open the site.

### Images

- `none` (default): every image slot uses a CSS gradient built from the colour tokens.
- `manual`: generate the images from `prompts.json` in any tool, save them as `images/<slot>.png`, then run `--import`. Use `--image-source procedural` for non-AI test images, so the labels stay truthful.
- `api`: reads the key from `.env` (`FAL_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`) and never logs it. Job ids are written to `images/jobs.json` before polling, downloads stream to disk, and each image's list price is logged. None of these providers exposes a balance endpoint the tool can read, so the log tells you to check the provider dashboard.

Prompts are text only and describe new subjects in the site's measured photographic style; the brand's photos are never an input. Images are re-encoded to WebP (2000px wide slots, 1400px others) and labelled "AI-generated image" wherever they appear.

## Output: `out/<host>/`

| File | What it is |
|---|---|
| `brand-guide.html` | light edition, no images, ≤150 KB, works offline |
| `brand-guide-hero.html` | same guide; each image embedded once as WebP and reused through CSS classes |
| `tokens.css`, `tokens.json` | CSS custom properties and W3C design-tokens JSON (OKLCH next to hex) |
| `snapshot.json`, `analysis.json` | raw capture and the measured model |
| `prompts.json`, `images/` | image prompts, manifest, WebP files |
| `slides/` | Instagram carousel 8 × 1080×1350, X images 4 × 1600×900 |
| `video/<host>-presentation-1920x1080-60fps.mp4` | 11 scenes, ~45 s, real 60 fps; `--stills` writes one frame per scene |
| `screenshots/` | every guide section at 1440px and 390px, from verify |
| `run-log.md`, `verify.json` | timing, pages, sizes, costs, assumptions, check results |

## How it works

| Phase | File |
|---|---|
| Capture: home + 3–5 links scored by nav position and keywords (legal, login, help and locale duplicates skipped; one page per top-level path), 1440×900 plus 390×844 for the home page, scrolled for lazy content, consent UI excluded | `src/capture.js`, `src/extractor.js` |
| Analyse: chrome counted once, type clusters within 12% → roles + `clamp()`, colour roles weighted by characters/area, spacing base, components, imagery, voice stats and rules | `src/analyse.js` |
| Tokens | `src/tokens.js` |
| Guide (art direction read from tokens only) | `src/guide.js`, `src/art.js` |
| Slides, video (Web Animations seeked to i/fps, frames piped to ffmpeg: libx264 CRF 14, yuv420p, TV range, BT.709, faststart) | `src/slides.js`, `src/video.js` |
| Verify + screenshots | `src/verify.js`, `src/shoot.js` |

`fixtures/demo/` is a fictional test site ("Lumen Fixture") used to test the pipeline: `node src/serve.js fixtures/demo 4321`.
