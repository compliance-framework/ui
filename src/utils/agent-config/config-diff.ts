// Client-side config diff (R16): recurses into objects; arrays and strings are compared as a
// whole. Multi-line strings (Rego modules) are flagged so the UI can open a text diff.

import { deepEqual, isPlainObject } from './merge-patch';
import { escapeToken } from './json-pointer';

export interface DiffEntry {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
  multiline?: boolean;
}

function isMultiline(v: unknown): boolean {
  return typeof v === 'string' && v.includes('\n');
}

function walk(
  path: string,
  before: unknown,
  after: unknown,
  out: DiffEntry[],
): void {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)]),
    ).sort();
    for (const key of keys) {
      const p = `${path}/${escapeToken(key)}`;
      const hasB = Object.prototype.hasOwnProperty.call(before, key);
      const hasA = Object.prototype.hasOwnProperty.call(after, key);
      if (hasB && !hasA) {
        out.push(entry(p, 'removed', before[key], undefined));
      } else if (!hasB && hasA) {
        out.push(entry(p, 'added', undefined, after[key]));
      } else {
        walk(p, before[key], after[key], out);
      }
    }
    return;
  }
  if (!deepEqual(before, after)) {
    out.push(entry(path, 'changed', before, after));
  }
}

function entry(
  path: string,
  kind: DiffEntry['kind'],
  before: unknown,
  after: unknown,
): DiffEntry {
  const e: DiffEntry = { path, kind };
  if (kind !== 'added') e.before = before;
  if (kind !== 'removed') e.after = after;
  if (isMultiline(before) || isMultiline(after)) e.multiline = true;
  return e;
}

export function diffConfigs(before: unknown, after: unknown): DiffEntry[] {
  const out: DiffEntry[] = [];
  walk('', before ?? {}, after ?? {}, out);
  return out;
}
