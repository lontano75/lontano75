// Phase 5 (optional): image prompts, provider adapters, manual import and WebP re-encoding.
// Images are generated from text prompts only; the brand's own photos are never an input.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { toOklch } from './color.js';

export const SUFFIX = 'photorealistic, no text, letters, logos, brand marks, cards or app screens';

function hueName(hex) {
  const { l, c, h } = toOklch(hex);
  if (c < 0.03) return l > 0.85 ? 'off-white' : l < 0.25 ? 'near-black' : 'neutral grey';
  const names = [[20, 'red'], [50, 'orange'], [85, 'amber'], [110, 'yellow'], [150, 'green'], [190, 'teal'], [230, 'cyan-blue'], [265, 'blue'], [300, 'violet'], [340, 'magenta'], [361, 'red']];
  const n = names.find(([deg]) => h < deg)[1];
  return (l < 0.35 ? 'deep ' : l > 0.8 ? 'pale ' : '') + n;
}

// Describe the site's photography in words (look, don't copy), then write new subjects in that style.
export function buildPrompts(m) {
  const I = m.imagery; const c = m.colour.roles;
  const ratio = I.ratios[0]?.key || '16:9';
  const look = [
    I.fullBleedShare > 0.2 ? 'wide full-bleed editorial framing' : 'contained editorial framing',
    `${ratio} crops`,
    `colour grade leaning to ${hueName(c['surface-inverse'].hex)} shadows with ${hueName(c.action.hex)} and ${hueName(c.accent.hex)} highlights`,
    I.fit[0]?.key?.includes('cover') ? 'subject centred with room to crop' : 'whole subject in frame',
  ].join(', ');
  const themes = I.altThemes.slice(0, 6).map((a) => a.word).join(', ');
  const slots = [
    ['hero', '16:9', 2000, 'Cover. A wide calm landscape at first light seen from a high vantage point, a thin line of a modern city on the horizon'],
    ['horizon', '16:9', 2000, 'Typography chapter. A long flat horizon over still water at dusk, large empty sky for a text card'],
    ['object', '4:5', 1400, 'Colour chapter. A studio render of a single smooth sculptural object made of matte ceramic and brushed metal on a seamless backdrop'],
    ['street', '4:5', 1400, 'Voice chapter. A person walking through a sunlit pedestrian street, shot from behind at a distance, natural candid moment'],
    ['sky', '16:9', 2000, 'Clean background. Soft gradient sky with a few thin high clouds, nothing else in frame'],
    ['glass', '4:5', 1400, 'Components chapter. Ordered rows of translucent glass blocks of equal size on a table, soft daylight, precise spacing'],
    ['grid', '16:9', 2000, 'Layout chapter. Top-down view of a tiled courtyard with a regular grid of stone slabs and one tree'],
    ['tokens', '16:9', 2000, 'Design tokens chapter. Macro photograph of neatly arranged small coloured glass samples in a wooden tray'],
    ['detail', '1:1', 1400, `Imagery chapter. A close detail that fits the site's recurring subjects (${themes || 'technology and everyday life'}), shallow depth of field`],
  ];
  return {
    note: 'Unofficial analysis. New subjects in the measured photographic style; never derived from the brand\'s images.',
    style: look, themes, suffix: SUFFIX,
    slots: slots.map(([slot, aspectRatio, width, subject]) => ({ slot, aspectRatio, width, prompt: `${subject}. ${look}. ${SUFFIX}` })),
  };
}

