// Client-side config diff (R16): recurses into objects; arrays and strings are compared as a
// whole. Multi-line strings are flagged so the UI can open a text diff.

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

function leafDiffPaths(
  path: string,
  a: unknown,
  b: unknown,
  hasA: boolean,
  hasB: boolean,
  out: string[],
): void {
  let objA = isPlainObject(a) ? a : null;
  let objB = isPlainObject(b) ? b : null;
  if (objA && !hasB) objB = {};
  else if (objB && !hasA) objA = {};
  if (objA && objB) {
    const keys = Array.from(
      new Set([...Object.keys(objA), ...Object.keys(objB)]),
    ).sort();
    for (const k of keys) {
      leafDiffPaths(
        `${path}/${escapeToken(k)}`,
        objA[k],
        objB[k],
        Object.prototype.hasOwnProperty.call(objA, k),
        Object.prototype.hasOwnProperty.call(objB, k),
        out,
      );
    }
    return;
  }
  if (hasA !== hasB || !deepEqual(a, b)) out.push(path);
}

/** RFC 6901 pointers of every leaf that differs between two overlays (arrays are leaves). */
export function changedLeafPaths(a: unknown, b: unknown): string[] {
  const out: string[] = [];
  leafDiffPaths('', a, b, true, true, out);
  return out;
}
