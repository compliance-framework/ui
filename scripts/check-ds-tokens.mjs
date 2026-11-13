// Fails when design-system code reads a custom property that is neither a --ds- token nor one of
// the component-local or library properties below. A copied component that still uses the
// mockup's unprefixed token names would otherwise render unstyled without any error.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/ds', 'src/screens'];
const allowed = /^--(ds-|reka-|grid-|stack-|cluster-|tone-|fade-|slide-|progress-|matrix-)/;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(vue|css|ts)$/.test(name) && !path.includes('/tokens/')) check(path);
  }
}

function check(path) {
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      for (const [, name] of line.matchAll(/var\((--[a-z0-9-]+)/g)) {
        if (!allowed.test(name)) problems.push(`${path}:${index + 1} ${name}`);
      }
    });
}

roots.forEach(walk);
if (problems.length) {
  console.error(`Unknown custom properties (use --ds- tokens):\n${problems.join('\n')}`);
  process.exit(1);
}
