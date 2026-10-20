// Phase 9: run-log.md
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

export function runLogMd({ model: m, snap, phases, sizes, costs = [], imagesMode, provider, notes = [], verify }) {
  const lines = [];
  lines.push(`# reverse-brand run log: ${m ? m.host : snap?.source || ''}`, '', '_Unofficial analysis. Not affiliated with or endorsed by the brand. Trademarks belong to their owners._', '');
  lines.push('## Timing per phase', '', '| Phase | Time |', '|---|---|', ...phases.map((p) => `| ${p.phase} | ${p.ms != null ? (p.ms / 1000).toFixed(1) + ' s' : '—'}${p.status ? ' (' + p.status + ')' : ''} |`), '');
  if (snap?.pages?.length) {
    lines.push('## Pages and elements', '', `Method: ${snap.method}. Captured ${snap.capturedAt}.`, '', '| Page | Viewport | Doc height | Text styles | Characters | Buttons | Cards | Media |', '|---|---|---|---|---|---|---|---|');
    for (const p of [...snap.pages, ...(snap.mobile ? [snap.mobile] : [])]) lines.push(`| ${p.url} | ${p.viewport.w}×${p.viewport.h} | ${p.docHeight}px | ${p.type.length} | ${p.totalChars} | ${p.buttons.length} | ${p.cards.length} | ${p.media.count} |`);
    if (snap.linkScores) lines.push('', 'Link scores (top 10):', '', ...snap.linkScores.slice(0, 10).map((l) => `- ${l.score} · ${l.url}${l.inNav ? ' (nav)' : ''}`));
    lines.push('');
  }
  if (sizes && Object.keys(sizes).length) lines.push('## Output sizes', '', '| File | Size |', '|---|---|', ...Object.entries(sizes).map(([f, n]) => `| ${f} | ${kb(n)} |`), '');
  lines.push('## Images', '', `Mode: ${imagesMode}${provider ? ` (provider: ${provider})` : ''}.`, '');
  if (costs.length) {
    lines.push('| Slot | Provider | Model | Cost (list price, USD) | Time |', '|---|---|---|---|---|', ...costs.map((c) => `| ${c.slot} | ${c.provider} | ${c.model} | ${c.usd.toFixed(3)} | ${(c.ms / 1000).toFixed(1)} s |`));
    lines.push('', `Total: $${costs.reduce((a, c) => a + c.usd, 0).toFixed(3)} (list prices; check the provider's invoice).`, '');
  } else lines.push('Image cost: $0.00 (no paid generation in this run).', '');
  lines.push('## LLM token usage', '', 'The CLI makes no LLM calls; analysis and copy are rule-based. Token usage of the agent session that wrote and ran the tool is not visible to the tool.', '');
  if (m) lines.push('## Assumptions', '', ...m.assumptions.map((a) => `- ${a}`), '');
  if (notes.length) lines.push('## Notes', '', ...notes.map((n) => `- ${n}`), '');
  if (verify) lines.push('## Verification', '', ...verify.map((v) => `- ${v.ok ? 'PASS' : 'FAIL'} · ${v.name}${v.detail ? ` — ${v.detail}` : ''}`), '');
  return lines.join('\n');
}
