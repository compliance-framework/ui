import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost), so
// direct calls break plain-HTTP deployments. V2 code must use `uuid()` from
// `@/utils/uuid`, which falls back outside secure contexts (backlog M0-03).
// This spec stands in for a lint rule, because eslint.config.js is main-owned.
const root = join(__dirname, '..', '..');
const V2_DIRS = [
  'components/v2',
  'views/controls-v2',
  'views/dashboards-v2',
  'views/auth-v2',
  'views/system-v2',
  'views/system-security-plans-v2',
  'views/layouts',
  'router',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.(ts|vue)$/.test(entry) ? [path] : [];
  });
}

describe('V2 code', () => {
  it('never calls crypto.randomUUID directly', () => {
    const offenders = V2_DIRS.flatMap((dir) => sourceFiles(join(root, dir)))
      .filter((file) =>
        readFileSync(file, 'utf8').includes('crypto.randomUUID'),
      )
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });
});
