// Fails when a foreground/background colour-token pair the UI uses misses WCAG 2.2 AA, in the
// light theme, the dark theme and the navigation's colour scope (.ds-scope-nav). Values are read
// from src/ds/tokens/color.css, so the check tests what ships. Ported from the mockup's
// scripts/checks/contrast.ts.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/ds/tokens/color.css', 'utf8');

function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`color.css has no ${selector} block`);
  return css.slice(start, css.indexOf('\n}', start));
}
const values = (body) =>
  Object.fromEntries(
    [...body.matchAll(/--ds-color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map(
      (m) => [m[1], m[2]],
    ),
  );
// Alias roles (`--ds-color-a: var(--ds-color-b)`) resolve to their target.
const aliases = (body) => [
  ...body.matchAll(/--ds-color-([a-z0-9-]+):\s*var\(\s*--ds-color-([a-z0-9-]+)\s*\)/g),
];
const resolve = (tokens, list) => ({
  ...tokens,
  ...Object.fromEntries(list.map((m) => [m[1], tokens[m[2]]])),
});

const rootAliases = aliases(css.slice(0, css.indexOf('\n.ds-scope-nav {')));
const light = resolve(values(block(':root')), rootAliases);
const dark = resolve({ ...light, ...values(block(':root.dark')) }, rootAliases);
const nav = (theme) => resolve(theme, aliases(block('.ds-scope-nav')));

const surfaces = [
  'surface-base',
  'surface-raised',
  'surface-sunken',
  'surface-overlay',
  'surface-hover',
  'surface-selected',
];
const tones = ['success', 'warning', 'error', 'info'];
/** [foreground, backgrounds, minimum ratio] */
const core = [
  ['text-primary', surfaces, 4.5],
  ['text-secondary', surfaces, 4.5],
  ['text-accent', ['surface-base', 'surface-raised', 'surface-sunken'], 4.5],
  ['border-strong', ['surface-base', 'surface-raised', 'surface-sunken', 'surface-overlay'], 3],
  ['border-focus', ['surface-base', 'surface-raised', 'surface-sunken', 'surface-hover', 'surface-selected'], 3],
  ['indicator', ['surface-selected', 'surface-raised', 'surface-base'], 3],
];
const pairs = [
  ...core,
  ['text-inverse', ['text-primary'], 4.5],
  ['action-primary-fg', ['action-primary-bg', 'action-primary-bg-hover'], 4.5],
  ['action-primary-border', ['surface-base', 'surface-raised', 'surface-overlay'], 3],
  ['text-primary', ['action-secondary-bg', 'action-secondary-bg-hover'], 4.5],
  ['action-danger-fg', ['action-danger-bg', 'surface-raised', 'surface-overlay'], 4.5],
  ...tones.map((t) => [`status-${t}-fg`, [`status-${t}-bg`, 'surface-base', 'surface-raised', 'surface-overlay'], 4.5]),
  ['status-neutral-fg', ['status-neutral-bg'], 4.5],
  // Body text and focus rings sit on message tints (InlineMessage).
  ...tones.map((t) => ['text-primary', [`status-${t}-bg`], 4.5]),
  ...tones.map((t) => ['border-focus', [`status-${t}-bg`], 3]),
  ['risk-low-fg', ['risk-low-bg', 'surface-raised'], 4.5],
  ['risk-high-fg', ['risk-high-bg', 'surface-raised'], 4.5],
  ...['chart-1', 'chart-2', 'chart-3'].map((s) => [s, ['surface-raised', 'surface-base'], 3]),
];

function luminance(hex) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const checks = [
  ['light', light, pairs],
  ['dark', dark, pairs],
  ['nav (light)', nav(light), core],
  ['nav (dark)', nav(dark), core],
];
const failures = [];
let total = 0;
for (const [theme, tokens, list] of checks) {
  for (const [fg, bgs, min] of list) {
    for (const bg of bgs) {
      total++;
      if (!tokens[fg] || !tokens[bg]) {
        failures.push(`${theme}: missing token ${tokens[fg] ? bg : fg}`);
        continue;
      }
      const r = ratio(tokens[fg], tokens[bg]);
      if (r < min)
        failures.push(`${theme}: ${fg} on ${bg} = ${r.toFixed(2)}:1 (needs ${min}:1)`);
    }
  }
}
if (failures.length) {
  console.error(`${failures.length} of ${total} colour pairs fail AA:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`All ${total} colour pairs meet AA (light, dark and the nav scope)`);