// ---- .env and providers ----
export function readEnv(dir) {
  const out = {};
  for (const f of [path.join(dir, '.env'), path.join(process.cwd(), '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}

async function streamTo(url, file, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const ws = fs.createWriteStream(file);
  for await (const chunk of res.body) ws.write(chunk);
  await new Promise((r) => ws.end(r));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every provider exposes generate({prompt, aspectRatio, resolution}) -> writes bytes to `file`.
// Job ids are written to jobs.json before polling, so a crash never loses a paid image.
export function provider(name, env, jobsFile) {
  const jobs = fs.existsSync(jobsFile) ? JSON.parse(fs.readFileSync(jobsFile, 'utf8')) : {};
  const save = () => fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
  const key = (k) => { if (!env[k]) throw new Error(`${k} is missing from .env`); return env[k]; };
  const P = {
    fal: {
      price: +(env.FAL_PRICE_PER_IMAGE || 0.04), model: env.FAL_MODEL || 'fal-ai/nano-banana',
      async balance() { return null; }, // fal exposes no stable public balance endpoint; checked in the dashboard
      async generate({ prompt, aspectRatio, slot }, file) {
        const auth = { Authorization: `Key ${key('FAL_KEY')}`, 'content-type': 'application/json' };
        let job = jobs[slot];
        if (!job) {
          const r = await fetch(`https://queue.fal.run/${this.model}`, { method: 'POST', headers: auth, body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, num_images: 1, output_format: 'png' }) });
          if (!r.ok) throw new Error(`fal submit ${r.status}`);
          const j = await r.json(); job = jobs[slot] = { id: j.request_id, status_url: j.status_url, response_url: j.response_url, provider: 'fal' }; save();
        }
        for (;;) { const s = await (await fetch(job.status_url, { headers: auth })).json(); if (s.status === 'COMPLETED') break; if (s.status === 'FAILED') throw new Error('fal job failed'); await sleep(2500); }
        const out = await (await fetch(job.response_url, { headers: auth })).json();
        await streamTo(out.images[0].url, file);
      },
    },
    openai: {
      price: +(env.OPENAI_PRICE_PER_IMAGE || 0.17), model: env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      async balance() { return null; },
      async generate({ prompt, aspectRatio, slot }, file) {
        const size = aspectRatio === '1:1' ? '1024x1024' : aspectRatio.startsWith('16') ? '1536x1024' : '1024x1536';
        jobs[slot] = { provider: 'openai', submittedAt: new Date().toISOString(), note: 'synchronous API: no job id' }; save();
        const r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key('OPENAI_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: this.model, prompt, size, quality: 'high', n: 1 }) });
        if (!r.ok) throw new Error(`openai ${r.status}`);
        fs.writeFileSync(file, Buffer.from((await r.json()).data[0].b64_json, 'base64'));
      },
    },
    gemini: {
      price: +(env.GEMINI_PRICE_PER_IMAGE || 0.039), model: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
      async balance() { return null; },
      async generate({ prompt, aspectRatio, slot }, file) {
        jobs[slot] = { provider: 'gemini', submittedAt: new Date().toISOString(), note: 'synchronous API: no job id' }; save();
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key('GEMINI_API_KEY'), 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } }) });
        if (!r.ok) throw new Error(`gemini ${r.status}`);
        const part = (await r.json()).candidates[0].content.parts.find((p) => p.inlineData);
        fs.writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
      },
    },
    replicate: {
      price: +(env.REPLICATE_PRICE_PER_IMAGE || 0.04), model: env.REPLICATE_MODEL || 'black-forest-labs/flux-1.1-pro',
      async balance() { return null; },
      async generate({ prompt, aspectRatio, slot }, file) {
        const auth = { Authorization: `Bearer ${key('REPLICATE_API_TOKEN')}`, 'content-type': 'application/json' };
        let job = jobs[slot];
        if (!job) {
          const r = await fetch(`https://api.replicate.com/v1/models/${this.model}/predictions`, { method: 'POST', headers: auth, body: JSON.stringify({ input: { prompt, aspect_ratio: aspectRatio, output_format: 'png' } }) });
          if (!r.ok) throw new Error(`replicate submit ${r.status}`);
          const j = await r.json(); job = jobs[slot] = { id: j.id, get: j.urls.get, provider: 'replicate' }; save();
        }
        let s; do { await sleep(2500); s = await (await fetch(job.get, { headers: auth })).json(); if (s.status === 'failed') throw new Error('replicate failed'); } while (s.status !== 'succeeded');
        await streamTo(Array.isArray(s.output) ? s.output[0] : s.output, file);
      },
    },
  };
  if (!P[name]) throw new Error(`Unknown provider "${name}". Use one of: ${Object.keys(P).join(', ')}`);
  return P[name];
}

export async function generateAll(prompts, imagesDir, providerName, env, log) {
  fs.mkdirSync(imagesDir, { recursive: true });
  const p = provider(providerName, env, path.join(imagesDir, 'jobs.json'));
  const bal = await p.balance();
  log(bal == null ? `balance: not available from the ${providerName} API; check it in the provider dashboard` : `balance: ${bal}`);
  const costs = [];
  for (const s of prompts.slots) {
    const file = path.join(imagesDir, `${s.slot}.png`);
    if (fs.existsSync(file)) { log(`image ${s.slot}: exists, skipped`); continue; }
    const t = Date.now();
    await p.generate({ ...s, resolution: s.width }, file);
    costs.push({ slot: s.slot, provider: providerName, model: p.model, usd: p.price, ms: Date.now() - t });
    log(`image ${s.slot}: ${providerName} ${p.model} ~$${p.price.toFixed(3)} (${Date.now() - t} ms)`);
  }
  return costs;
}

// Manual mode: the user drops images/<slot>.png (or .jpg/.webp) and runs --import.
export function importManual(prompts, imagesDir, { source = 'ai', tool = 'manual' } = {}) {
  const manifest = { generatedAt: new Date().toISOString(), images: [] };
  for (const s of prompts.slots) {
    const f = ['png', 'jpg', 'jpeg', 'webp'].map((e) => path.join(imagesDir, `${s.slot}.${e}`)).find((x) => fs.existsSync(x));
    if (f) manifest.images.push({ slot: s.slot, file: path.basename(f), source, tool, prompt: s.prompt });
  }
  return manifest;
}

export function toWebp(src, dst, width) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale='min(${width},iw)':-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', dst]);
  if (r.status !== 0) throw new Error('ffmpeg webp: ' + r.stderr.toString());
  return fs.statSync(dst).size;
}

// Re-encode every manifest image to WebP: 2000px for wide slots, 1400px for others.
export function encodeAll(manifest, prompts, imagesDir, log) {
  for (const im of manifest.images) {
    const s = prompts.slots.find((x) => x.slot === im.slot);
    const width = s.aspectRatio === '16:9' ? 2000 : 1400;
    const out = path.join(imagesDir, `${im.slot}.webp`);
    const src = path.join(imagesDir, im.file);
    if (path.resolve(src) === path.resolve(out)) { im.webp = im.file; im.bytes = fs.statSync(out).size; continue; }
    im.bytes = toWebp(src, out, width); im.webp = path.basename(out); im.width = width;
    log(`webp ${im.slot}: ${(im.bytes / 1024).toFixed(0)} KB @ ${width}px`);
  }
  return manifest;
}
