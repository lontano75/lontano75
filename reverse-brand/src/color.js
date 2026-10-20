// Colour maths: hex <-> sRGB, OKLab/OKLCH, WCAG contrast.
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function toOklab(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function toOklch(hex) {
  const [L, a, b] = toOklab(hex);
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI; if (H < 0) H += 360;
  return { l: L, c: C, h: C < 0.002 ? 0 : H };
}
export function oklchString(hex) {
  const { l, c, h } = toOklch(hex);
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export const isDark = (hex) => toOklch(hex).l < 0.55;
export const chroma = (hex) => toOklch(hex).c;
export function hueDist(a, b) { const d = Math.abs(toOklch(a).h - toOklch(b).h) % 360; return d > 180 ? 360 - d : d; }
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round((v + (B[i] - v) * t) * 255).toString(16).padStart(2, '0')).join('');
}
export function rgba(hex, a) { const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255)); return `rgba(${r}, ${g}, ${b}, ${a})`; }
